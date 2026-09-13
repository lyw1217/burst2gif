import os
import uuid
import subprocess
import mimetypes
from pathlib import Path
from typing import List, Optional

# Windows 레지스트리 이슈로 인해 .js 파일이 text/plain으로 서빙되어 스크립트 실행이 차단되는 문제 방지
mimetypes.init()
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from config import TEMP_DIR, OUTPUT_DIR, BASE_DIR, SUPPORTED_EXTENSIONS
from services.scanner import scan_directory, format_size, natural_sort_key
from services.thumbnail import get_thumbnail_path
from services.encoder import jobs, EncodingJob, run_encode, is_any_job_running

app = FastAPI(title="Burst2Gif API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 로컬 개발 환경에서 브라우저가 이전 정적 파일을 캐시하지 않도록 no-cache 헤더 추가
@app.middleware("http")
async def add_no_cache_header(request, call_next):
    response = await call_next(request)
    if not request.url.path.startswith("/api/thumbnail"):
        # 썸네일 외의 HTML/JS/CSS는 항상 최신본을 읽도록 캐시 비활성화
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

def cleanup_temp_files():
    """드래그 앤 드롭 임시 업로드 파일 및 썸네일 캐시 초기화"""
    import shutil
    try:
        if TEMP_DIR.exists():
            for item in TEMP_DIR.iterdir():
                try:
                    if item.is_dir():
                        shutil.rmtree(item, ignore_errors=True)
                    else:
                        item.unlink(missing_ok=True)
                except Exception as e:
                    print(f"[Cleanup Note] 임시 파일 삭제 실패 ({item.name}): {e}")
            print("[Burst2Gif] 임시 업로드 폴더(data/temp)가 초기화되었습니다.")
    except Exception as e:
        print(f"[Cleanup Error] {e}")

    try:
        from config import THUMB_CACHE_DIR
        if THUMB_CACHE_DIR.exists():
            for item in THUMB_CACHE_DIR.iterdir():
                try:
                    if item.is_file():
                        item.unlink(missing_ok=True)
                except Exception:
                    pass
            print("[Burst2Gif] 썸네일 캐시(data/thumbnails)가 초기화되었습니다.")
    except Exception as e:
        print(f"[Cleanup Error] {e}")

import atexit
atexit.register(cleanup_temp_files)

@app.on_event("startup")
async def on_startup():
    """서버 시작 시 이전 잔여 임시 파일 완전 초기화"""
    cleanup_temp_files()

@app.on_event("shutdown")
async def on_shutdown():
    """서버 정상 종료 시 임시 파일 정리"""
    cleanup_temp_files()

# Pydantic 모델
class ScanRequest(BaseModel):
    folder_path: str

class ConvertRequest(BaseModel):
    image_paths: List[str]
    format: str = "gif" # "gif" or "mp4"
    fps: float = 12.0
    resolution: str = "1080" # "original", "1080", "720", "480", or width
    quality_mode: str = "high" # "high" or "fast"
    crf: int = 23
    loop: int = 0
    target_size_mb: Optional[float] = None

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.post("/api/shutdown")
async def api_shutdown():
    """서버 프로세스 안전 종료 및 임시 파일 청소"""
    cleanup_temp_files()
    import threading
    import time
    def delayed_exit():
        time.sleep(0.5)
        os._exit(0)

    threading.Thread(target=delayed_exit, daemon=True).start()
    return {"success": True, "message": "서버가 안전하게 종료되었습니다."}

@app.post("/api/scan")
async def api_scan(request: ScanRequest):
    """로컬 디렉토리 경로를 받아 내부의 지원 이미지들을 정렬하여 반환"""
    try:
        images = scan_directory(request.folder_path)
        return {"success": True, "count": len(images), "images": images}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/upload")
async def api_upload(files: List[UploadFile] = File(...)):
    """웹 UI에서 드래그 앤 드롭한 이미지 파일들을 업로드받아 임시 저장 후 메타데이터 반환"""
    upload_session_id = str(uuid.uuid4())[:8]
    session_dir = TEMP_DIR / f"upload_{upload_session_id}"
    session_dir.mkdir(parents=True, exist_ok=True)

    saved_images = []
    for file in files:
        ext = Path(file.filename).suffix.lower()
        # ARW, CR2, NEF 등 RAW 및 비지원 확장자는 자동 제외
        if ext not in SUPPORTED_EXTENSIONS:
            continue

        file_path = session_dir / file.filename
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        stat = file_path.stat()
        saved_images.append({
            "id": f"{file.filename}_{stat.st_mtime}",
            "filename": file.filename,
            "path": str(file_path.resolve()),
            "size_bytes": stat.st_size,
            "size_formatted": format_size(stat.st_size),
            "mtime": stat.st_mtime
        })

    if not saved_images:
        raise HTTPException(
            status_code=400,
            detail="업로드된 파일 중 지원되는 이미지(JPG, PNG, WEBP)가 없습니다. (RAW 파일은 지원되지 않습니다)"
        )

    saved_images.sort(key=lambda x: natural_sort_key(x["filename"]))
    return {"success": True, "count": len(saved_images), "images": saved_images}

@app.get("/api/thumbnail")
async def api_thumbnail(path: str = Query(...)):
    """대용량 원본 파일에 대한 경량 썸네일(WebP) 생성 및 반환"""
    try:
        thumb_path = get_thumbnail_path(path)
        return FileResponse(thumb_path, media_type="image/webp")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"썸네일 생성 실패: {str(e)}")

