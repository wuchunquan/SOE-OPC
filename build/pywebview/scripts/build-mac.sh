#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "${SCRIPT_DIR}/../../.." && pwd )"
PYROOT="${REPO_ROOT}/pysrc"
WORKDIR="${REPO_ROOT}/build/pywebview/work/mac"
DISTDIR="${REPO_ROOT}/build/pywebview/release"
SPEC="${REPO_ROOT}/build/pywebview/spec/mac.spec"

echo "===================================="
echo "pywebview macOS build"
echo "===================================="
echo ""

echo "[1/3] Activating virtual environment..."
if [ -d "${PYROOT}/.venv" ]; then
    source "${PYROOT}/.venv/bin/activate"
    echo "Virtual environment activated."
else
    echo "Virtual environment not found: ${PYROOT}/.venv"
    exit 1
fi
echo ""

echo "[2/3] Cleaning old output..."
rm -rf "${DISTDIR}"
rm -rf "${WORKDIR}"
echo ""

echo "[3/3] Building pywebview desktop app with PyInstaller..."
pyinstaller --distpath "${DISTDIR}" --workpath "${WORKDIR}" "${SPEC}"

echo ""
echo "===================================="
echo "Build complete"
echo "===================================="
echo "Output directory: ${DISTDIR}"
echo ""
