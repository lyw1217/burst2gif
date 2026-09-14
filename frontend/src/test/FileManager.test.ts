import { describe, it, expect } from 'vitest';
import { naturalSortKey, compareNatural, formatBytes, SUPPORTED_EXTENSIONS } from '../modules/FileManager';

describe('FileManager Module', () => {
  it('자연수 정렬 키 생성 검증 (img1 vs img10)', () => {
    const key1 = naturalSortKey('img1.jpg');
    const key10 = naturalSortKey('img10.jpg');

    expect(key1).toEqual(['img', 1, '.jpg']);
    expect(key10).toEqual(['img', 10, '.jpg']);
  });

  it('자연수 정렬 시 dsc0001, dsc0002, dsc0010 순으로 정렬되어야 한다', () => {
    const filenames = ['dsc0010.jpg', 'dsc0002.jpg', 'dsc0001.jpg', 'dsc0020.jpg'];
    const sorted = [...filenames].sort(compareNatural);

    expect(sorted).toEqual(['dsc0001.jpg', 'dsc0002.jpg', 'dsc0010.jpg', 'dsc0020.jpg']);
  });

  it('formatBytes 단위 변환이 정확해야 한다', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
  });

  it('BMP 확장자가 지원 확장자에서 안전하게 제외되었는지 검증', () => {
    expect(SUPPORTED_EXTENSIONS).toContain('.jpg');
    expect(SUPPORTED_EXTENSIONS).toContain('.png');
    expect(SUPPORTED_EXTENSIONS).toContain('.webp');
    expect(SUPPORTED_EXTENSIONS).not.toContain('.bmp');
  });
});
