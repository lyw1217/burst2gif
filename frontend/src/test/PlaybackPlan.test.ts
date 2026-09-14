import { describe, it, expect } from 'vitest';
import { generatePlaybackPlan, PlaybackConfig, DEFAULT_PLAYBACK_CONFIG } from '../modules/PlaybackPlan';

describe('PlaybackPlan Module', () => {
  it('0개 파일인 경우 빈 계획을 반환해야 한다', () => {
    const plan = generatePlaybackPlan(0);
    expect(plan.frames).toHaveLength(0);
    expect(plan.encodedFrameCount).toBe(0);
    expect(plan.totalDurationMs).toBe(0);
  });

  it('기본 순방향(forward) 재생 시 1:1 시퀀스를 생성해야 한다', () => {
    const plan = generatePlaybackPlan(5, {
      fps: 10, // 100ms per frame
      playbackMode: 'forward',
      frameSkip: 1,
      trimRange: [0, 4],
    });

    expect(plan.encodedFrameCount).toBe(5);
    expect(plan.frames.map((f) => f.sourceIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(plan.frames[0].delayMs).toBe(100);
    expect(plan.frames[4].delayMs).toBe(100);
    expect(plan.totalDurationMs).toBe(500);
  });

  it('왕복(ping-pong) 재생 시 양 끝 프레임이 연속 중복되지 않아야 한다', () => {
    // 5개 프레임: [0, 1, 2, 3, 4] -> 왕복: [0, 1, 2, 3, 4, 3, 2, 1] (총 8프레임)
    const plan = generatePlaybackPlan(5, {
      fps: 10,
      playbackMode: 'ping-pong',
      frameSkip: 1,
      trimRange: [0, 4],
    });

    const sequence = plan.frames.map((f) => f.sourceIndex);
    expect(sequence).toEqual([0, 1, 2, 3, 4, 3, 2, 1]);
    expect(plan.encodedFrameCount).toBe(8);

    // 연속 중복 프레임 검사
    for (let i = 0; i < sequence.length - 1; i++) {
      expect(sequence[i]).not.toBe(sequence[i + 1]);
    }
    // 루프 시 마지막(1)과 첫 번째(0)도 중복되지 않음
    expect(sequence[sequence.length - 1]).not.toBe(sequence[0]);
  });

  it('2장 이하의 작은 프레임에서도 왕복 모드가 안전하게 처리되어야 한다', () => {
    const plan1 = generatePlaybackPlan(1, { playbackMode: 'ping-pong' });
    expect(plan1.frames.map((f) => f.sourceIndex)).toEqual([0]);

    const plan2 = generatePlaybackPlan(2, { playbackMode: 'ping-pong' });
    expect(plan2.frames.map((f) => f.sourceIndex)).toEqual([0, 1]);
  });

  it('프레임 건너뛰기(frameSkip) 적용 시 전체 재생시간이 보존되어야 한다', () => {
    const totalFiles = 6;
    const fps = 10; // baseDelay = 100ms
    // frameSkip = 1: 6 frames * 100ms = 600ms
    const planAll = generatePlaybackPlan(totalFiles, {
      fps,
      frameSkip: 1,
      trimRange: [0, 5],
    });
    expect(planAll.frames.map((f) => f.sourceIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(planAll.totalDurationMs).toBe(600);

    // frameSkip = 2: [0, 2, 4] (3 frames), each frame delay = 100 * 2 = 200ms
    // totalDuration = 3 * 200ms = 600ms (전체 시간 완벽 보존!)
    const planSkip2 = generatePlaybackPlan(totalFiles, {
      fps,
      frameSkip: 2,
      trimRange: [0, 5],
    });
    expect(planSkip2.frames.map((f) => f.sourceIndex)).toEqual([0, 2, 4]);
    expect(planSkip2.frames[0].delayMs).toBe(200);
    expect(planSkip2.totalDurationMs).toBe(600);
  });

  it('시작/끝 구간(trimRange)이 정확히 반영되어야 한다', () => {
    const plan = generatePlaybackPlan(10, {
      playbackMode: 'forward',
      frameSkip: 1,
      trimRange: [2, 6], // 2, 3, 4, 5, 6
    });

    expect(plan.encodedFrameCount).toBe(5);
    expect(plan.frames.map((f) => f.sourceIndex)).toEqual([2, 3, 4, 5, 6]);
  });

  it('첫/마지막 프레임 정지시간(Pause Delay)이 계획에 정확히 주입되어야 한다', () => {
    const plan = generatePlaybackPlan(4, {
      fps: 10, // 100ms
      playbackMode: 'forward',
      trimRange: [0, 3],
      firstFramePauseMs: 500,
      lastFramePauseMs: 800,
    });

    expect(plan.frames[0].delayMs).toBe(500);
    expect(plan.frames[1].delayMs).toBe(100);
    expect(plan.frames[2].delayMs).toBe(100);
    expect(plan.frames[3].delayMs).toBe(800);
  });

  it('왕복 모드에서 반환점 프레임에도 정지시간이 주입되어야 한다', () => {
    // 4개 프레임: [0, 1, 2, 3, 2, 1]
    const plan = generatePlaybackPlan(4, {
      fps: 10,
      playbackMode: 'ping-pong',
      trimRange: [0, 3],
      firstFramePauseMs: 400,
      lastFramePauseMs: 600,
    });

    expect(plan.frames[0].sourceIndex).toBe(0);
    expect(plan.frames[0].delayMs).toBe(400); // 시작점 정지

    // 반환점 (index 3, source 3)
    expect(plan.frames[3].sourceIndex).toBe(3);
    expect(plan.frames[3].isTurnaround).toBe(true);
    expect(plan.frames[3].delayMs).toBe(600); // 반환점 정지
  });

  describe('프레임 건너뛰기 시간 보존 엣지 케이스 검증', () => {
    // 1. 5장 사진 + 스킵 2 (프레임 수가 스킵 값의 배수가 아닌 경우)
    it('5장 사진 + 스킵 2: 원본 총 시간과 건너뛴 프레임 딜레이 합이 정확히 일치해야 한다', () => {
      const fps = 10; // baseDelayMs = 100ms, original 5 frames = 500ms
      const plan = generatePlaybackPlan(5, {
        fps,
        playbackMode: 'forward',
        frameSkip: 2,
        trimRange: [0, 4],
      });

      // 0, 2, 4 -> 3 frames
      expect(plan.frames.map((f) => f.sourceIndex)).toEqual([0, 2, 4]);
      expect(plan.encodedFrameCount).toBe(3);

      const totalDelay = plan.frames.reduce((sum, f) => sum + f.delayMs, 0);
      const originalTotalMs = 5 * 100; // 500ms
      expect(totalDelay).toBe(originalTotalMs);
      // 500ms (50 ticks) / 3 frames = 16 ticks (160ms) + 2 remainder ticks (20ms) -> [170, 170, 160] ms
      expect(plan.frames[0].delayMs).toBe(170);
      expect(plan.frames[1].delayMs).toBe(170);
      expect(plan.frames[2].delayMs).toBe(160);
      expect(plan.frames.every((f) => f.delayMs % 10 === 0)).toBe(true);
    });

    // 2. 6장 사진 + 스킵 2 (프레임 수가 스킵 값의 배수인 경우)
    it('6장 사진 + 스킵 2: 원본 총 시간과 건너뛴 프레임 딜레이 합이 정확히 일치해야 한다', () => {
      const fps = 10; // baseDelayMs = 100ms, original 6 frames = 600ms
      const plan = generatePlaybackPlan(6, {
        fps,
        playbackMode: 'forward',
        frameSkip: 2,
        trimRange: [0, 5],
      });

      // 0, 2, 4 -> 3 frames
      expect(plan.frames.map((f) => f.sourceIndex)).toEqual([0, 2, 4]);
      expect(plan.encodedFrameCount).toBe(3);

      const totalDelay = plan.frames.reduce((sum, f) => sum + f.delayMs, 0);
      const originalTotalMs = 6 * 100; // 600ms
      expect(totalDelay).toBe(originalTotalMs);
      expect(plan.frames.every((f) => f.delayMs === 200)).toBe(true);
      expect(plan.frames.every((f) => f.delayMs % 10 === 0)).toBe(true);
    });

    // 3. 7장 사진 + 스킵 3
    it('7장 사진 + 스킵 3: 원본 총 시간과 건너뛴 프레임 딜레이 합이 정확히 일치해야 한다', () => {
      const fps = 10; // baseDelayMs = 100ms, original 7 frames = 700ms
      const plan = generatePlaybackPlan(7, {
        fps,
        playbackMode: 'forward',
        frameSkip: 3,
        trimRange: [0, 6],
      });

      // 0, 3, 6 -> 3 frames
      expect(plan.frames.map((f) => f.sourceIndex)).toEqual([0, 3, 6]);
      expect(plan.encodedFrameCount).toBe(3);

      const totalDelay = plan.frames.reduce((sum, f) => sum + f.delayMs, 0);
      const originalTotalMs = 7 * 100; // 700ms
      expect(totalDelay).toBe(originalTotalMs);
      // 700ms (70 ticks) / 3 frames = 23 ticks (230ms) + 1 remainder tick (10ms) -> [240, 230, 230] ms
      expect(plan.frames[0].delayMs).toBe(240);
      expect(plan.frames[1].delayMs).toBe(230);
      expect(plan.frames[2].delayMs).toBe(230);
      expect(plan.frames.every((f) => f.delayMs % 10 === 0)).toBe(true);
    });

    // 4. 시작/끝 구간 트리밍 + 5장 사진 + 스킵 2
    it('시작/끝 구간 트리밍 ([2, 6] = 5장) + 스킵 2: 원본 총 시간 유지 검증', () => {
      const fps = 10; // baseDelayMs = 100ms, trimmed 5 frames = 500ms
      const plan = generatePlaybackPlan(10, {
        fps,
        playbackMode: 'forward',
        frameSkip: 2,
        trimRange: [2, 6], // 5 frames: [2, 3, 4, 5, 6]
      });

      // 2, 4, 6 -> 3 frames
      expect(plan.frames.map((f) => f.sourceIndex)).toEqual([2, 4, 6]);
      expect(plan.encodedFrameCount).toBe(3);

      const totalDelay = plan.frames.reduce((sum, f) => sum + f.delayMs, 0);
      const originalTotalMs = 5 * 100; // 500ms
      expect(totalDelay).toBe(originalTotalMs);
      expect(plan.frames[0].delayMs).toBe(170);
      expect(plan.frames[1].delayMs).toBe(170);
      expect(plan.frames[2].delayMs).toBe(160);
      expect(plan.frames.every((f) => f.delayMs % 10 === 0)).toBe(true);
    });

    // 5. 왕복(Ping-Pong) 재생 + 스킵 조합
    it('왕복(Ping-Pong) 재생 + 스킵 조합: 전체 사이클 시간 보존 및 루프 경계 중복 없음 검증', () => {
      const fps = 10; // baseDelayMs = 100ms
      // 5개 원본 프레임의 원래 ping-pong 사이클: 2 * 5 - 2 = 8 frames (800ms)
      const plan = generatePlaybackPlan(5, {
        fps,
        playbackMode: 'ping-pong',
        frameSkip: 2,
        trimRange: [0, 4],
      });

      // sampled: [0, 2, 4]
      // ping-pong: [0, 2, 4, 2] (4 frames)
      const sequence = plan.frames.map((f) => f.sourceIndex);
      expect(sequence).toEqual([0, 2, 4, 2]);
      expect(plan.encodedFrameCount).toBe(4);

      const totalDelay = plan.frames.reduce((sum, f) => sum + f.delayMs, 0);
      const originalTotalMs = (2 * 5 - 2) * 100; // 800ms
      expect(totalDelay).toBe(originalTotalMs);
      expect(plan.frames.every((f) => f.delayMs === 200)).toBe(true);

      // 루프 경계 연속 중복 없음 확인 (마지막 frame 2 -> 첫 frame 0)
      expect(sequence[sequence.length - 1]).not.toBe(sequence[0]);
    });
  });
});

