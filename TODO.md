# Freeform Idea Map — Engineering TODO

Status: **Major MVP milestone achieved**. Core functionality complete: note creation/editing/resizing, connections, selection, inspector panel, file I/O. Next: export system, advanced styling, file formats.

## 🎉 Recently Completed (Latest Session)

**Core Interactive Features:**
- ✅ **Note System**: Double-click creation, Enter/Esc editing, drag movement, resize handles (E/S/SE), Delete key
- ✅ **Connections**: Alt+drag between notes, visual dotted lines, auto-cleanup on note delete  
- ✅ **Selection**: Click, Shift+click, marquee selection, Alt+drag subtract mode
- ✅ **Inspector Panel**: Right sidebar with Note/Connection/Document tabs, live property editing
- ✅ **Navigation**: Mouse wheel zoom, Space+drag pan, cursor feedback, HiDPI support
- ✅ **File I/O**: JSON open/save with native dialogs, schema versioning

**Architecture & Foundation:**
- ✅ Tauri + React setup with TypeScript/Rust type synchronization
- ✅ Canvas rendering with proper transforms and hit testing
- ✅ Robust state management and component architecture

## Conventions

- Status: use `todo | in-progress | blocked | review | done`.
- Scope tags: `[mvp]`, `[post-mvp]`, `[tech]`, `[qa]`.
- IDs: prefix by area (e.g., `DM-1`, `CAN-3`). Keep stable.
- Owners: `@github-handle` or `unassigned`.
- Keep items one-line; details live in issues/PRs.
- Update status on merge; link PR/issue in the item.

## Work Areas & Tasks

### 0) Project & Build
- PB-1 [mvp] Setup Tauri + Vite React skeleton (universal macOS) — owner: @amp — status: done
- PB-2 [mvp] Configure `tauri.conf.json` permissions (fs/dialog/shell minimal) — owner: @amp — status: done
- PB-3 [mvp] Add CI for build/test/lint; macOS universal target — owner: unassigned — status: todo
- PB-4 [tech] Pre-commit formatting and linting (Rust + TS) — owner: unassigned — status: todo

### 1) Data Model & Persistence
- DM-1 [mvp] Define TS/Rust schemas for entities (Note, Connection, Shape, Stack, Styles, Document) — owner: @amp — status: done
- DM-2 [mvp] JSON serialization compatibility (`schemaVersion`) — owner: @amp — status: done
- DM-2.5 [tech] JSON Open/Save stubs via Tauri commands — owner: @amp — status: done
- DM-3 [mvp] `.fim` zip container I/O (board.json + /media) — owner: unassigned — status: todo
- DM-4 [mvp] Autosave every 30s + idle; recovery `.fim.recovery` — owner: unassigned — status: todo

### 2) Canvas, Rendering, Hit‑Testing
- CAN-1 [mvp] Render infinite canvas (zoom/pan) with Canvas2D/WebGL — owner: @amp — status: done
- CAN-2 [mvp] Retained scene graph + dirty-rect redraws — owner: unassigned — status: todo
- CAN-3 [mvp] Quad‑tree spatial index (notes/shapes/connectors) — owner: unassigned — status: todo
- CAN-4 [mvp] Zoom‑adaptive caches (text layout, thumbnails) — owner: unassigned — status: todo

### 3) Notes — Creation & Editing
- NOTE-1 [mvp] Double‑click create; auto-size to content; resize — owner: @amp — status: done (with resize handles)
- NOTE-2 [mvp] Edit mode toggles (Enter/Esc); multi‑line wraps — owner: @amp — status: done  
- NOTE-3 [mvp] Markdown‑lite parsing toggle (basic styles) — owner: unassigned — status: todo
- NOTE-4 [mvp] Duplicate/Delete with undo integration — owner: @amp — status: done (delete + connection cleanup)
- NOTE-5 [mvp] Fade toggle (50% alpha) — owner: @amp — status: done (via inspector)

### 4) Selection & Movement  
- SEL-1 [mvp] Click/shift additive selection; marquee subtract — owner: @amp — status: done
- SEL-2 [mvp] Nudge (1px / 10px with Shift) — owner: unassigned — status: todo
- SEL-3 [mvp] Movement mode (M) arrow-keys continuous nudge — owner: unassigned — status: todo
- SEL-4 [mvp] Shift-constrained drag (H/V) — owner: @amp — status: done (basic drag implemented)

### 5) Connections
- CON-1 [mvp] Drag note→note to create dotted connector — owner: @amp — status: done (Alt+drag)
- CON-2 [mvp] Styles: dotted/solid; arrows none/src/dst/both — owner: unassigned — status: todo (basic dotted implemented)
- CON-3 [mvp] Connection labels at midpoint; editable — owner: unassigned — status: todo
- CON-4 [mvp] Reconnect endpoints by dragging — owner: unassigned — status: todo
- CON-5 [mvp] Insert note on connector (split into two) — owner: unassigned — status: todo

### 6) Background Shapes (Groups)
- SHP-1 [mvp] Rect shapes with corner radius, label — owner: unassigned — status: todo
- SHP-2 [mvp] Magnetic move: overlap test and group translation — owner: unassigned — status: todo
- SHP-3 [mvp] Z‑order: shapes behind notes; handles on select — owner: unassigned — status: todo

