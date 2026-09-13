export interface ImageItem {
  id: string;
  filename: string;
  path: string;
  size_bytes: number;
  size_formatted: string;
  mtime: number;
}

export interface ConvertOptions {
  format: 'gif' | 'mp4';
  fps: number;
  resolution: string; // 'original', '1080', '720', '480', or custom width
  quality_mode: 'high' | 'fast';
  crf: number;
  loop: number;
  target_size_mb?: number;
}

export interface JobStatus {
  job_id: string;
  format?: 'gif' | 'mp4';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  size_bytes: number;
  size_formatted: string;
  error_message?: string;
  download_url?: string;
}
