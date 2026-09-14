/**
 * 고화질 GIF 인코딩을 위한 Floyd-Steinberg 오차 확산 디더링 모듈
 * 256색 팔레트의 그라데이션 밴딩 현상을 완화하고 사진의 계조를 부드럽게 재현합니다.
 */

function clamp(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

/**
 * 24비트 RGB와 가장 유클리드 거리가 가까운 팔레트 인덱스를 검색합니다.
 * (자주 쓰이는 색상 조회를 위해 16비트 rgb565 간이 캐시 활용)
 */
export function createPaletteMatcher(palette: number[][]) {
  const cache = new Int16Array(65536).fill(-1);

  return function findNearest(r: number, g: number, b: number): number {
    const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    const cached = cache[key];
    if (cached !== -1) return cached;

    let bestDist = Infinity;
    let bestIdx = 0;

    for (let i = 0; i < palette.length; i++) {
      const color = palette[i];
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
        if (dist === 0) break;
      }
    }

    cache[key] = bestIdx;
    return bestIdx;
  };
}

/**
 * RGBA 픽셀 버퍼에 Floyd-Steinberg 디더링을 적용하여 팔레트 색상 인덱스 배열(Uint8Array)을 생성합니다.
 */
export function applyFloydSteinbergDither(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  palette: number[][]
): Uint8Array {
  const totalPixels = width * height;
  const indexed = new Uint8Array(totalPixels);
  const matchColor = createPaletteMatcher(palette);

  // 현재 라인과 다음 라인의 RGB 누적 오차 버퍼 (signed float or 16-bit int)
  // [x * 3 + 0]: R, [x * 3 + 1]: G, [x * 3 + 2]: B
  const stride = width * 3;
  let currErr = new Float32Array(stride);
  let nextErr = new Float32Array(stride);

  for (let y = 0; y < height; y++) {
    nextErr.fill(0);
    const yOffset = y * width * 4;

    for (let x = 0; x < width; x++) {
      const pIdx = yOffset + (x * 4);
      const eIdx = x * 3;

      const r = clamp(Math.round(rgba[pIdx] + currErr[eIdx]), 0, 255);
      const g = clamp(Math.round(rgba[pIdx + 1] + currErr[eIdx + 1]), 0, 255);
      const b = clamp(Math.round(rgba[pIdx + 2] + currErr[eIdx + 2]), 0, 255);

      const colorIdx = matchColor(r, g, b);
      indexed[y * width + x] = colorIdx;

      const palColor = palette[colorIdx];
      const errR = r - palColor[0];
      const errG = g - palColor[1];
      const errB = b - palColor[2];

      // Floyd-Steinberg 분배
      // x+1, y   : 7/16
      if (x + 1 < width) {
        currErr[(x + 1) * 3] += (errR * 7) / 16;
        currErr[(x + 1) * 3 + 1] += (errG * 7) / 16;
        currErr[(x + 1) * 3 + 2] += (errB * 7) / 16;
      }
      // x-1, y+1 : 3/16
      if (x - 1 >= 0 && y + 1 < height) {
        nextErr[(x - 1) * 3] += (errR * 3) / 16;
        nextErr[(x - 1) * 3 + 1] += (errG * 3) / 16;
        nextErr[(x - 1) * 3 + 2] += (errB * 3) / 16;
      }
      // x,   y+1 : 5/16
      if (y + 1 < height) {
        nextErr[x * 3] += (errR * 5) / 16;
        nextErr[x * 3 + 1] += (errG * 5) / 16;
        nextErr[x * 3 + 2] += (errB * 5) / 16;
      }
      // x+1, y+1 : 1/16
      if (x + 1 < width && y + 1 < height) {
        nextErr[(x + 1) * 3] += (errR * 1) / 16;
        nextErr[(x + 1) * 3 + 1] += (errG * 1) / 16;
        nextErr[(x + 1) * 3 + 2] += (errB * 1) / 16;
      }
    }

    // 버퍼 스왑
    const temp = currErr;
    currErr = nextErr;
    nextErr = temp;
  }

  return indexed;
}
