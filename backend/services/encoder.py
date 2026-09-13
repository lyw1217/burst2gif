import asyncio
import os
import math
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import Image
from config import OUTPUT_DIR, TEMP_DIR

class EncodingJob:
    def __init__(self, job_id: str, output_format: str = "gif"):
        self.job_id = job_id
        self.output_format = output_format.lower()
        self.status = "queued" # queued, running, completed, failed
        self.progress = 0
        self.output_file: Optional[Path] = None
        self.error_message: Optional[str] = None
        self.file_size_bytes: int = 0

jobs: Dict[str, EncodingJob] = {}

def is_any_job_running() -> bool:
    """현재 백그라운드에서 실행 중이거나 대기 중인 인코딩 작업이 있는지 확인"""
    return any(job.status in ("queued", "running") for job in jobs.values())

def get_scale_filter(resolution: str) -> str:
    """
    해상도 옵션에 따른 FFmpeg scale 필터 반환.
    홀수 픽셀로 인한 H.264 인코딩 에러를 방지하기 위해 짝수 보정(trunc) 포함.
    """
    if resolution == "original" or not resolution:
        return "scale=trunc(iw/2)*2:trunc(ih/2)*2"
    
    try:
        width = int(resolution)
        return f"scale='min({width},iw)':-2"
    except ValueError:
        return "scale=trunc(iw/2)*2:trunc(ih/2)*2"

async def execute_ffmpeg(cmd: List[str]) -> bool:
    """FFmpeg 명령어 비동기 실행"""
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        print(f"[FFmpeg Error]: {stderr.decode(errors='replace')}")
        return False
    return True

