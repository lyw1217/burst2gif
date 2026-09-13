import { ImageItem, ConvertOptions, JobStatus } from './types';

const API_BASE = '/api';

export async function scanFolder(folderPath: string): Promise<ImageItem[]> {
  const res = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_path: folderPath }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || '폴더 스캔에 실패했습니다.');
  }
  return data.images;
}

export async function uploadFiles(files: File[]): Promise<ImageItem[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || '파일 업로드에 실패했습니다.');
  }
  return data.images;
}

export function getThumbnailUrl(filePath: string): string {
  return `${API_BASE}/thumbnail?path=${encodeURIComponent(filePath)}`;
}

export async function startConvert(imagePaths: string[], options: ConvertOptions): Promise<string> {
  const res = await fetch(`${API_BASE}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_paths: imagePaths,
      format: options.format,
      fps: options.fps,
      resolution: options.resolution,
      quality_mode: options.quality_mode,
      crf: options.crf,
      loop: options.loop,
      target_size_mb: options.target_size_mb,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || '변환 요청 실패');
  }
  return data.job_id;
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || '작업 상태 조회 실패');
  }
  return data;
}

export async function openFolder(jobId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/open-folder/${jobId}`, { method: 'POST' });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
}

export async function shutdownServer(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/shutdown`, { method: 'POST' });
    return res.ok;
  } catch {
    return true; // 서버가 바로 꺼져서 fetch가 끊겨도 성공으로 간주
  }
}
