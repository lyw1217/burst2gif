export type PlaybackMode = 'forward' | 'ping-pong';

export interface PlaybackConfig {
  fps: number;
  playbackMode: PlaybackMode;
  frameSkip: number; // 1 = 모든 프레임, 2 = 2장마다 1장, 3 = 3장마다 1장...
  trimRange: [number, number]; // [startIndex, endIndex]
  firstFramePauseMs: number; // 첫 프레임 정지 시간 (ms, 0 = 기본 딜레이)
  lastFramePauseMs: number; // 마지막/반환점 프레임 정지 시간 (ms, 0 = 기본 딜레이)
  loop: number; // 0 = 무한 반복, 1 = 1회, 2 = 2회...
}

export interface PlannedFrame {
  sourceIndex: number;
  delayMs: number;
  isFirst: boolean;
  isTurnaround?: boolean;
  isLast: boolean;
}

export interface PlaybackPlan {
  frames: PlannedFrame[];
  totalDurationMs: number;
  uniqueSourceIndices: number[];
  encodedFrameCount: number;
  loop: number;
  config: PlaybackConfig;
}

export const DEFAULT_PLAYBACK_CONFIG: PlaybackConfig = {
  fps: 12,
  playbackMode: 'forward',
  frameSkip: 1,
  trimRange: [0, 0],
  firstFramePauseMs: 0,
  lastFramePauseMs: 0,
  loop: 0,
};

/**
 * 주어진 파일 개수와 설정에 따라 일관된 PlaybackPlan을 생성합니다.
 * PreviewPlayer와 Worker가 100% 동일한 시퀀스와 딜레이를 참조합니다.
 */
export function generatePlaybackPlan(
  totalFileCount: number,
  config: Partial<PlaybackConfig> = {}
): PlaybackPlan {
  const mergedConfig: PlaybackConfig = {
    ...DEFAULT_PLAYBACK_CONFIG,
    ...config,
    trimRange: config.trimRange ? [...config.trimRange] : [0, Math.max(0, totalFileCount - 1)],
  };

  if (totalFileCount <= 0) {
    return {
      frames: [],
      totalDurationMs: 0,
      uniqueSourceIndices: [],
      encodedFrameCount: 0,
      loop: mergedConfig.loop,
      config: mergedConfig,
    };
  }

  // 1. 유효한 Trim 구간 보정
  let [start, end] = mergedConfig.trimRange;
  start = Math.max(0, Math.min(totalFileCount - 1, Math.floor(start)));
  end = Math.max(0, Math.min(totalFileCount - 1, Math.floor(end)));
  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }
  mergedConfig.trimRange = [start, end];

  // 2. 프레임 건너뛰기(Sampling) 및 원본 재생시간 보존 딜레이 계산
  const fps = Math.max(0.1, mergedConfig.fps || 12);
  const baseDelayMs = Math.max(16, Math.round(1000 / fps));
  const step = Math.max(1, Math.floor(mergedConfig.frameSkip || 1));

  const sampledIndices: number[] = [];
  for (let i = start; i <= end; i += step) {
    sampledIndices.push(i);
  }
  if (sampledIndices.length === 0) {
    sampledIndices.push(start);
  }

  // 3. 시퀀스 구성 (순방향 vs 왕복)
  let plannedSequence: { sourceIndex: number; isFirst: boolean; isTurnaround?: boolean; isLast: boolean }[] = [];

  if (mergedConfig.playbackMode === 'ping-pong' && sampledIndices.length > 2) {
    // 순방향: 0 ... N-1
    // 역방향: N-2 ... 1 (양 끝 중복 제외)
    // 1 사이클: [0, 1, 2, ..., N-1, N-2, ..., 1]
    const m = sampledIndices.length;
    for (let i = 0; i < m; i++) {
      plannedSequence.push({
        sourceIndex: sampledIndices[i],
        isFirst: i === 0,
        isTurnaround: i === m - 1,
        isLast: false,
      });
    }
    for (let i = m - 2; i >= 1; i--) {
      plannedSequence.push({
        sourceIndex: sampledIndices[i],
        isFirst: false,
        isTurnaround: false,
        isLast: i === 1,
      });
    }
  } else {
    // 일반 순방향 (1, 2, 3...)
    plannedSequence = sampledIndices.map((sourceIndex, i) => ({
      sourceIndex,
      isFirst: i === 0,
      isLast: i === sampledIndices.length - 1,
    }));
  }

  // 4. 원본 총 재생 시간 계산 및 샘플링 프레임 균등 시간 보존 분배
  // 원본 프레임 수 (트리밍 구간 내 원본 사진 수)
  const originalFrameCount = end - start + 1;
  // 원본 1사이클 프레임 수 (Ping-Pong의 경우 2N - 2, 순방향은 N)
  let originalCycleCount = originalFrameCount;
  if (mergedConfig.playbackMode === 'ping-pong' && originalFrameCount > 2) {
    originalCycleCount = 2 * originalFrameCount - 2;
  }
  const targetTotalDurationMs = originalCycleCount * baseDelayMs;

  const sequenceLength = plannedSequence.length;
  const baseSampledDelay = Math.floor(targetTotalDurationMs / sequenceLength);
  const remainderDelay = targetTotalDurationMs % sequenceLength;

  // 5. 프레임별 딜레이 주입 (첫/마지막 프레임 정지시간 반영)
  const frames: PlannedFrame[] = plannedSequence.map((item, idx) => {
    // 나머지 딜레이(remainderDelay)를 앞쪽 프레임들에 1ms씩 고르게 배분하여 총합을 100% 일치시킴
    const frameStandardDelay = baseSampledDelay + (idx < remainderDelay ? 1 : 0);
    let delayMs = frameStandardDelay;

    if (item.isFirst && mergedConfig.firstFramePauseMs > 0) {
      delayMs = Math.max(frameStandardDelay, mergedConfig.firstFramePauseMs);
    } else if (
      (item.isLast || item.isTurnaround) &&
      mergedConfig.lastFramePauseMs > 0
    ) {
      delayMs = Math.max(frameStandardDelay, mergedConfig.lastFramePauseMs);
    }

    return {
      ...item,
      delayMs,
    };
  });

  const totalDurationMs = frames.reduce((acc, f) => acc + f.delayMs, 0);
  const uniqueSourceIndices = Array.from(new Set(frames.map((f) => f.sourceIndex)));

  return {
    frames,
    totalDurationMs,
    uniqueSourceIndices,
    encodedFrameCount: frames.length,
    loop: mergedConfig.loop,
    config: mergedConfig,
  };
}

