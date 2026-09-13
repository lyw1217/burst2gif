export interface ImageDimensions {
  width: number;
  height: number;
  orientation?: number; // EXIF Orientation 1~8
}

/**
 * 이미지 파일의 앞 256KB만 비동기로 읽어 빠르게 width, height, orientation을 파싱합니다.
 * 소니/캐논/스마트폰 등의 거대한 EXIF/썸네일이 포함된 20~50MB 사진도 디코딩 없이 1ms 미만에 치수를 파악합니다.
 */
export async function parseImageDimensions(file: File): Promise<ImageDimensions> {
  const sliceSize = Math.min(file.size, 262144); // 256KB
  const buffer = await file.slice(0, sliceSize).arrayBuffer();
  const view = new DataView(buffer);

  // 1. PNG 판별 (89 50 4E 47 0D 0A 1A 0A)
  if (view.byteLength >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return { width, height };
  }

  // 2. WebP 판별 (RIFF .... WEBP)
  if (
    view.byteLength >= 30 &&
    view.getUint32(0) === 0x52494646 && // 'RIFF'
    view.getUint32(8) === 0x57454250    // 'WEBP'
  ) {
    const tag = view.getUint32(12);
    // VP8 (손실 압축)
    if (tag === 0x56503820 && view.byteLength >= 30) {
      const width = view.getUint16(26, true) & 0x3fff;
      const height = view.getUint16(28, true) & 0x3fff;
      return { width, height };
    }
    // VP8L (무손실 압축)
    if (tag === 0x5650384c && view.byteLength >= 25) {
      const b1 = view.getUint8(21);
      const b2 = view.getUint8(22);
      const b3 = view.getUint8(23);
      const b4 = view.getUint8(24);
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0xf) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { width, height };
    }
    // VP8X (확장 형식)
    if (tag === 0x56503858 && view.byteLength >= 30) {
      const width = 1 + (view.getUint8(24) | (view.getUint8(25) << 8) | (view.getUint8(26) << 16));
      const height = 1 + (view.getUint8(27) | (view.getUint8(28) << 8) | (view.getUint8(29) << 16));
      return { width, height };
    }
  }

  // 3. JPEG 판별 (FF D8)
  if (view.byteLength >= 4 && view.getUint16(0) === 0xffd8) {
    let offset = 2;
    let orientation = 1;
    let width = 0;
    let height = 0;

    while (offset < view.byteLength - 4) {
      if (view.getUint8(offset) !== 0xff) {
        offset++;
        continue;
      }

      const marker = view.getUint8(offset + 1);
      offset += 2;

      // 엔드 마커 (SOS, EOI)
      if (marker === 0xda || marker === 0xd9) break;

      const length = view.getUint16(offset, false);
      if (length < 2) break;

      // APP1 (EXIF 메타데이터)
      if (marker === 0xe1 && offset + 14 <= view.byteLength) {
        if (view.getUint32(offset + 2, false) === 0x45786966 && view.getUint16(offset + 6, false) === 0) {
          const tiffStart = offset + 8;
          if (tiffStart + 8 <= view.byteLength) {
            const isLE = view.getUint16(tiffStart, false) === 0x4949; // 'II' = 리틀 엔디안
            const ifdOffset = view.getUint32(tiffStart + 4, isLE);
            let dirStart = tiffStart + ifdOffset;

            if (dirStart + 2 <= view.byteLength) {
              const entries = view.getUint16(dirStart, isLE);
              dirStart += 2;
              for (let i = 0; i < entries && dirStart + 12 <= view.byteLength; i++) {
                const tag = view.getUint16(dirStart, isLE);
                if (tag === 0x0112) {
                  // Orientation Tag
                  orientation = view.getUint16(dirStart + 8, isLE);
                  break;
                }
                dirStart += 12;
              }
            }
          }
        }
      }

      // SOF0 ~ SOF3, SOF5 ~ SOF7, SOF9 ~ SOF11, SOF13 ~ SOF15 (Start of Frame)
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        height = view.getUint16(offset + 3, false);
        width = view.getUint16(offset + 5, false);
        break;
      }

      offset += length;
    }

    if (width > 0 && height > 0) {
      // EXIF 회전 5, 6, 7, 8은 90도 또는 270도 회전이므로 브라우저 렌더링 시 가로/세로가 바뀜
      if (orientation >= 5 && orientation <= 8) {
        return { width: height, height: width, orientation };
      }
      return { width, height, orientation };
    }
  }

  // 4. Fallback: 브라우저 createImageBitmap 사용
  const bmp = await createImageBitmap(file);
  const result = { width: bmp.width, height: bmp.height };
  bmp.close();
  return result;
}
