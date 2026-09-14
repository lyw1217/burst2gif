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
});
