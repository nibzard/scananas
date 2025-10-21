# Freeform Idea Map — Engineering TODO

Status: **Enhanced MVP with Production Improvements + Critical Fixes**. Core functionality complete plus major enhancements: Tauri v2 migration, enhanced error handling, state management, DevTools integration, security hardening, and critical stability fixes. Ready for advanced features.

## 🎉 Recently Completed (Latest Session - December 2024 + October 2025 Critical Fixes + October 2025 Shapes)

**Major Infrastructure Enhancements:**
- ✅ **Tauri v2 Migration**: Complete upgrade from v1 to v2 with modern API patterns
- ✅ **Enhanced Error Handling**: Detailed error messages, schema validation, async command improvements
- ✅ **State Management**: Recent files tracking (10 most recent), last save path persistence
- ✅ **DevTools Integration**: CrabNebula DevTools for development debugging and monitoring
- ✅ **Security & Permissions**: Proper capability definitions, restricted file system access
- ✅ **Future-Ready Files**: Support for .fim file format alongside JSON

**Core Interactive Features:**
- ✅ **Note System**: Double-click creation, Enter/Esc editing, drag movement, resize handles (E/S/SE), Delete key
- ✅ **Connections**: Alt+drag between notes, visual dotted lines, auto-cleanup on note delete
- ✅ **Selection**: Click, Shift+click, marquee selection, Alt+drag subtract mode
- ✅ **Movement Mode**: M key toggle for continuous arrow key movement at 60 FPS with visual feedback
- ✅ **Inspector Panel**: Right sidebar with Note/Connection/Document tabs, live property editing
- ✅ **Navigation**: Mouse wheel zoom, Space+drag pan, cursor feedback, HiDPI support
- ✅ **File I/O**: Enhanced JSON open/save with native dialogs, schema versioning, recent files
- ✅ **Comprehensive Undo/Redo**: Full command pattern implementation for all operations (movement, resize, connections, style changes) with smart continuous operation tracking

**NEW: Background Shapes System (SHP-1 & SHP-3 Completed):**
- ✅ **Shape Creation**: "⬜ Shape" toolbar button creates rounded rectangles with customizable properties
- ✅ **Canvas Rendering**: Proper z-ordering with shapes rendering behind notes, rounded corners with adjustable radius
- ✅ **Shape Selection**: Click selection, Shift+click multi-select, marquee selection, visual selection highlighting
- ✅ **Manipulation Handles**: Resize handles (SE, E, S) for shapes, drag movement with cursor feedback
- ✅ **Inspector Integration**: Shape property panel with label editing, corner radius slider, magnetic toggle, dimensions and position controls
- ✅ **Command System**: Full CRUD operations with undo/redo (CreateShapesCommand, DeleteShapesCommand, MoveShapesCommand, ResizeShapesCommand, UpdateShapesCommand)
- ✅ **Interactive Features**: Delete/Backspace support, magnetic behavior toggle for note snapping, optional shape labels
- ✅ **Visual Design**: Subtle styling with transparency, selection highlighting, professional appearance

**Architecture & Foundation:**
- ✅ Tauri v2 + React setup with TypeScript/Rust type synchronization
- ✅ Canvas rendering with proper transforms and hit testing
- ✅ Robust state management and component architecture
- ✅ Production-ready build system and error handling

**Major Infrastructure Enhancements:**
- ✅ **Tauri v2 Migration**: Complete upgrade from v1 to v2 with modern API patterns
- ✅ **Enhanced Error Handling**: Detailed error messages, schema validation, async command improvements
- ✅ **State Management**: Recent files tracking (10 most recent), last save path persistence
- ✅ **DevTools Integration**: CrabNebula DevTools for development debugging and monitoring
- ✅ **Security & Permissions**: Proper capability definitions, restricted file system access
- ✅ **Future-Ready Files**: Support for .fim file format alongside JSON

**Core Interactive Features:**
- ✅ **Note System**: Double-click creation, Enter/Esc editing, drag movement, resize handles (E/S/SE), Delete key
- ✅ **Connections**: Alt+drag between notes, visual dotted lines, auto-cleanup on note delete
- ✅ **Selection**: Click, Shift+click, marquee selection, Alt+drag subtract mode
- ✅ **Movement Mode**: M key toggle for continuous arrow key movement at 60 FPS with visual feedback
- ✅ **Inspector Panel**: Right sidebar with Note/Connection/Document tabs, live property editing
- ✅ **Navigation**: Mouse wheel zoom, Space+drag pan, cursor feedback, HiDPI support
- ✅ **File I/O**: Enhanced JSON open/save with native dialogs, schema versioning, recent files
- ✅ **Comprehensive Undo/Redo**: Full command pattern implementation for all operations (movement, resize, connections, style changes) with smart continuous operation tracking

**Architecture & Foundation:**
- ✅ Tauri v2 + React setup with TypeScript/Rust type synchronization
- ✅ Canvas rendering with proper transforms and hit testing
- ✅ Robust state management and component architecture
- ✅ Production-ready build system and error handling

