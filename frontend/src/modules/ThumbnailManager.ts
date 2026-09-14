/**
 * 온디맨드(On-demand) 초경량 썸네일 관리자
 * 1000장을 선택해도 한꺼번에 디코딩하지 않고, 화면에 보일 때만 160px로 작게 생성
 */
class ThumbnailManager {
  private cache = new Map<string, string>(); // fileId -> objectURL
  private pendingPromises = new Map<string, Promise<string>>();
  private activeCount = 0;
  private maxConcurrency = 2; // 메인 스레드 프리징 방지를 위해 동시 디코딩 2개로 제한
  private queue: Array<() => void> = [];

  private async acquireSlot(): Promise<void> {
    if (this.activeCount < this.maxConcurrency) {
      this.activeCount++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  private releaseSlot(): void {
    this.activeCount--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  /**
   * 지정된 파일에 대한 160px 썸네일 ObjectURL 반환 (캐시 있으면 즉시 반환)
   */
  async getThumbnail(id: string, file: File): Promise<string> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    const pending = this.pendingPromises.get(id);
    if (pending) return pending;

    const promise = (async () => {
      await this.acquireSlot();
      try {
        return await this.generateThumbnail(id, file);
      } finally {
        this.releaseSlot();
      }
    })();

    this.pendingPromises.set(id, promise);

    try {
      const url = await promise;
      return url;
    } finally {
      this.pendingPromises.delete(id);
    }
  }

  private async generateThumbnail(id: string, file: File): Promise<string> {
    try {
      // 1. 디코딩 시점에 긴 변 160px로 얼리 리사이즈
      // EXIF orientation 자동 보정 적용 (from-image 기본값)
      const bitmap = await createImageBitmap(file, {
        resizeWidth: 160,
        resizeQuality: 'low',
      });

      // 2. 가상 Canvas에 그리기
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        throw new Error('Canvas 2D context 생성 실패');
      }

      ctx.drawImage(bitmap, 0, 0);
      // 그래픽 메모리 즉시 명시적 해제
      bitmap.close();

      // 3. 초경량 WebP/JPEG Blob으로 변환
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', 0.7);
      });

      if (!blob) {
        throw new Error('썸네일 Blob 생성 실패');
      }

      const objectUrl = URL.createObjectURL(blob);
      this.cache.set(id, objectUrl);
      return objectUrl;
    } catch (err) {
      // 만약 createImageBitmap 옵션 미지원 등의 경우 fallback
      const fallbackUrl = URL.createObjectURL(file);
      this.cache.set(id, fallbackUrl);
      return fallbackUrl;
    }
  }

  /**
   * 특정 파일 썸네일 캐시 삭제
   */
  revoke(id: string) {
    const url = this.cache.get(id);
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    this.cache.delete(id);
  }

  /**
   * 전체 썸네일 메모리 해제
   */
  clear() {
    for (const url of this.cache.values()) {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    this.cache.clear();
    this.pendingPromises.clear();
  }
}

export const thumbnailManager = new ThumbnailManager();
