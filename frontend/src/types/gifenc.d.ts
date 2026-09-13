declare module 'gifenc' {
  export interface GIFEncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  export interface WriteFrameOptions {
    palette?: number[][];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
  }

  export interface GIFEncoder {
    writeFrame(
      index: Uint8Array | Uint8ClampedArray | number[],
      width: number,
      height: number,
      opts?: WriteFrameOptions
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
    stream: {
      buffer: Uint8Array;
      cursor: number;
    };
  }

  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoder;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray | number[],
    maxColors: number,
    opts?: {
      format?: 'rgb565' | 'rgb444' | 'rgba4444';
      clearAlpha?: boolean;
      clearAlphaThreshold?: number;
      clearAlphaColor?: number;
    }
  ): number[][];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray | number[],
    palette: number[][],
    format?: 'rgb565' | 'rgb444' | 'rgba4444'
  ): Uint8Array;
}
