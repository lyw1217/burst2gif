export interface StartJobMessage {
  type: 'START';
  files: File[];
  options: {
    targetWidth: number;
    targetHeight: number;
    fps: number;
    loop: number; // 0 = infinite
    fitMode: 'contain' | 'cover';
  };
}

export interface CancelJobMessage {
  type: 'CANCEL';
}

export type WorkerInMessage = StartJobMessage | CancelJobMessage;

export interface ProgressMessage {
  type: 'PROGRESS';
  currentFrame: number;
  totalFrames: number;
  currentBytes: number;
  fileName: string;
}

export interface CompletedMessage {
  type: 'COMPLETED';
  blob: Blob;
  totalBytes: number;
  durationMs: number;
  isOPFS: boolean;
}

export interface ErrorMessage {
  type: 'ERROR';
  error: string;
  frameIndex?: number;
  fileName?: string;
}

export interface CancelledMessage {
  type: 'CANCELLED';
}

export type WorkerOutMessage =
  | ProgressMessage
  | CompletedMessage
  | ErrorMessage
  | CancelledMessage;
