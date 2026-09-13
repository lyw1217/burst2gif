import hashlib
from pathlib import Path
from PIL import Image, ImageOps
from config import THUMB_CACHE_DIR

def get_thumbnail_path(file_path_str: str, max_size: int = 480) -> Path:
    """
    고용량 이미지에 대한 경량 썸네일 캐시 파일 경로를 생성하고 반환.
    이미 캐시가 존재하면 그대로 반환하고, 없으면 생성.
    """
    file_path = Path(file_path_str)
    if not file_path.exists():
        raise FileNotFoundError(f"원본 파일을 찾을 수 없습니다: {file_path_str}")
        
    stat = file_path.stat()
    # 고유 캐시 키: 파일 절대경로 + 파일 크기 + 수정시각 + max_size
    cache_key = f"{file_path.resolve()}_{stat.st_size}_{stat.st_mtime}_{max_size}"
    cache_hash = hashlib.sha256(cache_key.encode("utf-8")).hexdigest()
    thumb_path = THUMB_CACHE_DIR / f"{cache_hash}.webp"
    
    if thumb_path.exists():
        return thumb_path
        
    try:
        with Image.open(file_path) as img:
            # EXIF 회전 정보 보정
            img = ImageOps.exif_transpose(img)
            # 썸네일 리사이즈
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # RGBA인 경우 RGB 변환 (WebP 저장 시 투명도 유지 가능하지만 JPEG 대비 WebP 80% 품질 최적화)
            if img.mode in ("RGBA", "LA") and thumb_path.suffix == ".jpg":
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background
            elif img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGB")
                
            img.save(thumb_path, "WEBP", quality=80, method=4)
            return thumb_path
    except Exception as e:
        print(f"[Thumbnail Error] {file_path_str}: {e}")
        raise