async def run_encode(
    job_id: str,
    image_paths: List[str],
    output_format: str, # "gif" or "mp4"
    fps: float,
    resolution: str, # "original", "1080", "720", "480", or custom width
    quality_mode: str = "high", # for gif: "high" (2-pass diff) or "fast"
    crf: int = 23, # for mp4
    loop: int = 0, # 0 = infinite
    target_size_mb: Optional[float] = None
):
    job = jobs.get(job_id)
    if not job:
        return

    job.status = "running"
    job.progress = 10

    concat_file = TEMP_DIR / f"concat_{job_id}.txt"
    frame_duration = 1.0 / max(fps, 0.1)

    try:
        # 1. Concat 파일 생성
        with open(concat_file, "w", encoding="utf-8") as f:
            f.write("ffconcat version 1.0\n")
            for img_path in image_paths:
                safe_path = str(Path(img_path).resolve()).replace("\\", "/").replace("'", "'\\''")
                f.write(f"file '{safe_path}'\n")
                f.write(f"duration {frame_duration:.4f}\n")
            if image_paths:
                last_path = str(Path(image_paths[-1]).resolve()).replace("\\", "/").replace("'", "'\\''")
                f.write(f"file '{last_path}'\n")

        job.progress = 25
        ext = "gif" if output_format.lower() == "gif" else "mp4"
        output_filename = f"burst_{job_id[:8]}.{ext}"
        output_path = OUTPUT_DIR / output_filename

        # 원본 해상도 확인
        first_img = Image.open(image_paths[0])
        orig_width, _ = first_img.size
        first_img.close()

        # ----------------------------------------------------
        # MP4 인코딩
        # ----------------------------------------------------
        if ext == "mp4":
            scale_filter = get_scale_filter(resolution)
            
            # 목표 용량 제한이 있는 경우: 비트레이트 기반 제어
            if target_size_mb and target_size_mb > 0:
                duration_sec = max(len(image_paths) * frame_duration, 0.5)
                target_bits = target_size_mb * 1024 * 1024 * 8 * 0.92 # 컨테이너 오버헤드 8% 차감
                bitrate_kbps = max(50, int((target_bits / duration_sec) / 1000))

                cmd = [
                    "ffmpeg", "-y",
                    "-f", "concat", "-safe", "0",
                    "-i", str(concat_file),
                    "-vf", f"{scale_filter},format=yuv420p",
                    "-c:v", "libx264",
                    "-b:v", f"{bitrate_kbps}k",
                    "-maxrate", f"{int(bitrate_kbps * 1.3)}k",
                    "-bufsize", f"{int(bitrate_kbps * 2)}k",
                    "-preset", "medium",
                    "-movflags", "+faststart",
                    str(output_path)
                ]
            else:
                # 기본 CRF 기반 고화질 인코딩
                cmd = [
                    "ffmpeg", "-y",
                    "-f", "concat", "-safe", "0",
                    "-i", str(concat_file),
                    "-vf", f"{scale_filter},format=yuv420p",
                    "-c:v", "libx264",
                    "-crf", str(crf),
                    "-preset", "medium",
                    "-movflags", "+faststart",
                    str(output_path)
                ]

            job.progress = 60
            success = await execute_ffmpeg(cmd)
            if not success:
                job.status = "failed"
                job.error_message = "MP4 인코딩에 실패했습니다."
                return

        # ----------------------------------------------------
        # GIF 인코딩 (적응형 목표 용량 최적화 포함)
        # ----------------------------------------------------
        else:
            current_res = resolution if resolution else "1080"
            scale_filter = get_scale_filter(current_res)

            def build_gif_cmd(s_filter: str, dither: str = "bayer:bayer_scale=4"):
                if quality_mode == "high" and dither != "none":
                    filter_complex = (
                        f"[0:v] {s_filter},split [a][b]; "
                        f"[a] palettegen=stats_mode=diff:max_colors=256 [p]; "
                        f"[b][p] paletteuse=dither={dither}"
                    )
                else:
                    filter_complex = (
                        f"[0:v] {s_filter},split [a][b]; "
                        f"[a] palettegen [p]; "
                        f"[b][p] paletteuse=dither=none"
                    )

                return [
                    "ffmpeg", "-y",
                    "-f", "concat", "-safe", "0",
                    "-i", str(concat_file),
                    "-filter_complex", filter_complex,
                    "-loop", str(loop),
                    str(output_path)
                ]

            # 1차 인코딩
            job.progress = 50
            cmd = build_gif_cmd(scale_filter)
            success = await execute_ffmpeg(cmd)
            if not success:
                job.status = "failed"
                job.error_message = "GIF 인코딩에 실패했습니다."
                return

            # 목표 용량 검사 및 적응형 2차/3차 리사이징
            if target_size_mb and target_size_mb > 0 and output_path.exists():
                target_bytes = target_size_mb * 1024 * 1024
                actual_bytes = output_path.stat().st_size

                if actual_bytes > target_bytes:
                    job.progress = 70
                    # 면적 비례식으로 새로운 타겟 해상도 산출 (안전마진 0.90)
                    scale_ratio = math.sqrt(target_bytes / actual_bytes) * 0.90
                    
                    # 현재 너비 추정
                    if current_res.isdigit():
                        base_w = min(int(current_res), orig_width)
                    else:
                        base_w = orig_width
                    
                    target_w = max(240, int(base_w * scale_ratio))
                    target_w = (target_w // 2) * 2 # 짝수 보정
                    new_scale_filter = f"scale='min({target_w},iw)':-2"

                    # 2차 인코딩 (적응형 리사이즈 적용)
                    cmd2 = build_gif_cmd(new_scale_filter)
                    await execute_ffmpeg(cmd2)

                    # 2차 결과 확인 후 여전히 넘을 경우 디더링을 none으로 낮춘 3차 보정
                    if output_path.exists() and output_path.stat().st_size > target_bytes:
                        job.progress = 85
                        cmd3 = build_gif_cmd(new_scale_filter, dither="none")
                        await execute_ffmpeg(cmd3)

        job.progress = 100
        job.status = "completed"
        job.output_file = output_path
        job.file_size_bytes = output_path.stat().st_size

    except Exception as e:
        print(f"[Encode Exception]: {e}")
        job.status = "failed"
        job.error_message = str(e)
    finally:
        if concat_file.exists():
            try:
                concat_file.unlink()
            except Exception:
                pass
