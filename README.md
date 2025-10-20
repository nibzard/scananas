# Freeform Idea Map (FIM)

Fast, low‑friction, freeform canvas for capturing, arranging, and lightly structuring ideas. macOS app using Tauri, fully offline, single‑file document with autosave.

## Prerequisites

- Rust toolchain: `rustup` with latest stable (`rustup update`)
- Node.js 18+ and package manager (npm/pnpm/yarn)
- macOS build deps: Xcode Command Line Tools (`xcode-select --install`)
- Tauri system deps: see https://tauri.app/start/prerequisites/

## Bootstrap (recommended)

Initialize a Tauri + Vite React (TypeScript) app in `app/` with Rust backend in `src-tauri/`.

- npm: `npm create tauri-app@latest app -- --template react-ts`
- pnpm: `pnpm create tauri-app app --template react-ts`
- yarn: `yarn create tauri-app app --template react-ts`

When prompted, select: Vite + React + TypeScript, package manager of choice, and Tauri.

## Run (after bootstrap)

From `app/` (or repo root if configured):

- Install: `npm install`
- Dev: `npm run tauri dev`
- Build: `npm run tauri build`

Or run the helper: `bash scripts/bootstrap.sh` (installs deps, builds frontend, compiles Rust).

## Repo Structure (target)

- `app/` — Frontend (Vite + React + TS)
- `src-tauri/` — Rust backend (Tauri commands, file I/O, exports)
- `SPECS.md` — Product/feature specification
- `TODO.md` — Task list and maintenance guide

## Next

- See `TODO.md` for MVP task breakdown and ownership.
- After the scaffold is created, lock down `tauri.conf.json` permissions (fs/dialog/shell only as needed).
