import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { WorkerInMessage, WorkerOutMessage } from '../types/worker';
import { createOutputSink, OutputSink } from '../modules/OutputSink';

let currentSink: OutputSink | null = null;
let isCancelled = false;

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (msg.type === 'CANCEL') {
    isCancelled = true;
    if (currentSink) {
      await currentSink.abort();
      currentSink = null;
    }
    self.postMessage({ type: 'CANCELLED' } as WorkerOutMessage);
    return;
  }

  if (msg.type === 'START') {
    isCancelled = false;
    const { files, options } = msg;
    const startTime = performance.now();

    try {
      // 1. OutputSink 초기화 (OPFS 우선, 불가 시 Memory fallback)
      currentSink = await createOutputSink();

      const { targetWidth, targetHeight, fps, loop, fitMode } = options;
      const delayMs = Math.round(1000 / Math.max(0.1, fps));

      // 2. 단일 작업용 OffscreenCanvas 생성 (원칙: 작업 중 Canvas는 오직 1개만 재사용)
      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('OffscreenCanvas 2D context를 생성할 수 없습니다.');
      }

      // 3. 스트리밍 GIFEncoder 초기화
      const encoder = GIFEncoder();
      let lastOffset = 0;

      // 4. Decode Concurrency = 1 (한 번에 1장씩 순차 스트리밍 처리)
      for (let i = 0; i < files.length; i++) {
        if (isCancelled) {
          return;
        }

        const file = files[i];

        // 4-1. 얼리 리사이즈 (긴 변에 맞춰 디코딩하여 230MB 픽셀 버퍼 미생성)
        const isLandscape = targetWidth >= targetHeight;
        let bitmap: ImageBitmap;
        try {
          bitmap = await createImageBitmap(file, isLandscape ? {
            resizeWidth: targetWidth,
            resizeQuality: 'medium',
          } : {
            resizeHeight: targetHeight,
            resizeQuality: 'medium',
          });
        } catch (decodeErr: any) {
          // 손상된 이미지 개별 예외 처리
          throw new Error(`[${i + 1}번째 사진 오류] ${file.name} 디코딩 실패: ${decodeErr.message}`);
        }

        // 4-2. 캔버스 초기화 및 프레임 렌더링 (contain / cover)
        ctx.clearRect(0, 0, targetWidth, targetHeight);

        // 기본 배경색(투명 또는 검정)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const bmpW = bitmap.width;
        const bmpH = bitmap.height;

        let drawX = 0;
        let drawY = 0;
        let drawW = targetWidth;
        let drawH = targetHeight;

        if (fitMode === 'cover') {
          // 화면 꽉 채우기 (크롭)
          const scale = Math.max(targetWidth / bmpW, targetHeight / bmpH);
          drawW = bmpW * scale;
          drawH = bmpH * scale;
          drawX = (targetWidth - drawW) / 2;
          drawY = (targetHeight - drawH) / 2;
        } else {
          // 화면에 맞추기 (contain - 기본값)
          const scale = Math.min(targetWidth / bmpW, targetHeight / bmpH);
          drawW = bmpW * scale;
          drawH = bmpH * scale;
          drawX = (targetWidth - drawW) / 2;
          drawY = (targetHeight - drawH) / 2;
        }

        ctx.drawImage(bitmap, drawX, drawY, drawW, drawH);

        // 4-3. 핵심 메모리 해제: 비트맵 즉시 명시적 반환 (VRAM/그래픽 메모리 즉시 회수)
        bitmap.close();

        // 4-4. 픽셀 데이터 추출 및 양자화
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const rgba = imageData.data;

        // 고화질 rgb565 팔레트 양자화 (최대 256색)
        const palette = quantize(rgba, 256, { format: 'rgb565' });
        const indexedPixels = applyPalette(rgba, palette, 'rgb565');

        // 4-5. GIF 프레임 쓰기
        encoder.writeFrame(indexedPixels, targetWidth, targetHeight, {
          palette,
          delay: delayMs,
          repeat: i === 0 ? loop : undefined, // 첫 프레임에 loop 속성 기록
        });

        // 4-6. 새로 기록된 바이트 청크를 OutputSink(OPFS)에 스트리밍 플러시
        const fullBytes = encoder.bytesView();
        if (fullBytes.length > lastOffset) {
          const newChunk = fullBytes.subarray(lastOffset);
          await currentSink.write(newChunk);
          lastOffset = fullBytes.length;
        }

        // 4-7. 진행률 메시지 전송 (메인 스레드에 장수 및 현재 용량 전달)
        self.postMessage({
          type: 'PROGRESS',
          currentFrame: i + 1,
          totalFrames: files.length,
          currentBytes: currentSink.getBytesWritten(),
          fileName: file.name,
        } as WorkerOutMessage);
      }

      // 5. 인코딩 종료 플러시
      encoder.finish();
      const finalBytes = encoder.bytesView();
      if (finalBytes.length > lastOffset) {
        const remainingChunk = finalBytes.subarray(lastOffset);
        await currentSink.write(remainingChunk);
      }

      // 6. 최종 파일 반환
      const finalBlob = await currentSink.finalize();
      const isOPFS = currentSink.isUsingOPFS();
      currentSink = null;

      const durationMs = performance.now() - startTime;
      self.postMessage({
        type: 'COMPLETED',
        blob: finalBlob,
        totalBytes: finalBlob.size,
        durationMs,
        isOPFS,
      } as WorkerOutMessage);
    } catch (err: any) {
      if (currentSink) {
        await currentSink.abort();
        currentSink = null;
      }
      self.postMessage({
        type: 'ERROR',
        error: err.message || 'GIF 생성 중 오류가 발생했습니다.',
      } as WorkerOutMessage);
    }
  }
};
