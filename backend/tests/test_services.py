import unittest
import tempfile
import shutil
from pathlib import Path
import sys
import os

# backend 디렉토리를 sys.path에 추가
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from services.scanner import natural_sort_key, scan_directory, format_size
from services.encoder import get_scale_filter
from main import cleanup_temp_files
from config import TEMP_DIR, THUMB_CACHE_DIR


class TestServices(unittest.TestCase):
    def test_natural_sort_key(self):
        """파일명에 숫자가 포함된 경우 자연수 정렬(img1, img2, img10) 검증"""
        raw_names = ["dsc0010.jpg", "dsc0002.jpg", "dsc0001.jpg", "dsc0020.jpg", "dsc0003.jpg"]
        sorted_names = sorted(raw_names, key=natural_sort_key)
        self.assertEqual(
            sorted_names,
            ["dsc0001.jpg", "dsc0002.jpg", "dsc0003.jpg", "dsc0010.jpg", "dsc0020.jpg"]
        )

    def test_scan_directory_filters_and_sorts(self):
        """폴더 스캔 시 지원 확장자만 추출하고 자연수 정렬되는지, RAW 및 일반 텍스트는 제외되는지 검증"""
        temp_test_dir = Path(tempfile.mkdtemp(prefix="burst_test_scan_"))
        try:
            # 지원 파일 생성
            (temp_test_dir / "frame_2.jpg").write_bytes(b"dummy1")
            (temp_test_dir / "frame_1.png").write_bytes(b"dummy2")
            (temp_test_dir / "frame_10.webp").write_bytes(b"dummy3")
            
            # 비지원 파일 생성 (RAW 및 txt)
            (temp_test_dir / "frame_raw.arw").write_bytes(b"raw_data")
            (temp_test_dir / "frame_raw2.cr2").write_bytes(b"raw_data2")
            (temp_test_dir / "notes.txt").write_bytes(b"memo")
            (temp_test_dir / "script.py").write_bytes(b"code")

            results = scan_directory(str(temp_test_dir))
            
            # 지원되는 3개만 추출되어야 함
            self.assertEqual(len(results), 3)
            
            # 자연수 정렬 순서 확인 (frame_1 -> frame_2 -> frame_10)
            filenames = [r["filename"] for r in results]
            self.assertEqual(filenames, ["frame_1.png", "frame_2.jpg", "frame_10.webp"])
            
            # 각 항목의 필수 메타데이터 키 검증
            for item in results:
                self.assertIn("id", item)
                self.assertIn("filename", item)
                self.assertIn("path", item)
                self.assertIn("size_formatted", item)
        finally:
            shutil.rmtree(temp_test_dir, ignore_errors=True)

    def test_scan_directory_invalid_path(self):
        """존재하지 않는 폴더 스캔 시 FileNotFoundError 발생 검증"""
        with self.assertRaises(FileNotFoundError):
            scan_directory("C:/non_existent_folder_xyz_12345")

    def test_get_scale_filter(self):
        """H.264/GIF 해상도 필터 및 짝수 보정(홀수 픽셀 방지) 검증"""
        # 원본 해상도 유지 시 짝수 보정
        self.assertEqual(get_scale_filter("original"), "scale=trunc(iw/2)*2:trunc(ih/2)*2")
        self.assertEqual(get_scale_filter(""), "scale=trunc(iw/2)*2:trunc(ih/2)*2")
        
        # 특정 너비 지정 시 짝수 높이 자동 맞춤(-2)
        self.assertEqual(get_scale_filter("1080"), "scale='min(1080,iw)':-2")
        self.assertEqual(get_scale_filter("720"), "scale='min(720,iw)':-2")
        self.assertEqual(get_scale_filter("480"), "scale='min(480,iw)':-2")

    def test_cleanup_temp_files(self):
        """임시 파일 및 썸네일 캐시 삭제 정리 로직 검증"""
        # 임시 업로드 폴더 및 더미 파일 생성
        dummy_session = TEMP_DIR / "upload_unittest_dummy"
        dummy_session.mkdir(parents=True, exist_ok=True)
        (dummy_session / "dummy_image.jpg").write_bytes(b"dummy_bytes")
        
        # 더미 썸네일 파일 생성
        dummy_thumb = THUMB_CACHE_DIR / "dummy_thumb.webp"
        dummy_thumb.write_bytes(b"dummy_thumb_bytes")
        
        self.assertTrue(dummy_session.exists())
        self.assertTrue(dummy_thumb.exists())
        
        # 청소 함수 실행
        cleanup_temp_files()
        
        # 삭제 확인
        self.assertFalse(dummy_session.exists())
        self.assertFalse(dummy_thumb.exists())


if __name__ == "__main__":
    unittest.main()
