import { parseImageDimensions } from './ImageHeaderParser';

export interface ManagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  sizeFormatted: string;
  type: string;
  width?: number;
  height?: number;
  isLandscape?: boolean;
}

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
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

export const MAX_MEGAPIXELS = 150; // 150MP 초과 방어

/**
 * 사용자 입력 파일 목록 누적 검증 및 자연수 정렬 (중복 방지 & 150MP 초과 방어 포함)
 */
export async function filterAndSortFiles(
  rawFiles: File[],
  existingFiles: ManagedFile[] = []
): Promise<ValidationResult> {
  const validFiles: ManagedFile[] = [];
  const rejectedReasons: string[] = [];
  let rejectedCount = 0;

  // 1. 기존 파일 중복 체크용 Set 구성 (파일명 + 크기 + 수정시각)
  const existingSignatures = new Set(
    existingFiles.map((f) => `${f.file.name}_${f.file.size}_${f.file.lastModified}`)
  );
  const currentSignatures = new Set<string>();

  // 2. 기존 파일 총 누적 용량 및 개수
  let currentTotalBytes = existingFiles.reduce((acc, cur) => acc + cur.size, 0);
  const existingCount = existingFiles.length;

  for (const file of rawFiles) {
    const signature = `${file.name}_${file.size}_${file.lastModified}`;

    // A. 중복 파일 검사
    if (existingSignatures.has(signature) || currentSignatures.has(signature)) {
      rejectedCount++;
      if (!rejectedReasons.includes('이미 추가된 중복 사진 제외')) {
        rejectedReasons.push('이미 추가된 중복 사진 제외');
      }
      continue;
    }

    const dotIndex = file.name.lastIndexOf('.');
    const ext = dotIndex !== -1 ? file.name.slice(dotIndex).toLowerCase() : '';

    // B. 지원 포맷 검사
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      rejectedCount++;
      if (!rejectedReasons.includes('지원되지 않는 포맷 (RAW, HEIC 등 제외)')) {
        rejectedReasons.push('지원되지 않는 포맷 (RAW, HEIC 등 제외)');
      }
      continue;
    }

    // C. 단일 파일 크기 한도 (250MB)
    if (file.size > MAX_SINGLE_FILE_SIZE) {
      rejectedCount++;
      if (!rejectedReasons.includes('단일 파일 250MB 초과')) {
        rejectedReasons.push('단일 파일 250MB 초과');
      }
      continue;
    }

    // D. 누적 총 파일 크기 한도 (10GB)
    if (currentTotalBytes + file.size > MAX_TOTAL_FILE_SIZE) {
      rejectedCount++;
      if (!rejectedReasons.includes('누적 총 용량 10GB 초과')) {
        rejectedReasons.push('누적 총 용량 10GB 초과');
      }
      continue;
    }

    // E. 누적 최대 1,000장 제한
    if (existingCount + validFiles.length >= MAX_FILES) {
      rejectedCount++;
      if (!rejectedReasons.includes('누적 최대 1,000장 초과')) {
        rejectedReasons.push('누적 최대 1,000장 초과');
      }
      continue;
    }

    // F. 초경량 바이너리 헤더 파싱 및 초고화소(150MP) 사전 검증
    let parsedWidth = 0;
    let parsedHeight = 0;
    try {
      const dims = await parseImageDimensions(file);
      parsedWidth = dims.width;
      parsedHeight = dims.height;

      const totalPixels = parsedWidth * parsedHeight;
      if (totalPixels > MAX_MEGAPIXELS * 1_000_000) {
        rejectedCount++;
        if (!rejectedReasons.includes('150MP 초과 초고화소 사진 제외')) {
          rejectedReasons.push('150MP 초과 초고화소 사진 제외');
        }
        continue;
      }
    } catch (probeErr) {
      rejectedCount++;
      if (!rejectedReasons.includes('손상되었거나 읽을 수 없는 이미지 파일 제외')) {
        rejectedReasons.push('손상되었거나 읽을 수 없는 이미지 파일 제외');
      }
      continue;
    }

    currentSignatures.add(signature);
    currentTotalBytes += file.size;

    validFiles.push({
      id: `${file.name}_${file.size}_${file.lastModified}_${Math.random().toString(36).substring(2, 6)}`,
      file,
      name: file.name,
      size: file.size,
      sizeFormatted: formatBytes(file.size),
      type: file.type,
      width: parsedWidth,
      height: parsedHeight,
      isLandscape: parsedWidth >= parsedHeight,
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
