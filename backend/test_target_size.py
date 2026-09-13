import asyncio
from pathlib import Path
from services.scanner import scan_directory
from services.encoder import jobs, EncodingJob, run_encode

async def test_target_size():
    test_dir = Path(__file__).resolve().parent / "test_sample_burst"
    images = scan_directory(str(test_dir))
    image_paths = [img["path"] for img in images]

    print("=== [1] MP4 목표 용량 제어 테스트 (목표: 0.05 MB = 51.2 KB) ===")
    job_mp4 = "target-mp4-test"
    jobs[job_mp4] = EncodingJob(job_mp4)
    await run_encode(
        job_id=job_mp4,
        image_paths=image_paths,
        output_format="mp4",
        fps=10.0,
        resolution="1080",
        target_size_mb=0.05
    )
    mp4_job = jobs[job_mp4]
    mp4_size_kb = mp4_job.file_size_bytes / 1024
    print(f"  - MP4 결과 용량: {mp4_size_kb:.1f} KB (목표: <= 51.2 KB)")
    assert mp4_job.status == "completed", "MP4 작업 실패"
    assert mp4_size_kb <= 51.2 * 1.05, "MP4 목표 용량 초과"

    print("\n=== [2] GIF 목표 용량 제어 테스트 (목표: 0.03 MB = 30.7 KB) ===")
    job_gif = "target-gif-test"
    jobs[job_gif] = EncodingJob(job_gif)
    await run_encode(
        job_id=job_gif,
        image_paths=image_paths,
        output_format="gif",
        fps=10.0,
        resolution="1080",
        quality_mode="high",
        target_size_mb=0.03
    )
    gif_job = jobs[job_gif]
    gif_size_kb = gif_job.file_size_bytes / 1024
    print(f"  - GIF 결과 용량: {gif_size_kb:.1f} KB (목표: <= 30.7 KB)")
    assert gif_job.status == "completed", "GIF 작업 실패"
    assert gif_size_kb <= 30.7 * 1.05, "GIF 목표 용량 초과"

    print("\n>>> SUCCESS: Target size control tests passed perfectly!")

if __name__ == "__main__":
    asyncio.run(test_target_size())