**New Tauri Commands Available:**
- `open_document()` - Enhanced with better error handling and recent files tracking
- `save_document()` - Enhanced with validation and state management
- `get_recent_files()` - Returns list of 10 most recently accessed files
- `clear_recent_files()` - Clears the recent files list
- `open_specific_document(path)` - Opens a specific file from recent files list

**Recent Files UI Integration:**
- ✅ **RecentFiles Component**: Frontend dropdown with file list, count badge, and path truncation
- ✅ **Toolbar Integration**: Seamless integration with existing toolbar layout
- ✅ **Backend Commands**: Complete integration with openSpecificDocument command
- ✅ **Typed Interfaces**: Full TypeScript interfaces for recent files operations
- ✅ **Clear Functionality**: User-friendly clear recent files option

**Container Format & Advanced Features:**
- ✅ **FIM Container Format**: Complete .fim zip container implementation with board.json + /media structure
- ✅ **Format Flexibility**: Dual support for both .fim (zip) and .json formats with automatic detection
- ✅ **Zip Integration**: Rust zip crate integration for container creation and extraction
- ✅ **Media Support**: Ready for embedded media files with dedicated /media directory

**Critical Stability & Security Fixes (October 2025):**
- ✅ **Memory Safety**: Eliminated all unsafe `.unwrap()` calls with proper error handling in file operations
- ✅ **Recovery System**: Fully implemented recovery file discovery across common directories (temp, home, documents)
- ✅ **Build Warnings**: Fixed all Rust compiler warnings including unused mutability and dead code
- ✅ **Dependencies**: Added `dirs` crate for proper cross-platform directory access
- ✅ **Error Handling**: Comprehensive error handling for file path operations and recovery processes
- ✅ **Code Quality**: Clean build with zero warnings, improved code maintainability

## 📊 Current Project Status Summary (October 2025)

### ✅ **Stable & Production Ready:**
- Complete Tauri v2 application with React frontend
- All critical memory safety and stability issues resolved
- Clean builds with zero warnings
- Comprehensive error handling throughout
- Full MVP note-taking functionality working
- Advanced undo/redo system implemented
- File I/O with dual format support (.fim/.json)

### 🚧 **High Priority Missing MVP Features:**
1. **Export System** (EXP-1, EXP-2, EXP-3) - PDF, PNG, and text format exports
2. **Background Shapes** (SHP-1, SHP-2, SHP-3) - Visual grouping with magnetic behavior  
3. **Stacks System** (STK-1, STK-2, STK-3) - Hierarchical note organization
4. **Search Functionality** (SRCH-1, SRCH-2) - Find text and select connected clusters
5. **Performance Optimization** (CAN-2, CAN-3, PERF-1) - Spatial indexing for large documents

### 🎯 **Recommended Next Steps:**
1. Implement export functionality (highest user value)
2. Add background shapes for visual organization
3. Build search capabilities
4. Optimize rendering performance
5. Add accessibility features

### 🏗️ **Architecture Health:**
- **Security**: ✅ Excellent (capabilities restricted, no unsafe operations)
- **Stability**: ✅ Excellent (comprehensive error handling, recovery system)
- **Performance**: 🟡 Good (suitable for moderate use, needs optimization for 10k+ notes)
- **Maintainability**: ✅ Excellent (clean code, TypeScript/Rust integration, zero warnings)

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
- PB-2.1 [mvp] Tauri v2 migration with modern API patterns — owner: @amp — status: done
- PB-2.2 [mvp] Enhanced capabilities and permissions configuration — owner: @amp — status: done
- PB-2.3 [mvp] DevTools integration for development debugging — owner: @amp — status: done
- PB-3 [mvp] Add CI for build/test/lint; macOS universal target — owner: unassigned — status: todo
- PB-4 [tech] Pre-commit formatting and linting (Rust + TS) — owner: unassigned — status: todo
- PB-5 [tech] Clean build without warnings — owner: @amp — status: done (completed 2025-10-20) ✅ **COMPLETED**: Eliminated all Rust compiler warnings, improved code quality, added proper dependency management

