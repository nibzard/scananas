# Freeform Idea Map — Engineering TODO

Status: **Enhanced MVP with Production Improvements**. Core functionality complete plus major enhancements: Tauri v2 migration, enhanced error handling, state management, DevTools integration, and security hardening. Ready for advanced features.

## 🎉 Recently Completed (Latest Session - December 2024)

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

**Export Functionality:**
- ✅ **PDF Export (EXP-1)**: Complete PDF export implementation with vector graphics, customizable page sizes (A4, Letter, Legal, Tabloid), multiple orientation options (Portrait/Landscape), adjustable margins, and quality settings. Added native file dialog integration, proper error handling, and full TypeScript command interfaces.
- ✅ **PNG Export (EXP-2)**: High-quality PNG export with multiple DPI options (1x, 2x, 3x), transparent background support, customizable dimensions, and canvas-to-image conversion. Integrated with native save dialogs and included comprehensive error handling for large canvas exports.

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

### 1) Data Model & Persistence
- DM-1 [mvp] Define TS/Rust schemas for entities (Note, Connection, Shape, Stack, Styles, Document) — owner: @amp — status: done
- DM-2 [mvp] JSON serialization compatibility (`schemaVersion`) — owner: @amp — status: done
- DM-2.5 [tech] JSON Open/Save stubs via Tauri commands — owner: @amp — status: done
- DM-2.6 [mvp] Enhanced error handling and schema validation — owner: @amp — status: done
- DM-2.7 [mvp] Recent files state management (10 most recent) — owner: @amp — status: done
- DM-2.8 [mvp] Last save path tracking and persistence — owner: @amp — status: done
- DM-3 [mvp] `.fim` zip container I/O (board.json + /media) — owner: @amp — status: done
- DM-4 [mvp] Autosave every 30s + idle; recovery `.fim.recovery` — owner: unassigned — status: done (completed 2025-10-20) ✅ **COMPLETED**: Implemented automatic saving system with 30-second intervals, idle detection, and recovery file generation (.fim.recovery) for crash recovery

### 2) Canvas, Rendering, Hit‑Testing
- CAN-1 [mvp] Render infinite canvas (zoom/pan) with Canvas2D/WebGL — owner: @amp — status: done
- CAN-2 [mvp] Retained scene graph + dirty-rect redraws — owner: unassigned — status: todo
- CAN-3 [mvp] Quad‑tree spatial index (notes/shapes/connectors) — owner: unassigned — status: todo
- CAN-4 [mvp] Zoom‑adaptive caches (text layout, thumbnails) — owner: unassigned — status: todo

### 3) Notes — Creation & Editing
- NOTE-1 [mvp] Double‑click create; auto-size to content; resize — owner: @amp — status: done (with resize handles)
- NOTE-2 [mvp] Edit mode toggles (Enter/Esc); multi‑line wraps — owner: @amp — status: done
- NOTE-3 [mvp] Markdown‑lite parsing toggle (basic styles) — owner: unassigned — status: done (completed 2025-10-20) ✅ **COMPLETED**: Full markdown-lite implementation supporting **bold**, *italic*, `inline code`, and ~~strikethrough~~ styles. Added toggle UI in Inspector panel, real-time markdown detection indicator, canvas rendering integration with proper text wrapping, and complete integration with existing richAttrs data model and undo/redo system.
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
- CON-4 [mvp] Reconnect endpoints by dragging — owner: unassigned — status: done (completed 2025-10-20) ✅ **COMPLETED**: Full implementation of connection endpoint dragging including hit testing for endpoints, drag detection with visual feedback, real-time connection updates during dragging, target validation (preventing self-connections), full undo/redo integration with UpdateConnectionEndpointsCommand, proper cursor changes, and comprehensive user interaction feedback
- CON-5 [mvp] Insert note on connector (split into two) — owner: unassigned — status: todo

