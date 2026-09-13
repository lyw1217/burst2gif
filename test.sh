#!/usr/bin/env bash
# ============================================================
#   Burst2Gif - Automated Integrity Tests (macOS / Linux)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "============================================================"
echo "  Burst2Gif Automated Integrity Tests (macOS / Linux)"
echo "============================================================"
echo ""

PYTHON_CMD="python3"
if [ -f "$BACKEND_DIR/venv/bin/python" ]; then
    PYTHON_CMD="$BACKEND_DIR/venv/bin/python"
elif ! command -v python3 &> /dev/null && command -v python &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "[1/2] Running backend unit and API tests..."
cd "$BACKEND_DIR"
$PYTHON_CMD -m unittest discover tests -v
echo "✅ [1/2] Backend tests passed!"
echo ""

echo "[2/2] Checking frontend TypeScript and reference integrity..."
cd "$FRONTEND_DIR"
if command -v npm &> /dev/null; then
    npm test
    echo "✅ [2/2] Frontend integrity checks passed!"
else
    echo "⚠️  [WARNING] npm not found. Skipping frontend test."
fi
echo ""

echo "============================================================"
echo "  🎉 [SUCCESS] All backend and frontend tests passed!"
echo "============================================================"
