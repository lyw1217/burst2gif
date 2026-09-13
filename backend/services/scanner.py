import os
import re
from pathlib import Path
from typing import List, Dict, Any
from config import SUPPORTED_EXTENSIONS

def natural_sort_key(s: str):
    """자연스러운 숫자 정렬을 위한 키 함수 (예: img_2.jpg 가 img_10.jpg 보다 앞에 옴)"""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def format_size(size_bytes: int) -> str:
    """바이트 크기를 읽기 쉬운 형식(KB, MB, GB)으로 변환"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def scan_directory(dir_path_str: str) -> List[Dict[str, Any]]:
    """지정된 로컬 디렉토리 내의 이미지 파일들을 스캔하고 자연수 순서로 정렬하여 반환"""
    dir_path = Path(dir_path_str.strip('\'" '))
    
    if not dir_path.exists():
        raise FileNotFoundError(f"경로를 찾을 수 없습니다: {dir_path_str}")
    if not dir_path.is_dir():
        raise NotADirectoryError(f"해당 경로는 폴더가 아닙니다: {dir_path_str}")
        
    image_files = []
    for entry in os.scandir(dir_path):
        if entry.is_file():
            ext = Path(entry.name).suffix.lower()
            if ext in SUPPORTED_EXTENSIONS:
                stat = entry.stat()
                image_files.append({
                    "id": f"{entry.name}_{stat.st_mtime}",
                    "filename": entry.name,
                    "path": str(Path(entry.path).resolve()),
                    "size_bytes": stat.st_size,
                    "size_formatted": format_size(stat.st_size),
                    "mtime": stat.st_mtime
                })
                
    # 파일명 기준 자연수 정렬
    image_files.sort(key=lambda x: natural_sort_key(x["filename"]))
    return image_files
