import { describe, it, expect } from 'vitest';
import { resolveTrimRange, adjustTrimOnDelete, resetTrim, TrimSelection } from '../modules/TrimManager';
import { ManagedFile } from '../modules/FileManager';

function createMockFiles(count: number): ManagedFile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `file-id-${i}`,
    name: `burst_${String(i + 1).padStart(3, '0')}.jpg`,
    file: new File([''], `burst_${String(i + 1).padStart(3, '0')}.jpg`, { type: 'image/jpeg' }),
    size: 1024,
    sizeFormatted: '1.0 KB',
    type: 'image/jpeg',
    isLandscape: true,
  }));
}

describe('TrimManager Module', () => {
  it('빈 파일 목록이 주어지면 [0, 0]을 반환해야 한다', () => {
    expect(resolveTrimRange([], { startId: null, endId: null })).toEqual([0, 0]);
  });

  it('기본 상태(null ID)일 때 전체 범위 [0, files.length - 1]을 반환해야 한다', () => {
    const files = createMockFiles(5);
    expect(resolveTrimRange(files, { startId: null, endId: null })).toEqual([0, 4]);
  });

  it('순서 변경(재정렬) 시에도 고유 File ID를 추적하여 구간을 유지해야 한다', () => {
    const files = createMockFiles(5); // id-0, id-1, id-2, id-3, id-4
    // 구간을 id-1(index 1) ~ id-3(index 3)으로 지정
    const trim: TrimSelection = {
      startId: 'file-id-1',
      endId: 'file-id-3',
    };

    expect(resolveTrimRange(files, trim)).toEqual([1, 3]);

    // 순서 역전 또는 재배열: [id-4, id-3, id-2, id-1, id-0]
    const reordered = [...files].reverse();
    // reordered에서 id-3은 index 1, id-1은 index 3
    // resolveTrimRange는 자동으로 min, max를 취해 [1, 3]으로 정규화
    expect(resolveTrimRange(reordered, trim)).toEqual([1, 3]);

    // 다른 재배열: [id-2, id-1, id-4, id-3, id-0]
    const customOrder = [files[2], files[1], files[4], files[3], files[0]];
    // id-1은 index 1, id-3은 index 3
    expect(resolveTrimRange(customOrder, trim)).toEqual([1, 3]);
  });

  it('시작/끝 구간 앞의 사진 삭제 시 구간의 사진들이 변함없이 유지되어야 한다', () => {
    const files = createMockFiles(6); // id-0, id-1, id-2, id-3, id-4, id-5
    const trim: TrimSelection = {
      startId: 'file-id-2', // 원래 index 2
      endId: 'file-id-4',   // 원래 index 4
    };

    // index 0의 사진을 삭제
    const updatedTrim = adjustTrimOnDelete(files, 0, trim);
    expect(updatedTrim.startId).toBe('file-id-2');
    expect(updatedTrim.endId).toBe('file-id-4');

    const remaining = files.filter((_, i) => i !== 0);
    // 남은 배열에서 id-2는 index 1, id-4는 index 3
    expect(resolveTrimRange(remaining, updatedTrim)).toEqual([1, 3]);
  });

  it('시작 사진 자체 삭제 시 가장 인접한 다음 유효 사진으로 안전하게 폴백되어야 한다', () => {
    const files = createMockFiles(5); // id-0, id-1, id-2, id-3, id-4
    const trim: TrimSelection = {
      startId: 'file-id-1', // index 1
      endId: 'file-id-3',   // index 3
    };

    // startId인 index 1 파일 삭제
    const updatedTrim = adjustTrimOnDelete(files, 1, trim);
    // index 1 자리에 새로 오게 된 사진은 원래 id-2
    expect(updatedTrim.startId).toBe('file-id-2');
    expect(updatedTrim.endId).toBe('file-id-3');

    const remaining = files.filter((_, i) => i !== 1);
    expect(resolveTrimRange(remaining, updatedTrim)).toEqual([1, 2]);
  });

  it('끝 사진 자체 삭제 시 가장 인접한 이전 유효 사진으로 안전하게 폴백되어야 한다', () => {
    const files = createMockFiles(5); // id-0, id-1, id-2, id-3, id-4
    const trim: TrimSelection = {
      startId: 'file-id-1', // index 1
      endId: 'file-id-3',   // index 3
    };

    // endId인 index 3 파일 삭제
    const updatedTrim = adjustTrimOnDelete(files, 3, trim);
    // index 3 자리 이전 사진인 id-2로 폴백
    expect(updatedTrim.startId).toBe('file-id-1');
    expect(updatedTrim.endId).toBe('file-id-2');

    const remaining = files.filter((_, i) => i !== 3);
    expect(resolveTrimRange(remaining, updatedTrim)).toEqual([1, 2]);
  });

  it('사진 전체 삭제 시 구간이 자동으로 null로 리셋되어야 한다', () => {
    const files = createMockFiles(1);
    const trim: TrimSelection = {
      startId: 'file-id-0',
      endId: 'file-id-0',
    };

    const updatedTrim = adjustTrimOnDelete(files, 0, trim);
    expect(updatedTrim).toEqual({ startId: null, endId: null });

    const manualReset = resetTrim();
    expect(manualReset).toEqual({ startId: null, endId: null });
  });
});
