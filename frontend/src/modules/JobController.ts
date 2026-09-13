import { WorkerInMessage, WorkerOutMessage } from '../types/worker';

export interface JobOptions {
  targetWidth: number;
  targetHeight: number;
  fps: number;
  loop: number;
  fitMode: 'contain' | 'cover';
}

export interface JobProgress {
  currentFrame: number;
  totalFrames: number;
  currentBytes: number;
  estimatedTotalBytes?: number;
  fileName: string;
  percent: number;
}

export interface JobResult {
  blob: Blob;
  totalBytes: number;
  durationMs: number;
  isOPFS: boolean;
}

export class JobController {
  private worker: Worker | null = null;
  private isRunning: boolean = false;

  startJob(
    files: File[],
    options: JobOptions,
    onProgress: (progress: JobProgress) => void,
    onCompleted: (result: JobResult) => void,
    onError: (errorMessage: string) => void
  ) {
    if (this.isRunning) {
      this.cancelJob();
    }

    this.isRunning = true;

    // Vite 모듈 Worker 인스턴스 생성
    this.worker = new Worker(
      new URL('../workers/gifWorker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;

      switch (msg.type) {
        case 'PROGRESS': {
          const percent = Math.round((msg.currentFrame / msg.totalFrames) * 100);
          onProgress({
            currentFrame: msg.currentFrame,
            totalFrames: msg.totalFrames,
            currentBytes: msg.currentBytes,
            estimatedTotalBytes: msg.estimatedTotalBytes,
            fileName: msg.fileName,
            percent,
          });
          break;
        }
        case 'COMPLETED': {
          this.cleanup();
          onCompleted({
            blob: msg.blob,
            totalBytes: msg.totalBytes,
            durationMs: msg.durationMs,
            isOPFS: msg.isOPFS,
          });
          break;
        }
        case 'ERROR': {
          this.cleanup();
          onError(msg.error);
          break;
        }
        case 'CANCELLED': {
          this.cleanup();
          break;
        }
      }
    };

    this.worker.onerror = (err) => {
      this.cleanup();
      onError(err.message || 'Worker 실행 중 예상치 못한 오류가 발생했습니다.');
    };

    // 작업 시작 메시지 발송
    const startMsg: WorkerInMessage = {
      type: 'START',
      files,
      options,
    };
    this.worker.postMessage(startMsg);
  }

  cancelJob() {
    if (this.worker && this.isRunning) {
      try {
        const cancelMsg: WorkerInMessage = { type: 'CANCEL' };
        this.worker.postMessage(cancelMsg);
      } catch (e) {
        // ignore
      }
      // 워커가 OPFS 임시파일을 abort()로 정리할 수 있도록 약간의 시간(300ms) 후 terminate
      setTimeout(() => {
        if (this.isRunning) {
          this.cleanup();
        }
      }, 300);
    }
  }

  private cleanup() {
    this.isRunning = false;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}

export const jobController = new JobController();