### 1) Data Model & Persistence
- DM-1 [mvp] Define TS/Rust schemas for entities (Note, Connection, Shape, Stack, Styles, Document) — owner: @amp — status: done
- DM-2 [mvp] JSON serialization compatibility (`schemaVersion`) — owner: @amp — status: done
- DM-2.5 [tech] JSON Open/Save stubs via Tauri commands — owner: @amp — status: done
- DM-2.6 [mvp] Enhanced error handling and schema validation — owner: @amp — status: done
- DM-2.7 [mvp] Recent files state management (10 most recent) — owner: @amp — status: done
- DM-2.8 [mvp] Last save path tracking and persistence — owner: @amp — status: done
- DM-3 [mvp] `.fim` zip container I/O (board.json + /media) — owner: @amp — status: done
- DM-4 [mvp] Autosave every 30s + idle; recovery `.fim.recovery` — owner: unassigned — status: done (completed 2025-10-20) ✅ **COMPLETED**: Implemented automatic saving system with 30-second intervals, idle detection, and recovery file generation (.fim.recovery) for crash recovery
- DM-5 [tech] Recovery file discovery system implementation — owner: @amp — status: done (completed 2025-10-20) ✅ **COMPLETED**: Full recovery file scanner across temp, home, and document directories with proper metadata extraction

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
- SEL-2 [mvp] Nudge (1px / 10px with Shift) — owner: @amp — status: done
- SEL-3 [mvp] Movement mode (M) arrow-keys continuous nudge — owner: @amp — status: done
- SEL-4 [mvp] Shift-constrained drag (H/V) — owner: @amp — status: done (basic drag implemented)

### 5) Connections
- CON-1 [mvp] Drag note→note to create dotted connector — owner: @amp — status: done (Alt+drag)
- CON-2 [mvp] Styles: dotted/solid; arrows none/src/dst/both — owner: unassigned — status: done (completed 2025-10-20) ✅ **COMPLETED**: Full connection styles implementation including solid/dotted line styles and comprehensive arrow options (none/source/destination/both). Added to ConnectionInspector panel with live preview, proper TypeScript interfaces, and full undo/redo integration for style changes.
- CON-3 [mvp] Connection labels at midpoint; editable — owner: unassigned — status: done (completed 2025-10-20) ✅ **COMPLETED**: Full connection labels implementation including label rendering at midpoint with styled backgrounds, double-click editing with Enter/Esc controls, hit testing for selection, Inspector panel integration, full undo/redo support, and connection selection highlighting
- CON-4 [mvp] Reconnect endpoints by dragging — owner: unassigned — status: todo
- CON-5 [mvp] Insert note on connector (split into two) — owner: unassigned — status: todo

### 6) Background Shapes (Groups)
- SHP-1 [mvp] Rect shapes with corner radius, label — owner: claude — status: completed ✅
- SHP-2 [mvp] Magnetic move: overlap test and group translation — owner: unassigned — status: todo
- SHP-3 [mvp] Z‑order: shapes behind notes; handles on select — owner: claude — status: completed ✅

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
- ✅ EXP-3 [mvp] TXT/RTF/OPML export per ordering heuristics — owner: niko — status: completed — **Complete export system with intelligent text ordering (spatial, connections, hierarchical), Tauri backend commands, and UI integration**
- PRN-1 [mvp] Native print dialog; scale‑to‑fit; posterize — owner: unassigned — status: todo

### 13) Undo / Redo
- UNDO-1 [mvp] Command stack; coalesce text edits — owner: @amp — status: done
- UNDO-2 [mvp] Operations: move, style change, connections, stacks, shapes — owner: @amp — status: done

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
- SEC-1 [mvp] No background network calls; offline by default — owner: @amp — status: done (enforced by capabilities)
- SEC-2 [mvp] Sanitize file:// links; warn on missing files — owner: unassigned — status: todo
- SEC-3 [mvp] Crash logs local; optional opt‑in telemetry gates — owner: unassigned — status: todo
- SEC-4 [mvp] Proper capability scoping for file system access — owner: @amp — status: done
- SEC-5 [mvp] Dialog permissions with file type restrictions — owner: @amp — status: done
- SEC-6 [tech] Memory safety improvements - eliminate unsafe .unwrap() calls — owner: @amp — status: done (completed 2025-10-20) ✅ **COMPLETED**: Replaced all unsafe `.unwrap()` calls with proper error handling for file operations and path handling

### 18) QA, Tooling, Fixtures
- QA-1 [mvp] Test matrix per SPECS section 12 — owner: unassigned — status: todo
- QA-2 [mvp] Golden files for export conformance — owner: unassigned — status: todo
- QA-3 [tech] Synthetic boards generator (1k/5k/10k) — owner: unassigned — status: todo

### 19) Packaging & Updates
- PKG-1 [mvp] macOS codesign and notarization; universal build — owner: unassigned — status: todo
- PKG-2 [mvp] Tauri updater channel wiring — owner: unassigned — status: todo

### 20) Recent Files & UX Improvements
- RF-1 [mvp] Recent files menu with 10 most recent documents — owner: @amp — status: done
- RF-2 [mvp] Clear recent files command — owner: @amp — status: done
- RF-3 [mvp] Remember last save location for quick save — owner: @amp — status: done
- RF-4 [tech] Frontend integration for recent files UI — owner: @amp — status: done

### 21) Development & Debugging
- DEV-1 [tech] CrabNebula DevTools integration for debug builds — owner: @amp — status: done
- DEV-2 [tech] Enhanced logging with structured commands — owner: @amp — status: done
- DEV-3 [tech] Development-only performance monitoring — owner: @amp — status: done

### 22) Roadmap (Post‑MVP)
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
