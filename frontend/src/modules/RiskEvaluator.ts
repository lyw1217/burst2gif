export type RiskLevel = 'normal' | 'heavy' | 'very_heavy' | 'dangerous';

export interface RiskAssessment {
  workPixels: number;
  level: RiskLevel;
  recommendedWidth: number | null;
  message: string;
  subMessage?: string;
  canProceed: boolean;
  ditherWarning?: string;
}

/**
 * 7. 작업량 기반 안전장치 (WorkPixels = outputWidth × outputHeight × frameCount)
 * 
 * - ≤ 250M: 일반 (안전하게 바로 생성)
 * - 250M ~ 600M: 무거움 (생성 가능하나 시간 소요)
 * - 600M ~ 1.2B: 매우 무거움 (해상도 감소 권장)
 * - > 1.2B: 위험 (설정 변경 전 생성 불가)
 */
export function evaluateRisk(
  outputWidth: number,
  outputHeight: number,
  frameCount: number,
  qualityMode: 'fast' | 'high' = 'fast'
): RiskAssessment {
  const workPixels = outputWidth * outputHeight * frameCount;

  let ditherWarning: string | undefined;
  if (qualityMode === 'high' && (outputWidth >= 1920 || workPixels > 250_000_000)) {
    ditherWarning = '고화질 디더링(1920px) 모드는 계조 표현이 뛰어나지만 정밀 오차 확산 연산으로 인해 변환 시간이 길어질 수 있습니다. 빠른 생성을 원하시면 1280px 이하 또는 빠른 생성 모드를 권장합니다.';
  }

  if (workPixels <= 250_000_000) {
    return {
      workPixels,
      level: 'normal',
      recommendedWidth: null,
      message: '안정적인 작업량입니다.',
      canProceed: true,
      ditherWarning,
    };
  }

  if (workPixels <= 600_000_000) {
    return {
      workPixels,
      level: 'heavy',
      recommendedWidth: null,
      message: '사진 장수와 크기가 커서 처리 시간이 다소 걸릴 수 있습니다.',
      canProceed: true,
      ditherWarning,
    };
  }

  if (workPixels <= 1_200_000_000) {
    const recommendedWidth = outputWidth > 1280 ? 1280 : 960;
    return {
      workPixels,
      level: 'very_heavy',
      recommendedWidth,
      message: '사진이 많아 GIF 생성에 부담이 큰 설정입니다.',
      subMessage: `권장 크기: ${recommendedWidth}px`,
      canProceed: true,
      ditherWarning,
    };
  }

  // > 1.2B 위험 (안전을 위해 해상도 하향 권장)
  const recommendedWidth = outputWidth > 1280 ? 1280 : 960;
  return {
    workPixels,
    level: 'dangerous',
    recommendedWidth,
    message: '현재 설정으로는 브라우저에서 안정적으로 GIF를 만들기 어렵습니다.',
    subMessage: `사진 크기를 줄이면 안정적으로 만들 수 있습니다. (권장: ${recommendedWidth}px)`,
    canProceed: false,
    ditherWarning,
  };
}

/**
 * 원본 가로/세로 비율을 유지하면서 목표 긴 변(targetLongEdge)에 맞는 출력 치수 계산
 */
export function calculateOutputDimensions(
  origWidth: number,
  origHeight: number,
  targetLongEdge: number
): { width: number; height: number } {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: targetLongEdge, height: targetLongEdge };
  }

  const isLandscape = origWidth >= origHeight;
  let width: number;
  let height: number;

  if (isLandscape) {
    width = targetLongEdge;
    height = Math.round((targetLongEdge * origHeight) / origWidth);
  } else {
    height = targetLongEdge;
    width = Math.round((targetLongEdge * origWidth) / origHeight);
  }

  // 짝수 픽셀 보정 (일부 디스플레이 및 인코더 호환성)
  width = Math.max(16, (width >> 1) << 1);
  height = Math.max(16, (height >> 1) << 1);

  return { width, height };
}
