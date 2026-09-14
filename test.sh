#!/usr/bin/env bash
# ============================================================
#   Burst2Gif - Automated Integrity Tests (macOS / Linux)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "============================================================"
echo "  Burst2Gif Automated Integrity Tests (macOS / Linux)"
echo "============================================================"
echo ""

cd "$FRONTEND_DIR"

if command -v npm &> /dev/null; then
    echo "[1/3] Running Vitest unit test suite..."
    npm test
    echo "✅ [1/3] Unit tests passed!"
    echo ""

    echo "[2/3] Checking TypeScript type integrity..."
    npm run typecheck
    echo "✅ [2/3] TypeScript checks passed!"
    echo ""

    echo "[3/3] Checking production bundle build..."
    npm run build
    echo "✅ [3/3] Production build check passed!"
    echo ""
else
    echo "❌ [ERROR] npm is not installed or not in PATH."
    exit 1
fi

echo "============================================================"
echo "  🎉 [SUCCESS] All Burst2Gif automated tests passed!"
echo "============================================================"
