#!/usr/bin/env bash
# ============================================================
#   Burst2Gif - macOS / Linux Runner
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo "============================================================"
echo "  Starting Burst2Gif on macOS / Linux..."
echo "  Local Web Server: http://localhost:8000"
echo "============================================================"
echo ""

# 1. FFmpeg 설치 점검
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  [WARNING] FFmpeg is not installed or not in PATH."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   Please install FFmpeg using Homebrew:"
        echo "   $ brew install ffmpeg"
    else
        echo "   Please install FFmpeg using your package manager (e.g., sudo apt install ffmpeg)"
    fi
    echo ""
fi

# 2. Python 3 탐색
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ [ERROR] Python 3 is not installed or not found in PATH."
    echo "   Please install Python 3.10 or higher."
    exit 1
fi

# 3. 가상환경 세팅 및 의존성 설치
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
    echo "📦 [SETUP] Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
    echo "✅ [SETUP] Virtual environment ready!"
    echo ""
fi

# 4. 브라우저 자동 오픈 (macOS: open, Linux: xdg-open)
if command -v open &> /dev/null; then
    (sleep 1.5 && open "http://localhost:8000") &
elif command -v xdg-open &> /dev/null; then
    (sleep 1.5 && xdg-open "http://localhost:8000") &
fi

# 5. 서버 실행
echo "🚀 Starting server at http://127.0.0.1:8000 ..."
./venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
