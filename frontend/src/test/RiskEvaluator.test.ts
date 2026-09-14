import { describe, it, expect } from 'vitest';
import { calculateOutputDimensions, evaluateRisk } from '../modules/RiskEvaluator';

describe('RiskEvaluator Module', () => {
  it('가로 사진 치수 계산 및 짝수 보정 검증', () => {
    // 3000 x 2000 (3:2 가로) -> targetLongEdge 1280
    const dim = calculateOutputDimensions(3000, 2000, 1280);
    expect(dim.width).toBe(1280);
    expect(dim.height).toBe(852); // Math.round(1280 * 2000 / 3000) = 853 -> 짝수 보정 852
    expect(dim.width % 2).toBe(0);
    expect(dim.height % 2).toBe(0);
  });

  it('세로 사진 치수 계산 및 짝수 보정 검증', () => {
    // 2000 x 3000 (2:3 세로) -> targetLongEdge 1280
    const dim = calculateOutputDimensions(2000, 3000, 1280);
    expect(dim.height).toBe(1280);
    expect(dim.width).toBe(852);
    expect(dim.width % 2).toBe(0);
    expect(dim.height % 2).toBe(0);
  });

  it('작업량(WorkPixels)에 따른 4단계 안전장치 판별 검증', () => {
    // 1. normal (<= 250M)
    // 1280 * 720 * 100 = 92.16M
    const risk1 = evaluateRisk(1280, 720, 100);
    expect(risk1.level).toBe('normal');
    expect(risk1.canProceed).toBe(true);

    // 2. heavy (250M ~ 600M)
    // 1280 * 720 * 400 = 368.6M
    const risk2 = evaluateRisk(1280, 720, 400);
    expect(risk2.level).toBe('heavy');
    expect(risk2.canProceed).toBe(true);

    // 3. very_heavy (600M ~ 1.2B)
    // 1920 * 1080 * 400 = 829.4M
    const risk3 = evaluateRisk(1920, 1080, 400);
    expect(risk3.level).toBe('very_heavy');
    expect(risk3.canProceed).toBe(true);
    expect(risk3.recommendedWidth).toBe(1280);

    // 4. dangerous (> 1.2B)
    // 1920 * 1080 * 800 = 1.65B
    const risk4 = evaluateRisk(1920, 1080, 800);
    expect(risk4.level).toBe('dangerous');
    expect(risk4.canProceed).toBe(false);
  });
});
