/**
 * Bounded-Memory 파이프라인의 출력 저장소 추상화 인터페이스
 */
export interface OutputSink {
  write(chunk: Uint8Array): Promise<void>;
  getBytesWritten(): number;
  finalize(): Promise<Blob>;
  abort(): Promise<void>;
  isUsingOPFS(): boolean;
}

const MEMORY_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB (Memory Fallback 안전 한도)

/**
 * OPFS(Origin Private File System) 기반 디스크 스트리밍 싱크
 * 메모리를 전혀 소비하지 않고 브라우저 임시 스토리지에 즉시 기록
 */
export class OPFSOutputSink implements OutputSink {
  private fileHandle: FileSystemFileHandle | null = null;
  private writable: FileSystemWritableFileStream | null = null;
  private syncHandle: any = null; // FileSystemSyncAccessHandle in Workers if available
  private bytesWritten: number = 0;
  private filename: string;

  constructor(filename: string) {
    this.filename = filename;
  }

  async init(): Promise<void> {
    const root = await navigator.storage.getDirectory();
    this.fileHandle = await root.getFileHandle(this.filename, { create: true });

    // Worker 환경에서 createSyncAccessHandle이 지원되면 우선 사용
    if ('createSyncAccessHandle' in this.fileHandle && typeof (this.fileHandle as any).createSyncAccessHandle === 'function') {
      try {
        this.syncHandle = await (this.fileHandle as any).createSyncAccessHandle();
        return;
      } catch (e) {
        // fallback to createWritable
      }
    }

    if ('createWritable' in this.fileHandle) {
      this.writable = await this.fileHandle.createWritable();
    }
  }

  async write(chunk: Uint8Array): Promise<void> {
    if (this.syncHandle) {
      this.syncHandle.write(chunk, { at: this.bytesWritten });
      this.bytesWritten += chunk.byteLength;
    } else if (this.writable) {
      await (this.writable as any).write(chunk);
      this.bytesWritten += chunk.byteLength;
    } else {
      throw new Error('OPFS 스토리지 스트림이 초기화되지 않았습니다.');
    }
  }

  getBytesWritten(): number {
    return this.bytesWritten;
  }

  async finalize(): Promise<Blob> {
    if (this.syncHandle) {
      this.syncHandle.flush();
      this.syncHandle.close();
      this.syncHandle = null;
    }
    if (this.writable) {
      await this.writable.close();
      this.writable = null;
    }

    if (!this.fileHandle) {
      throw new Error('OPFS 파일 핸들을 찾을 수 없습니다.');
    }

    const file = await this.fileHandle.getFile();
    // 메모리로 올리지 않고 File(Blob 상속)을 그대로 반환
    return file;
  }

  async abort(): Promise<void> {
    try {
      if (this.syncHandle) {
        this.syncHandle.close();
        this.syncHandle = null;
      }
      if (this.writable) {
        await this.writable.abort();
        this.writable = null;
      }
      if (this.fileHandle) {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(this.filename).catch(() => {});
        this.fileHandle = null;
      }
    } catch (e) {
      // ignore cleanup errors
    }
  }

  isUsingOPFS(): boolean {
    return true;
  }
}

/**
 * OPFS 미지원 브라우저(구형 Safari 등)를 위한 Memory Fallback 싱크
 */
export class MemoryOutputSink implements OutputSink {
  private chunks: Uint8Array[] = [];
  private bytesWritten: number = 0;

  async write(chunk: Uint8Array): Promise<void> {
    this.bytesWritten += chunk.byteLength;
    if (this.bytesWritten > MEMORY_LIMIT_BYTES) {
      throw new Error(
        `메모리 기반 모드 한도(${MEMORY_LIMIT_BYTES / (1024 * 1024)}MB)를 초과했습니다. 더 작은 해상도를 선택해 주세요.`
      );
    }
    // 청크 복사본 보관
    this.chunks.push(new Uint8Array(chunk));
  }

  getBytesWritten(): number {
    return this.bytesWritten;
  }

  async finalize(): Promise<Blob> {
    const blob = new Blob(this.chunks as BlobPart[], { type: 'image/gif' });
    this.chunks = []; // 메모리 즉시 해제
    return blob;
  }

  async abort(): Promise<void> {
    this.chunks = [];
    this.bytesWritten = 0;
  }

  isUsingOPFS(): boolean {
    return false;
  }
}

/**
 * 사용 가능한 최적의 OutputSink 생성 팩토리
 */
export async function createOutputSink(): Promise<OutputSink> {
  const isOPFSSupported =
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    'getDirectory' in navigator.storage;

  if (isOPFSSupported) {
    try {
      const filename = `burst2gif-temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.tmp`;
      const sink = new OPFSOutputSink(filename);
      await sink.init();
      return sink;
    } catch (err) {
      console.warn('OPFS 초기화 실패, 메모리 폴백으로 전환:', err);
    }
  }

  return new MemoryOutputSink();
}

export async function checkStorageQuota(estimatedBytesNeeded: number = 200 * 1024 * 1024): Promise<{
  ok: boolean;
  availableBytes: number;
  message?: string;
}> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return { ok: true, availableBytes: Infinity };
  }

  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota !== undefined && usage !== undefined) {
      const available = quota - usage;
      if (available < estimatedBytesNeeded) {
        return {
          ok: false,
          availableBytes: available,
          message: `브라우저 임시 저장 공간이 부족합니다. (여유: ${(available / (1024 * 1024)).toFixed(0)}MB / 필요: ${(estimatedBytesNeeded / (1024 * 1024)).toFixed(0)}MB)`,
        };
      }
      return { ok: true, availableBytes: available };
    }
  } catch (e) {
    // ignore
  }

  return { ok: true, availableBytes: Infinity };
}

/**
 * 특정 OPFS 임시 파일 즉시 삭제
 */
export async function deleteOPFSTempFile(filename: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
    return;
  }
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(filename);
  } catch (e) {
    // ignore
  }
}

/**
 * 이전 세션에서 비정상 종료 등으로 남았을 수 있는 OPFS 임시 파일들 정리
 * 안전 보장: burst2gif-temp- 프리픽스를 가진 전용 임시 파일만 엄격히 제거
 */
export async function cleanupOldOPFSTempFiles(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
    return;
  }

  try {
    const root = await navigator.storage.getDirectory();
    // @ts-ignore
    for await (const [name, handle] of root.entries()) {
      if (name.startsWith('burst2gif-temp-')) {
        try {
          await root.removeEntry(name);
        } catch (e) {}
      }
    }
  } catch (e) {
    // ignore
  }
}
