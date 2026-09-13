export interface ManagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  sizeFormatted: string;
  type: string;
}

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
export const MAX_FILES = 1000;
export const MAX_SINGLE_FILE_SIZE = 250 * 1024 * 1024; // 250MB
export const MAX_TOTAL_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * 자연수 정렬 (img1, img2, img10 순서 보장)
 */
export function naturalSortKey(name: string): (string | number)[] {
  const parts: (string | number)[] = [];
  const regex = /(\d+|\D+)/g;
  let match;
  while ((match = regex.exec(name)) !== null) {
    const part = match[0];
    if (/^\d+$/.test(part)) {
      parts.push(parseInt(part, 10));
    } else {
      parts.push(part.toLowerCase());
    }
  }
  return parts;
}

export function compareNatural(a: string, b: string): number {
  const keyA = naturalSortKey(a);
  const keyB = naturalSortKey(b);
  const len = Math.min(keyA.length, keyB.length);

  for (let i = 0; i < len; i++) {
    const valA = keyA[i];
    const valB = keyB[i];

    if (typeof valA === 'number' && typeof valB === 'number') {
      if (valA !== valB) return valA - valB;
    } else {
      const strA = String(valA);
      const strB = String(valB);
      if (strA !== strB) return strA.localeCompare(strB);
    }
  }

  return keyA.length - keyB.length;
}

export interface ValidationResult {
  validFiles: ManagedFile[];
  rejectedCount: number;
  rejectedReasons: string[];
}

/**
 * 사용자 입력 파일 목록 검증 및 자연수 정렬
 */
export function filterAndSortFiles(rawFiles: File[]): ValidationResult {
  const validFiles: ManagedFile[] = [];
  const rejectedReasons: string[] = [];
  let rejectedCount = 0;
  let totalBytes = 0;

  for (const file of rawFiles) {
    const dotIndex = file.name.lastIndexOf('.');
    const ext = dotIndex !== -1 ? file.name.slice(dotIndex).toLowerCase() : '';

    // 1. 지원 포맷 검사
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      rejectedCount++;
      if (!rejectedReasons.includes('지원되지 않는 포맷 (RAW, HEIC 등 제외)')) {
        rejectedReasons.push('지원되지 않는 포맷 (RAW, HEIC 등 제외)');
      }
      continue;
    }

    // 2. 단일 파일 크기 한도 (250MB)
    if (file.size > MAX_SINGLE_FILE_SIZE) {
      rejectedCount++;
      if (!rejectedReasons.includes('단일 파일 250MB 초과')) {
        rejectedReasons.push('단일 파일 250MB 초과');
      }
      continue;
    }

    // 3. 총 파일 크기 한도 (10GB)
    if (totalBytes + file.size > MAX_TOTAL_FILE_SIZE) {
      rejectedCount++;
      if (!rejectedReasons.includes('총 용량 10GB 초과')) {
        rejectedReasons.push('총 용량 10GB 초과');
      }
      continue;
    }

    // 4. 최대 1000장 제한
    if (validFiles.length >= MAX_FILES) {
      rejectedCount++;
      if (!rejectedReasons.includes('최대 1,000장 초과')) {
        rejectedReasons.push('최대 1,000장 초과');
      }
      continue;
    }

    totalBytes += file.size;
    validFiles.push({
      id: `${file.name}_${file.size}_${file.lastModified}_${Math.random().toString(36).substring(2, 6)}`,
      file,
      name: file.name,
      size: file.size,
      sizeFormatted: formatBytes(file.size),
      type: file.type,
    });
  }

  // 파일명 기준 기본 자연수 정렬
  validFiles.sort((a, b) => compareNatural(a.name, b.name));

  return {
    validFiles,
    rejectedCount,
    rejectedReasons,
  };
}