### 6) Background Shapes (Groups)
- SHP-1 [mvp] Rect shapes with corner radius, label — owner: niko — status: done (completed 2025-10-21) ✅ **COMPLETED**: Full rectangle shape implementation including rounded corners with configurable radius (0-50px), shape labels with centered positioning and styling, complete integration with selection system (single/marquee), Inspector panel controls for label editing and corner radius adjustment, toolbar shape creation button, comprehensive undo/redo support with all shape commands, canvas rendering with proper z-ordering (behind notes), and full hit testing for mouse interactions.
- SHP-2 [mvp] Magnetic move: overlap test and group translation — owner: niko — status: done (completed 2025-10-21) ✅ **COMPLETED**: Full magnetic move system implementation including: 1) **Overlap Detection**: Precise overlap detection between shapes and notes using overlap ratio calculations (50% threshold), 2) **Group Translation**: Unified group movement for overlapping elements, 3) **Shape-to-Shape Magnetic Interactions**: Support for magnetic behavior between overlapping shapes with cascading effects, 4) **Enhanced Visual Feedback**: Red tint/border for overlapped grouped notes (stronger connection), yellow tint/border for proximity magnetic notes (weaker connection), thicker borders for grouped notes (3px) vs proximity notes (2px), 5) **State Management**: Separate tracking for grouped notes vs proximity magnetic notes. Added functions: `findNotesOverlappingShape()`, `findShapesOverlappingShape()`, `calculateOverlapArea()`, `calculateOverlapRatio()`. Enhanced `applyMagneticMovement()` and `calculateMagneticSnap()` functions with new `magneticGroupedNotes` state variable. Maintains backward compatibility with existing magnetic behavior.
- SHP-3 [mvp] Z‑order: shapes behind notes; handles on select — owner: niko — status: done (completed 2025-10-21) ✅ **COMPLETED**: Analysis confirms SHP-3 was already fully implemented as part of the core shapes system. Z-order implementation renders shapes before notes in Canvas.tsx (lines 585-613), selection handles are implemented for single-selected shapes (lines 827-849) with SE corner, E edge, and S edge handles, and comprehensive hit testing is provided by hitTestShapeResizeHandle function (line 1963). Likely implemented along with SHP-1 around 2025-10-21.

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
- SRCH-1 [mvp] Incremental find (notes + connection labels) — owner: niko — status: done (completed 2025-10-21) ✅ **COMPLETED**: Full incremental search implementation with real-time search as you type, yellow highlighting for notes and connections on canvas, keyboard navigation (arrows, Enter, Esc), overlay UI at top of screen with result counter and preview, Ctrl+F to activate, Ctrl+Shift+F for traditional search dialog, integrated with existing state management and search utilities.
- SRCH-2 [mvp] Select Connected Cluster — owner: unassigned — status: todo
- SRCH-3 [mvp] Select by Style / Select by Fade — owner: unassigned — status: todo

### 11) Zoom, Pan, Focus
- ZPF-1 [mvp] Wheel/pinch zoom at cursor; pan (space/middle) — owner: @amp — status: done (smooth zoom/pan)
- ZPF-2 [mvp] Quick Zoom (hold Z) store/restore zoom+center — owner: unassigned — status: todo
- ZPF-3 [mvp] Presets: 50/100/200; Fit Selection/Board; fullscreen — owner: unassigned — status: todo

### 12) Export & Print
- EXP-1 [mvp] PDF export (vector) with options — owner: unassigned — status: done (completed 2025-10-21) ✅ **COMPLETED**: Vector-based PDF export implementation using jsPDF with comprehensive options: customizable page sizes (A3, A4, A5, Letter, Legal), orientation options (auto, portrait, landscape), high-quality scalable text and graphics rendering, UI controls in main toolbar, proper coordinate transformation and scaling, and support for all existing connection styles (arrows, colors, dotted/solid). Includes native file dialog integration, quality settings, and comprehensive error handling for production-ready PDF export functionality.
- EXP-2 [mvp] PNG export (1x/2x/3x DPI) — owner: unassigned — status: done (completed 2025-10-21) ✅ **COMPLETED**: High-quality PNG raster export with multiple DPI scaling options (1x, 2x, 3x), transparent background support, customizable dimensions, canvas-to-image conversion, native save dialogs, robust error handling for large exports, and fully functional DPI selector UI integrated into the export interface
- ✅ EXP-3 [mvp] TXT/RTF/OPML export per ordering heuristics — owner: niko — status: done (completed 2025-10-21) ✅ **COMPLETED**: Full text export system implementation with intelligent ordering heuristics (spatial, connections, hierarchical), complete Tauri backend commands for TXT/RTF/OPML formats, frontend UI integration with format selection and ordering options, proper file dialog integration, and comprehensive error handling. Complements existing PDF/PNG export system to provide complete export suite.
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