@app.post("/api/convert")
async def api_convert(request: ConvertRequest, background_tasks: BackgroundTasks):
    """인코딩 작업 시작 (비동기 처리)"""
    if not request.image_paths:
        raise HTTPException(status_code=400, detail="선택된 이미지가 없습니다.")

    if is_any_job_running():
        raise HTTPException(
            status_code=409,
            detail="현재 다른 인코딩 작업이 백그라운드에서 진행 중입니다. 잠시만 기다려 주세요."
        )

    job_id = str(uuid.uuid4())
    job = EncodingJob(job_id, output_format=request.format)
    jobs[job_id] = job

    # 백그라운드 태스크로 인코딩 실행
    background_tasks.add_task(
        run_encode,
        job_id=job_id,
        image_paths=request.image_paths,
        output_format=request.format,
        fps=request.fps,
        resolution=request.resolution,
        quality_mode=request.quality_mode,
        crf=request.crf,
        loop=request.loop,
        target_size_mb=request.target_size_mb
    )

    return {"job_id": job_id, "status": "queued"}

@app.get("/api/jobs/{job_id}")
async def api_job_status(job_id: str):
    """작업 진행률 및 상태 확인"""
    clean_id = job_id.split(".")[0]
    job = jobs.get(clean_id)
    if not job:
        raise HTTPException(status_code=404, detail="해당 작업을 찾을 수 없습니다.")

    ext = job.output_format
    return {
        "job_id": job.job_id,
        "format": ext,
        "status": job.status,
        "progress": job.progress,
        "size_bytes": job.file_size_bytes,
        "size_formatted": format_size(job.file_size_bytes) if job.file_size_bytes else "0 B",
        "error_message": job.error_message,
        "download_url": f"/api/download/{job.job_id}.{ext}" if job.status == "completed" else None
    }

@app.get("/api/download/{job_id}")
async def api_download(job_id: str):
    """완료된 GIF/MP4 파일 다운로드"""
    clean_id = job_id.split(".")[0]
    job = jobs.get(clean_id)
    if not job or not job.output_file or not job.output_file.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    media_type = "image/gif" if job.output_file.suffix.lower() == ".gif" else "video/mp4"
    return FileResponse(
        job.output_file,
        media_type=media_type,
        filename=job.output_file.name
    )

@app.post("/api/open-folder/{job_id}")
async def api_open_folder(job_id: str):
    """로컬 파일 관리자(Windows 탐색기 / macOS Finder / Linux)에서 결과 파일 위치 열기"""
    job = jobs.get(job_id)
    if not job or not job.output_file or not job.output_file.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    try:
        import platform
        system = platform.system()
        target_path = str(job.output_file.resolve())

        if system == "Windows":
            subprocess.run(["explorer", f"/select,{target_path}"], check=False)
        elif system == "Darwin":  # macOS
            subprocess.run(["open", "-R", target_path], check=False)
        else:  # Linux
            subprocess.run(["xdg-open", str(job.output_file.parent.resolve())], check=False)

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

# 프론트엔드 정적 빌드 파일 서빙 (dist가 있을 때)
DIST_DIR = BASE_DIR.parent / "frontend" / "dist"
if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
