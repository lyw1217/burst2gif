import unittest
import tempfile
import shutil
import mimetypes
from pathlib import Path
import sys
import io

# backend 디렉토리를 sys.path에 추가
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app
from services.encoder import jobs, EncodingJob


class TestAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_endpoint(self):
        """서버 헬스체크 엔드포인트 검증"""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_mimetypes_registered(self):
        """Windows 레지스트리 버그 방지를 위한 .js, .mjs, .css MIME 타입 명시 검증"""
        js_type, _ = mimetypes.guess_type("test.js")
        mjs_type, _ = mimetypes.guess_type("test.mjs")
        css_type, _ = mimetypes.guess_type("test.css")
        self.assertEqual(js_type, "application/javascript")
        self.assertEqual(mjs_type, "application/javascript")
        self.assertEqual(css_type, "text/css")

    def test_scan_api_success(self):
        """정상 폴더 스캔 API 검증"""
        temp_dir = Path(tempfile.mkdtemp(prefix="api_scan_"))
        try:
            (temp_dir / "test1.jpg").write_bytes(b"dummy1")
            (temp_dir / "test2.png").write_bytes(b"dummy2")
            (temp_dir / "ignored.arw").write_bytes(b"raw")

            response = self.client.post("/api/scan", json={"folder_path": str(temp_dir)})
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["count"], 2)
            self.assertEqual(len(data["images"]), 2)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_scan_api_invalid_path(self):
        """존재하지 않는 경로 요청 시 400 반환 검증"""
        response = self.client.post("/api/scan", json={"folder_path": "C:/invalid_non_existent_folder_999"})
        self.assertEqual(response.status_code, 400)

    def test_upload_api_success(self):
        """드래그 앤 드롭 파일 업로드 성공 및 임시 저장 검증"""
        file1 = ("photo1.jpg", io.BytesIO(b"fake image 1"), "image/jpeg")
        file2 = ("photo2.png", io.BytesIO(b"fake image 2"), "image/png")
        
        response = self.client.post(
            "/api/upload",
            files=[("files", file1), ("files", file2)]
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["count"], 2)
        self.assertEqual(len(data["images"]), 2)
        
        # 파일이 임시 디렉토리에 실제로 존재하는지 확인
        for img in data["images"]:
            self.assertTrue(Path(img["path"]).exists())

    def test_upload_api_reject_raw_only(self):
        """RAW 파일만 업로드된 경우 400 에러로 차단하는지 검증"""
        raw_file = ("sony_raw.arw", io.BytesIO(b"raw bytes"), "application/octet-stream")
        response = self.client.post(
            "/api/upload",
            files=[("files", raw_file)]
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("지원되는 이미지", response.json()["detail"])

    def test_convert_api_empty_images(self):
        """선택된 이미지가 없을 때 400 에러 검증"""
        response = self.client.post("/api/convert", json={"image_paths": []})
        self.assertEqual(response.status_code, 400)
        self.assertIn("선택된 이미지가 없습니다", response.json()["detail"])

    def test_convert_api_singleton_guard(self):
        """기존 인코딩 작업이 실행 중일 때 중복 요청 시 409 Conflict 차단 검증"""
        # 가짜 실행 중 작업 주입
        fake_job = EncodingJob("fake_active_job", "gif")
        fake_job.status = "running"
        jobs["fake_active_job"] = fake_job

        try:
            response = self.client.post("/api/convert", json={"image_paths": ["dummy.jpg"]})
            self.assertEqual(response.status_code, 409)
            self.assertIn("진행 중입니다", response.json()["detail"])
        finally:
            jobs.pop("fake_active_job", None)


if __name__ == "__main__":
    unittest.main()