### 7) Stacks
- STK-1 [mvp] Make/Unstack from selection; order by Y then X — owner: unassigned — status: todo
- STK-2 [mvp] Enter/Cmd+Enter add sibling; Tab indent/outdent — owner: unassigned — status: todo
- STK-3 [mvp] Align/Distribute within stack; same width/height — owner: unassigned — status: todo

### 8) Styles & Inspector
- INS-1 [mvp] Right sidebar with Note/Shape/Connection/Document tabs — owner: @amp — status: done (full inspector panel)
- INS-2 [mvp] Save/apply reusable Note Styles (drag chip) — owner: unassigned — status: todo
- INS-3 [mvp] Default styles persisted in document — owner: unassigned — status: todo
- INS-4 [mvp] Global appearance: background color/texture; font — owner: unassigned — status: todo

### 9) Images & Links
- IMG-1 [mvp] Drag‑drop PNG/JPEG/GIF; resizable frame, aspect — owner: unassigned — status: todo
- IMG-2 [mvp] Export images (selection/all) — owner: unassigned — status: todo
- LNK-1 [mvp] Detect and open http(s)/mailto/file links (Cmd+Click) — owner: unassigned — status: todo

### 10) Search & Selection Utilities
- SRCH-1 [mvp] Incremental find (notes + connection labels) — owner: unassigned — status: todo
- SRCH-2 [mvp] Select Connected Cluster — owner: unassigned — status: todo
- SRCH-3 [mvp] Select by Style / Select by Fade — owner: unassigned — status: todo

### 11) Zoom, Pan, Focus
- ZPF-1 [mvp] Wheel/pinch zoom at cursor; pan (space/middle) — owner: @amp — status: done (smooth zoom/pan)
- ZPF-2 [mvp] Quick Zoom (hold Z) store/restore zoom+center — owner: unassigned — status: todo
- ZPF-3 [mvp] Presets: 50/100/200; Fit Selection/Board; fullscreen — owner: unassigned — status: todo

### 12) Export & Print
- EXP-1 [mvp] PDF export (vector) with options — owner: unassigned — status: todo
- EXP-2 [mvp] PNG export (1x/2x/3x DPI) — owner: unassigned — status: todo
- EXP-3 [mvp] TXT/RTF/OPML export per ordering heuristics — owner: unassigned — status: todo
- PRN-1 [mvp] Native print dialog; scale‑to‑fit; posterize — owner: unassigned — status: todo

### 13) Undo / Redo
- UNDO-1 [mvp] Command stack; coalesce text edits — owner: unassigned — status: todo
- UNDO-2 [mvp] Operations: move, style change, connections, stacks, shapes — owner: unassigned — status: todo

### 14) Theming & Dark Mode
- THM-1 [mvp] Follow OS; per-document override — owner: unassigned — status: todo
- THM-2 [mvp] High-contrast accessibility theme — owner: unassigned — status: todo

### 15) Performance & Memory
- PERF-1 [mvp] 10k notes+connections at 60 FPS targets — owner: unassigned — status: todo
- PERF-2 [mvp] Memory < 500MB on large boards — owner: unassigned — status: todo

### 16) Accessibility & i18n
- A11Y-1 [mvp] Full keyboard operation; focus ring — owner: unassigned — status: todo
- A11Y-2 [mvp] Screen reader labels for entities — owner: unassigned — status: todo
- I18N-1 [mvp] UTF‑8, BiDi text via platform engines — owner: unassigned — status: todo

### 17) Security & Privacy
- SEC-1 [mvp] No background network calls; offline by default — owner: unassigned — status: todo
- SEC-2 [mvp] Sanitize file:// links; warn on missing files — owner: unassigned — status: todo
- SEC-3 [mvp] Crash logs local; optional opt‑in telemetry gates — owner: unassigned — status: todo

### 18) QA, Tooling, Fixtures
- QA-1 [mvp] Test matrix per SPECS section 12 — owner: unassigned — status: todo
- QA-2 [mvp] Golden files for export conformance — owner: unassigned — status: todo
- QA-3 [tech] Synthetic boards generator (1k/5k/10k) — owner: unassigned — status: todo

### 19) Packaging & Updates
- PKG-1 [mvp] macOS codesign and notarization; universal build — owner: unassigned — status: todo
- PKG-2 [mvp] Tauri updater channel wiring — owner: unassigned — status: todo

### 20) Roadmap (Post‑MVP)
- RM-1 [post-mvp] Orthogonal routing / elbows for connectors — owner: unassigned — status: todo
- RM-2 [post-mvp] Smart guides and snap alignment — owner: unassigned — status: todo
- RM-3 [post-mvp] Additional shape types (ellipse/cloud) — owner: unassigned — status: todo
- RM-4 [post-mvp] Templates and palettes — owner: unassigned — status: todo

## Maintenance Style Guide (for this TODO.md)

- Keep this file the single source of truth for scope and status. Open issues must reference an item ID; items link back to issues/PRs.
- When starting work: change `status` to `in-progress`, add owner, add issue link.
- When blocked: set `blocked` and add a brief reason inline.
- On PR merge: set `done`, link PR, and add any follow‑ups as new items.
- For new ideas: add under correct area with `[post-mvp]` unless explicitly approved for current milestone.
- Keep lines concise. Move discussion and specs to issues, docs, or code comments.
