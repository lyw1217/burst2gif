import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { WorkerInMessage, WorkerOutMessage } from '../types/worker';
import { createOutputSink, OutputSink } from '../modules/OutputSink';

let currentSink: OutputSink | null = null;
let cancelRequested = false;

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (msg.type === 'CANCEL') {
    // 안전한 취소 플래그 설정: 비동기 IO 중간에 sink를 null로 만들어 크래시나는 현상 방지
    cancelRequested = true;
    return;
  }

  if (msg.type === 'START') {
    cancelRequested = false;
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

      // 4. Decode Concurrency = 1 (한 번에 1장씩 순차 스트리밍 처리)
      for (let i = 0; i < files.length; i++) {
        // 프레임 경계에서 취소 플래그 확인
        if (cancelRequested) {
          if (currentSink) {
            await currentSink.abort();
            currentSink = null;
          }
          self.postMessage({ type: 'CANCELLED' } as WorkerOutMessage);
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
          throw new Error(`[${i + 1}번째 사진 오류] ${file.name} 디코딩 실패: ${decodeErr.message}`);
        }

        if (cancelRequested) {
          bitmap.close();
          if (currentSink) {
            await currentSink.abort();
            currentSink = null;
          }
          self.postMessage({ type: 'CANCELLED' } as WorkerOutMessage);
          return;
        }

        // 4-2. 캔버스 초기화 및 프레임 렌더링 (contain / cover)
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const bmpW = bitmap.width;
        const bmpH = bitmap.height;

        let drawX = 0;
        let drawY = 0;
        let drawW = targetWidth;
        let drawH = targetHeight;

        if (fitMode === 'cover') {
          const scale = Math.max(targetWidth / bmpW, targetHeight / bmpH);
          drawW = bmpW * scale;
          drawH = bmpH * scale;
          drawX = (targetWidth - drawW) / 2;
          drawY = (targetHeight - drawH) / 2;
        } else {
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
          repeat: i === 0 ? loop : undefined,
        });

        // 4-6. [P0 핵심 해결] 방금 생성된 바이트 청크만 OPFS에 스트리밍 플러시하고 버퍼 즉시 리셋!
        const stream = encoder.stream as any;
        const chunk: Uint8Array = stream.bytesView();
        if (chunk.length > 0 && currentSink) {
          await currentSink.write(chunk);
        }
        // 인코더 내부 byte writer 버퍼만 0으로 비움 (GIF 인코딩 상태는 온전히 유지)
        stream.reset();

        if (cancelRequested) {
          if (currentSink) {
            await currentSink.abort();
            currentSink = null;
          }
          self.postMessage({ type: 'CANCELLED' } as WorkerOutMessage);
          return;
        }

        // 4-7. 진행률 및 동적 예상 용량 계산
        const bytesWrittenSoFar = currentSink ? currentSink.getBytesWritten() : 0;
        let estimatedTotalBytes: number | undefined;
        if (i >= 2) {
          // 3번째 프레임부터 평균 프레임 크기 기반 총 용량 추정
          const avgPerFrame = bytesWrittenSoFar / (i + 1);
          estimatedTotalBytes = Math.round(avgPerFrame * files.length);
        }

        self.postMessage({
          type: 'PROGRESS',
          currentFrame: i + 1,
          totalFrames: files.length,
          currentBytes: bytesWrittenSoFar,
          estimatedTotalBytes,
          fileName: file.name,
        } as WorkerOutMessage);
      }

      // 5. 인코딩 종료 플러시 (트레일러 바이트 0x3B 기록)
      encoder.finish();
      const endStream = encoder.stream as any;
      const finalTrailer: Uint8Array = endStream.bytesView();
      if (finalTrailer.length > 0 && currentSink) {
        await currentSink.write(finalTrailer);
      }
      endStream.reset();

      if (cancelRequested) {
        if (currentSink) {
          await currentSink.abort();
          currentSink = null;
        }
        self.postMessage({ type: 'CANCELLED' } as WorkerOutMessage);
        return;
      }

      // 6. 최종 파일 반환
      if (!currentSink) {
        throw new Error('출력 파일 스트림이 존재하지 않습니다.');
      }
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
