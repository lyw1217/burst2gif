import { describe, it, expect } from 'vitest';
import { parseImageDimensions } from '../modules/ImageHeaderParser';

describe('ImageHeaderParser Module', () => {
  it('PNG 매직 넘버 및 가로/세로 바이트 파싱 검증', async () => {
    // PNG 시그니처 (8바이트) + IHDR 청크 (길이 4, 타입 4, 폭 4, 높이 4 ...)
    const buffer = new Uint8Array(32);
    const view = new DataView(buffer.buffer);

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    view.setUint32(0, 0x89504e47);
    view.setUint32(4, 0x0d0a1a0a);
    // Width = 1920 (0x0780), Height = 1080 (0x0438) at offset 16 and 20
    view.setUint32(16, 1920);
    view.setUint32(20, 1080);

    const fakeFile = new File([buffer], 'test.png', { type: 'image/png' });
    const dims = await parseImageDimensions(fakeFile);

    expect(dims.width).toBe(1920);
    expect(dims.height).toBe(1080);
  });

  it('WebP VP8 손실 압축 매직 넘버 및 치수 파싱 검증', async () => {
    const buffer = new Uint8Array(40);
    const view = new DataView(buffer.buffer);

    // 'RIFF'
    view.setUint32(0, 0x52494646);
    // 'WEBP'
    view.setUint32(8, 0x57454250);
    // 'VP8 '
    view.setUint32(12, 0x56503820);

    // VP8 width at offset 26 (14-bit), height at offset 28 (14-bit)
    view.setUint16(26, 1280, true);
    view.setUint16(28, 720, true);

    const fakeFile = new File([buffer], 'test.webp', { type: 'image/webp' });
    const dims = await parseImageDimensions(fakeFile);

    expect(dims.width).toBe(1280);
    expect(dims.height).toBe(720);
  });
});
