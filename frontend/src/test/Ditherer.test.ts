import { describe, it, expect } from 'vitest';
import { createPaletteMatcher, applyFloydSteinbergDither } from '../modules/Ditherer';

describe('Ditherer Module', () => {
  const samplePalette = [
    [0, 0, 0],       // 0: 검정
    [255, 255, 255], // 1: 흰색
    [255, 0, 0],     // 2: 빨강
    [0, 255, 0],     // 3: 초록
    [0, 0, 255],     // 4: 파랑
  ];

  it('createPaletteMatcher는 정확한 가장 가까운 색상 인덱스를 반환해야 한다', () => {
    const matcher = createPaletteMatcher(samplePalette);
    expect(matcher(0, 0, 0)).toBe(0);
    expect(matcher(255, 255, 255)).toBe(1);
    expect(matcher(240, 10, 10)).toBe(2); // 빨강에 가장 가까움
    expect(matcher(10, 250, 10)).toBe(3); // 초록에 가장 가까움
    expect(matcher(10, 10, 250)).toBe(4); // 파랑에 가장 가까움
  });

  it('applyFloydSteinbergDither는 유효한 팔레트 인덱스 버퍼를 생성해야 한다', () => {
    const width = 4;
    const height = 4;
    const rgba = new Uint8Array(width * height * 4);

    // 흑백 그라데이션 더미 데이터
    for (let i = 0; i < width * height; i++) {
      const val = Math.floor((i / (width * height)) * 255);
      rgba[i * 4 + 0] = val;
      rgba[i * 4 + 1] = val;
      rgba[i * 4 + 2] = val;
      rgba[i * 4 + 3] = 255;
    }

    const indexed = applyFloydSteinbergDither(rgba, width, height, samplePalette);
    expect(indexed).toHaveLength(width * height);

    for (let i = 0; i < indexed.length; i++) {
      expect(indexed[i]).toBeGreaterThanOrEqual(0);
      expect(indexed[i]).toBeLessThan(samplePalette.length);
    }
  });
});
