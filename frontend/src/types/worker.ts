import { PlaybackPlan } from '../modules/PlaybackPlan';

export interface JobEncodingOptions {
  targetWidth: number;
  targetHeight: number;
  fps: number;
  loop: number; // 0 = infinite, 1 = once, 2 = twice, etc.
  fitMode: 'contain' | 'cover';
  backgroundColor?: string;
  coverPosition?: { x: number; y: number };
  qualityMode?: 'fast' | 'high';
  plan: PlaybackPlan;
}

export interface StartJobMessage {
  type: 'START';
  files: File[];
  options: JobEncodingOptions;
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
  estimatedTotalBytes?: number;
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
