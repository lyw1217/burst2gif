import { test, expect } from '@playwright/test';

function createSampleImage(name: string) {
  // 10x10 표준 유효 Red PNG
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fTcuYAAAAAElFTkSuQmCC';
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(pngBase64, 'base64'),
  };
}

test.describe('Burst2Gif Core E2E Tests', () => {
  test('기본 렌더링 및 메타데이터 확인', async ({ page }) => {
    await page.goto('/');

    // 페이지 제목 및 헤더 텍스트 확인
    await expect(page).toHaveTitle(/Burst2Gif/);
    await expect(page.locator('header')).toContainText('Burst2Gif');
    await expect(page.getByText('서버 업로드 없는 100% 로컬 변환')).toBeVisible();

    // 초기 파일 업로드 유도 영역 노출 확인
    await expect(page.getByText('연사 사진들을 여기에 끌어다 놓으세요')).toBeVisible();
  });

  test('핵심 사용자 흐름: 사진 6장 업로드 -> 구간 트리밍 -> 왕복 재생 -> GIF 생성 및 다운로드', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. 가상 연사 사진 6장 생성 및 업로드
    const sampleFiles = [
      createSampleImage('burst_001.png'),
      createSampleImage('burst_002.png'),
      createSampleImage('burst_003.png'),
      createSampleImage('burst_004.png'),
      createSampleImage('burst_005.png'),
      createSampleImage('burst_006.png'),
    ];

    const fileInput = page.locator('input[data-testid="file-upload-input"]');
    await fileInput.setInputFiles(sampleFiles);

    // 타임라인에 총 6장 로드 확인
    await expect(page.getByText('총 6장')).toBeVisible({ timeout: 5000 });

    // 2. 타임라인 및 프리뷰 플레이어 노출 확인
    await expect(page.getByText('실시간 미리보기')).toBeVisible();

    // 3. 시작 구간 지정 (2번째 사진 클릭 후 시작점으로 지정)
    const secondFrame = page.locator('text=#2').first();
    await secondFrame.click();
    const setStartBtn = page.getByRole('button', { name: /시작점/i });
    await setStartBtn.click();

    // 시작 뱃지 표시 확인
    await expect(page.getByText('시작').first()).toBeVisible();

    // 4. 왕복 재생(Ping-Pong) 모드 활성화
    const pingPongBtn = page.getByRole('button', { name: '왕복', exact: true });
    await pingPongBtn.click();

    // 왕복 활성화에 따른 버튼 텍스트 변경 확인
    const submitBtn = page.getByRole('button', { name: /GIF 만들기/ });
    await expect(submitBtn).toContainText('왕복');

    // 5. 프레임 건너뛰기 설정 (2장마다 1장)
    const skipSelect = page.locator('select').filter({ hasText: '모든 사진 사용' });
    if (await skipSelect.isVisible()) {
      await skipSelect.selectOption('2');
    }

    // 6. GIF 생성 실행
    await submitBtn.click();

    // 7. 인코딩 완료 및 결과 모달 확인 (소형 이미지는 즉시 완료될 수 있음)
    await expect(page.getByText('GIF 생성이 완료되었습니다!')).toBeVisible({ timeout: 15000 });
    const downloadLink = page.getByRole('link', { name: /GIF 다운로드/i });
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute('download', /burst.*\.gif/);
  });

  test('미리보기 재생 제어 및 속도 조절 UI 검증', async ({ page }) => {
    await page.goto('/');

    const sampleFiles = [
      createSampleImage('burst_001.png'),
      createSampleImage('burst_002.png'),
      createSampleImage('burst_003.png'),
      createSampleImage('burst_004.png'),
    ];

    await page.locator('input[data-testid="file-upload-input"]').setInputFiles(sampleFiles);
    await expect(page.getByText('총 4장')).toBeVisible();

    // 재생 / 일시정지 버튼 토글 확인
    const playPauseBtn = page.getByRole('button', { name: /재생|일시정지/ }).first();
    await expect(playPauseBtn).toBeVisible();
    await playPauseBtn.click(); // 토글

    // 처음으로 되감기 버튼
    const rewindBtn = page.locator('button[title="처음으로 되감기"]');
    await expect(rewindBtn).toBeVisible();
    await rewindBtn.click();

    // 품질 모드 토글 확인 (빠른 생성 <-> 고화질 ON)
    const qualityBtn = page.getByRole('button', { name: /빠른 생성|고화질 ON/ });
    await expect(qualityBtn).toBeVisible();
    await qualityBtn.click();
    await expect(page.getByText('고화질 ON')).toBeVisible();
  });
});
