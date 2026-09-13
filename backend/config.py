import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
TEMP_DIR = DATA_DIR / "temp"
THUMB_CACHE_DIR = DATA_DIR / "thumbnails"
OUTPUT_DIR = DATA_DIR / "outputs"

# Create directories if they do not exist
for dir_path in [DATA_DIR, TEMP_DIR, THUMB_CACHE_DIR, OUTPUT_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
