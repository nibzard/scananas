#!/usr/bin/env bash
set -euo pipefail

echo "[FIM] Installing frontend deps and building..."
cd "$(dirname "$0")/.."/app

if command -v npm >/dev/null 2>&1; then
  PM=npm
else
  echo "npm is required" >&2
  exit 1
fi

$PM pkg set name="fim" >/dev/null
$PM pkg set version="0.0.1" >/dev/null

$PM install react react-dom
$PM install -D typescript vite @vitejs/plugin-react @tauri-apps/cli

$PM run build

echo "[FIM] Building Tauri backend..."
cd ../src-tauri
cargo build

echo "[FIM] Done. To run dev: in one terminal 'npm --prefix ../app run dev', in another 'npm --prefix ../app run tauri dev' or 'cargo tauri dev' if installed."

