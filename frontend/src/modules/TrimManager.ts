import { ManagedFile } from './FileManager';

export interface TrimSelection {
  startId: string | null;
  endId: string | null;
}

/**
 * files 배열과 TrimSelection(startId, endId)을 바탕으로
 * 안전하고 일관된 [startIndex, endIndex]를 계산합니다.
 */
export function resolveTrimRange(
  files: ManagedFile[],
  trim: TrimSelection
): [number, number] {
  if (files.length === 0) {
    return [0, 0];
  }

  let startIdx = 0;
  let endIdx = files.length - 1;

  if (trim.startId) {
    const foundStart = files.findIndex((f) => f.id === trim.startId);
    if (foundStart !== -1) {
      startIdx = foundStart;
    }
  }

  if (trim.endId) {
    const foundEnd = files.findIndex((f) => f.id === trim.endId);
    if (foundEnd !== -1) {
      endIdx = foundEnd;
    }
  }

  if (startIdx > endIdx) {
    const min = Math.min(startIdx, endIdx);
    const max = Math.max(startIdx, endIdx);
    return [min, max];
  }

  return [startIdx, endIdx];
}

/**
 * 파일 하나를 삭제할 때 TrimSelection을 안전하게 보정합니다.
 * - 삭제된 사진이 시작점이나 끝점인 경우 가장 인접한 유효 사진으로 안전 폴백
 * - 남은 사진이 없으면 자동 리셋
 */
export function adjustTrimOnDelete(
  currentFiles: ManagedFile[],
  deletedIndex: number,
  currentTrim: TrimSelection
): TrimSelection {
  const deletedFile = currentFiles[deletedIndex];
  if (!deletedFile) return currentTrim;

  const remainingFiles = currentFiles.filter((_, i) => i !== deletedIndex);
  if (remainingFiles.length === 0) {
    return { startId: null, endId: null };
  }

  let nextStartId = currentTrim.startId;
  let nextEndId = currentTrim.endId;

  if (deletedFile.id === currentTrim.startId) {
    // 삭제된 자리에 새로 위치하게 된 파일, 없으면 남은 파일의 마지막 파일
    const fallbackIdx = Math.min(deletedIndex, remainingFiles.length - 1);
    nextStartId = remainingFiles[fallbackIdx].id;
  }

  if (deletedFile.id === currentTrim.endId) {
    // 삭제된 자리 이전 파일, 인덱스가 0보다 작으면 0
    const fallbackIdx = Math.max(0, Math.min(deletedIndex - 1, remainingFiles.length - 1));
    nextEndId = remainingFiles[fallbackIdx].id;
  }

  return {
    startId: nextStartId,
    endId: nextEndId,
  };
}

/**
 * 트리밍 구간 초기화 (전체 사진 선택 상태로 리셋)
 */
export function resetTrim(): TrimSelection {
  return { startId: null, endId: null };
}
