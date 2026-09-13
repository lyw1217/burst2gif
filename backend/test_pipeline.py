import os
import asyncio
import time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# 테스트 디렉토리 준비
TEST_DIR = Path(__file__).resolve().parent / "test_sample_burst"
TEST_DIR.mkdir(parents=True, exist_ok=True)

def generate_sample_burst_images(count: int = 8):
    """테스트용 고해상도(2560x1440) 연사 더미 이미지 생성"""
    print(f"[*] {count}장의 테스트용 연사 이미지를 생성합니다...")
    for i in range(1, count + 1):
        img_path = TEST_DIR / f"burst_{i:03d}.jpg"
        if img_path.exists():
            continue
        
        # 색상이 점진적으로 변하고 번호가 찍힌 고해상도 이미지
        color = (
            int(30 + (i * 25) % 200),
            int(80 + (i * 15) % 150),
            int(150 + (i * 12) % 100)
        )
        img = Image.new("RGB", (2560, 1440), color=color)
        draw = ImageDraw.Draw(img)
        
        # 큰 원과 텍스트
        circle_x = 200 + (i * 240)
        circle_y = 720
        draw.ellipse([circle_x - 120, circle_y - 120, circle_x + 120, circle_y + 120], fill=(255, 255, 255))
        
        img.save(img_path, "JPEG", quality=95)
        print(f"  - 생성 완료: {img_path.name} ({img_path.stat().st_size / 1024:.1f} KB)")

async def test_api_pipeline():
    from services.scanner import scan_directory
    from services.thumbnail import get_thumbnail_path
    from services.encoder import jobs, EncodingJob, run_encode

    generate_sample_burst_images(8)

    # 1. 스캔 테스트
    print("\n[1] 폴더 스캔 테스트...")
    images = scan_directory(str(TEST_DIR))
    print(f"  - 스캔된 사진 수: {len(images)}장")
    assert len(images) == 8, "스캔 결과 사진 수가 일치하지 않습니다."
    for img in images[:3]:
        print(f"    {img['filename']} | {img['size_formatted']} | {img['path']}")

    # 2. 썸네일 생성 테스트
    print("\n[2] 썸네일 캐시 생성 테스트...")
    first_img_path = images[0]["path"]
    thumb_path = get_thumbnail_path(first_img_path, max_size=480)
    print(f"  - 원본: {first_img_path}")
    print(f"  - 썸네일: {thumb_path} (크기: {thumb_path.stat().st_size / 1024:.1f} KB)")
    assert thumb_path.exists(), "썸네일 파일이 생성되지 않았습니다."

    # 3. GIF 변환 테스트
    print("\n[3] 고화질 2-Pass GIF 인코딩 테스트...")
    job_id_gif = "test-gif-job"
    jobs[job_id_gif] = EncodingJob(job_id_gif)
    
    await run_encode(
        job_id=job_id_gif,
        image_paths=[img["path"] for img in images],
        output_format="gif",
        fps=10.0,
        resolution="720",
        quality_mode="high",
        loop=0
    )

    gif_job = jobs[job_id_gif]
    print(f"  - GIF 상태: {gif_job.status}")
    print(f"  - GIF 파일: {gif_job.output_file}")
    print(f"  - GIF 크기: {gif_job.file_size_bytes / 1024:.1f} KB")
    assert gif_job.status == "completed", f"GIF 변환 실패: {gif_job.error_message}"

    # 4. MP4 변환 테스트
    print("\n[4] H.264 MP4 인코딩 테스트...")
    job_id_mp4 = "test-mp4-job"
    jobs[job_id_mp4] = EncodingJob(job_id_mp4)

    await run_encode(
        job_id=job_id_mp4,
        image_paths=[img["path"] for img in images],
        output_format="mp4",
        fps=10.0,
        resolution="1080",
        crf=23
    )

    mp4_job = jobs[job_id_mp4]
    print(f"  - MP4 상태: {mp4_job.status}")
    print(f"  - MP4 파일: {mp4_job.output_file}")
    print(f"  - MP4 크기: {mp4_job.file_size_bytes / 1024:.1f} KB")
    assert mp4_job.status == "completed", f"MP4 변환 실패: {mp4_job.error_message}"

    print("\n==========================================")
    print(">>> SUCCESS: All Pipeline Tests Passed!")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(test_api_pipeline())
