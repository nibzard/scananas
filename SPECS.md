# FIM Specification

# 1) Product Overview

**Working name:** Freeform Idea Map (FIM)

**Goal:** A fast, low‑friction, freeform canvas for capturing, arranging, and lightly structuring ideas as notes, with optional connections and visual grouping. No enforced hierarchy. Zero‑latency feel. macOS app using Tauri, fully offline, single file document model with auto‑save.

**Non‑Goals:** Rich text editing beyond simple styling; diagramming features like swimlanes/UML; collaborative realtime editing; cloud accounts; third‑party integrations (explicitly exclude Scrivener).

**Primary Personas:**

* **Author/Researcher:** Brainstorms, clusters themes, exports to outline.
* **Student/Planner:** Takes notes, groups ideas, exports to text/OPML.
* **Product/Design Thinker:** Quick mapping during workshops, prints to PDF/PNG.

**Key Value Props:** Drop notes anywhere with a double‑click, connect by dragging, group with background shapes, keep momentum with powerful keyboard and zoom behaviors.

---

# 2) Platforms & System Requirements

* **macOS:** 10.15+ (Intel & Apple Silicon, Universal build)
* **Architectural targets:** High‑DPI support, multi‑monitor aware, system print & PDF export.

---

# 3) Core Concepts & Data Model

**Document (Board)**

* Infinite 2D canvas coordinate system (float coordinates; origin at top‑left; y increases downward).
* Units: pixels at 1x; scale factor applied for zoom rendering.

**Entities**

* **Note** `{ id, text, richAttrs, frame: {x,y,w,h}, styleId?, faded:boolean, stackId?, links:[url|file], images:[imageId], connections:[connectionId] }`
* **Connection** `{ id, srcNoteId, dstNoteId, style: { dotted|solid, arrows: none|src|dst|both }, label?:string, bendPoints?:[{x,y}] }`
* **Background Shape** `{ id, frame:{x,y,w,h}, radius, magnetic:boolean, styleId?, label?:string }`
* **Stack** `{ id, noteIds:[...], orientation:"vertical", spacing, indentLevels:{noteId:number}, alignedWidth?:number }`
* **NoteStyle** `{ id, textStyle:{font, size, weight, italic, underline, strike, color, align}, fill, border:{color,width,style}, cornerRadius, shadow }`
* **DocumentStyle** `{ background:{color|textureId}, defaultNoteStyleId, defaultShapeStyleId, grid?:{visible:boolean, snap:boolean, size}}`
* **EmbeddedImage** `{ id, mime, width, height, data|path }`

**File Format**

* Single file `*.fim` (zip container) with JSON payload `board.json` + `/media/*` images.
* Backward/forward compatibility via `schemaVersion` and tolerant JSON parsing.

**Autosave & Versioning**

* Local autosave every 30s and on idle; recovery file `.fim.recovery` for crash protection.

---

# 4) Feature Specification

## 4.1 Note Creation & Editing

* Double‑click on blank canvas → create note at pointer, auto‑size to content with min/max width.
* Enter/Esc toggles edit mode. Multi‑line text supported with soft wraps.
* Markdown‑lite parsing **(optional toggle)** for *bold/italic/underline/strike* or use explicit toolbar buttons.
* Text alignment: left/center/right.
* Note resizing: drag east/south edges; auto‑height grows with text.
* Duplicate (Cmd/Ctrl+D) duplicates in place with small offset; pasted notes become selected.
* Delete removes note and incident connections unless prevented by modal confirm (undoable).
* Fading: toggle “Fade” to reduce alpha of fill/border/text by 50% for de‑emphasis.

## 4.2 Selection & Movement

* Click selects; Shift‑click additive; Alt/Option‑drag for marquee minus selection.
* Arrow keys nudge (1px); with Shift (10px). **Movement mode** (press M) turns arrow keys into continuous nudge without moving caret; Esc exits.
* Dragging shows live preview of new positions; hold Shift to constrain horizontal/vertical.

## 4.3 Connections

* Drag a note onto another → create dotted connector without arrows by default.
* Style options: dotted/solid; arrowheads at src/dst/both; color and width inherit from theme.
* Label creation: select two connected notes → `Add Connection Label` (floating text anchored at mid‑point; editable; auto‑avoid note frames).
* Insert note on connector: double‑click on a connection to spawn a new note attached to both ends; original connection replaced by two connections.
* Reconnection: drag connector endpoint to retarget to a different note.

## 4.4 Background Shapes (Groups)

* Rectangle with adjustable corner radius; optional label.
* Magnetic flag: when true, overlapping/contained notes move with the shape. A note can overlap multiple shapes; moving one shape drags only its overlapping notes.
* Shapes are purely visual (no hierarchy ownership). Z‑order: shapes render behind notes; selection shows handles.

## 4.5 Stacks

* Create from selection (`Make Stack`): vertical ordering top→bottom by Y then X.
* Stack behaviors: Enter adds a new note beneath current; Cmd/Ctrl+Enter adds sibling without leaving edit; Tab/Shift+Tab indent/outdent within stack (indent is visual offset recorded in stack.indentLevels).
* Align & size: commands for `Same Width`, `Same Height`, `Distribute Vertically` within stack scope.
* Unstack: converts to free notes preserving positions.

## 4.6 Styles & Inspector

* Right sidebar Inspector with tabs: **Note**, **Shape**, **Connection**, **Document**.
* Save current selection formatting as a reusable **Note Style**; drag a style chip onto notes to apply.
* Set defaults for new notes/shapes (persisted in document).
* Global appearance: background color or texture; per‑document font fallback.

## 4.7 Images & Links

* Drag‑drop images (PNG/JPEG/GIF static) into canvas; inline boxes with resizable frame preserving aspect.
* Export embedded images via `Export > Images…` (select all or range).
* Hyperlinks supported in note text (http(s)://, mailto:, file://). Ctrl/Cmd+Click opens with OS.

## 4.8 Search & Selection Utilities

* Find (Cmd/Ctrl+F): incremental search across note text and connection labels; next/prev; highlight matches.
* `Select Connected Cluster`: given a selection, expands to all notes connected by any path.
* `Select by Style` and `Select by Fade` quick filters.

## 4.9 Zooming, Panning, and Focus

* Mouse wheel/trackpad pinch zoom centered on cursor.
* **Quick Zoom:** hold Z → temporary zoom‑out to fit board bounds; release returns to prior zoom at cursor focus.
* Middle‑mouse (or spacebar) drag to pan.
* Zoom presets: 50%, 100%, 200%; Fit Selection; Fit Board.
* Full‑screen mode (native per OS).

## 4.10 Export & Print

* **PDF** (vector), **PNG** (raster), **TXT / TXT List**, **RTF / RTFD**, **OPML**, **Images Only**.
* Options per format:

  * Include background & textures; include faded items; trim to content bounds or custom margin.
  * PNG DPI scaling (1x, 2x, 3x).
  * TXT: choose field separators (newline, tab, bullet).
  * OPML: map stacks and inferred groups; connection labels ignored; shapes map to outlines where overlapping is unambiguous.
* Export ordering heuristics for linear formats:

  1. If stacks exist, emit stacks top→bottom, notes inside by stack order (respect indent).
  2. Remaining notes: sort by X (asc), then Y; traverse connected neighbors breadth‑first to keep clusters contiguous.
  3. Ties resolved by creation time.
* Printing: native dialog; paginate automatically with scale‑to‑fit and posterize‑tiling option.

## 4.11 Undo/Redo

* Infinite undo/redo per document session using command stack (coalesce text edits; distinct operations for move, style change, connection edits, stack ops, shape moves).

## 4.12 Theming & Dark Mode

* Auto follow OS appearance; user override per document.
* High‑contrast theme variant for accessibility.

## 4.13 Keyboard Shortcuts (default)

* New note: Double‑click canvas; Cmd/Ctrl+Return creates sibling note (in stack); Return toggles edit.
* Duplicate: Cmd/Ctrl+D. Delete: Backspace/Del.
* Movement mode: M. Quick Zoom: Z (hold). Pan: Space (hold) or Middle‑mouse.
* Connect: Drag note onto another; toggle arrows via Inspector or shortcut (Alt+A cycles).
* Label connection: Cmd/Ctrl+L.
* Make stack: Cmd/Ctrl+G; Unstack: Cmd/Ctrl+Shift+G.
* Align width: Cmd/Ctrl+Shift+W; Distribute vertical: Cmd/Ctrl+Shift+D.
* Fade: Cmd/Ctrl+Shift+F.
* Find: Cmd/Ctrl+F. Fit: Cmd/Ctrl+0. Actual size: Cmd/Ctrl+1.

---

# 5) Application Architecture

5a) Tauri Overview (Framework Choice)

What it is: Tauri builds tiny, fast desktop (and mobile) apps by pairing any HTML/JS/CSS frontend with a secure, native backend written primarily in Rust. It ships a thin wrapper around the system’s webview rather than bundling a full browser engine.

Why we’re using it:

Security-first foundation: Rust gives memory/thread/type safety by default; Tauri undergoes regular third‑party security audits for major/minor releases.

Small binaries: Uses the OS webview, so we don’t ship Chromium—minimal apps can be sub‑MB, and our assets dominate size, not the runtime.

Flexible architecture: Any modern frontend stack works (React/Vite recommended). Native capabilities live in Rust commands and/or Tauri Plugins; JS ↔ Rust calls via invoke. If we ever need deeper control, Tauri’s underpinnings—TAO (windowing) and WRY (webview)—are available.

Project setup (high level):

Prereqs per OS (Rust toolchain, platform webview deps).

Bootstrap with create-tauri-app (Vite + React template), then add Rust commands for file I/O, export, printing, and performance‑critical logic.

Prefer official plugins (dialog, fs, shell, updater) before rolling custom; keep the permission scoping tight in tauri.conf.json.

Implications for our app:

Render the canvas and inspector in the web layer (WebGL/Canvas2D for the board; WASM or Rust‑side for heavy ops).

Use Rust for: file format, autosave/journaling, export pipelines (PDF/PNG/OPML/RTF[D]), spatial index, large‑board performance.

Ship per‑platform installers with code‑signing; keep update channel via Tauri updater.

Client‑Side, Native UI

macOS: Swift/Cocoa + Core Text + Core Graphics + Metal‑backed CALayer rendering.

Rendering Engine

Retained‑mode scene graph with dirty‑rect invalidation; GPU‑accelerated text & shapes; sub‑pixel text positioning.

Zoom‑adaptive caching for note text layouts and images.

**Client‑Side, Native UI**

* **macOS:** Swift/Cocoa + Core Text + Core Graphics + Metal‑backed CALayer rendering.
* Shared core logic in C++ (via bridging) or Rust to reuse data model, layout, serialization, and export logic across platforms. Alternative: two native cores with harmonized schema.
* Implemented in Tauri - Tauri is a framework for building tiny, fast binaries for all major desktop and mobile platforms. Developers can integrate any frontend framework that compiles to HTML, JavaScript, and CSS for building their user experience while leveraging languages such as Rust, Swift, and Kotlin for backend logic when needed.

**Rendering Engine**

* Retained‑mode scene graph with dirty‑rect invalidation; GPU‑accelerated text & shapes; sub‑pixel text positioning.
* Zoom‑adaptive caching for note text layouts and images.

**Hit‑Testing**

* Quad‑tree spatial index for notes/shapes/connectors; tolerance padding for handles and connector hit‑slop.

**Export Pipeline**

* PDF via platform APIs (Quartz, Windows Print Document Package).
* PNG via offscreen render at specified scale.
* RTF/RTFD via attributed text export; embed images as attachments (RTFD on macOS).
* OPML via XML serializer; outline derivation from stacks and grouping heuristic.

**Autosave/Recovery**

* Background write queue with atomic temp‑file swap; journaling for crash recovery.

**Settings**

* Per‑document JSON plus per‑user preferences (defaults, recent styles, UI state).

---

# 6) UX & Interaction Details (Edge‑Case Rules)

* Creating a note near canvas edge scrolls the canvas when dragged beyond viewport (mouse‑at‑edge autoscroll, speed proportional to distance).
* Magnetic shapes:

  * Overlap test uses note frame inflated by 4px; when moving shape, collect overlapping notes and translate with shape. If a note overlaps multiple shapes being moved, move once (union set) to avoid double translation.
* Connector routing:

  * Default straight line center‑to‑center; if overlapping a note’s body (other than endpoints), draw above with 1px visual gap. Simple polyline bend points allowed when user drags connector body.
* Text measurement:

  * Word‑wrap by width; auto‑expand height. Minimum note width 120px; maximum 480px by default (user adjustable).
* Z‑order:

  * New notes come to front; `Bring to Front/Send to Back` commands adjust order; connectors always render under notes but above shapes.
* Keyboard focus:

  * While editing text, movement keys modify text; in Movement mode, text caret is suppressed and arrows nudge selection.
* Quick Zoom:

  * Holding Z stores current zoom/center; on release, restore exactly; cursor location remains under pointer (recenter viewport).

---

# 7) Performance Targets

* Cold start < 1.0s on modern hardware.
* 10k notes mixed with 10k connections at 60 FPS pan/zoom; text‑layout caching amortizes cost.
* Memory: < 500MB for a 10k/10k board with thumbnails disabled.

---

# 8) Accessibility

* Full keyboard operation; focus ring for selection; large‑cursor and high‑contrast modes.
* Screen reader labels for notes, shapes, and connector summaries (e.g., “Note ‘Plot twist’ connected to 3 notes, faded”).
* Adjustable UI scale independent of canvas zoom.

---

# 9) Internationalization

* UTF‑8 throughout. BiDi text support via platform text engines. Localizable UI strings; date/number formats via OS.

---

# 10) Security & Privacy

* Fully offline by default; no background network calls.
* File links open only on explicit user action (Ctrl/Cmd+Click). Sanitize `file://` paths; warn on missing files.
* Crash logs written locally; telemetry strictly opt‑in and anonymized (if implemented).

---

# 11) Licensing

* Apache 2.0 Open Source

---

# 12) QA Plan & Acceptance Criteria

**Functional Test Matrix**

* CRUD: notes, connections, shapes, stacks.
* Style save/apply; defaults; fade behavior.
* Images/link insert; link activation.
* Search; select connected clusters.
* Zoom/pan (mouse/trackpad/keyboard) inc. Quick Zoom & Movement mode.
* Export (all formats) with options; verify OPML in major outliners.
* Print on macOS; posterization.
* Undo/redo integrity for all commands.

**Performance Tests**

* Synthetic large boards (1k, 5k, 10k notes) for FPS and memory.

**Compatibility**

* High‑DPI displays, mixed DPI multi‑monitor Windows.

**Acceptance (MVP)**

* Create/edit notes; connections with labels; background shapes (magnetic); stacks; styles; images/links; search; Quick Zoom; Movement mode; export PDF/PNG/TXT/RTF/OPML; print; autosave; undo/redo; dark mode.

---

# 13) Roadmap (Post‑MVP Enhancements)

* Freeform connector elbows + orthogonal routing.
* Smart guides and snap‑to alignment.
* Shape types (ellipse, rounded cloud).
* Template boards and note palettes.
* Optional OS‑level writing tools surfaces where available.

---

# 14) Open Questions

1. Shared core (C++/Rust) vs. fully native duplicated logic?
2. Markdown‑lite toggle on by default?
3. OPML export grouping heuristics tunables—user‑controllable?
4. Trial enforcement: read‑only vs. watermark on exports?

---

# 15) Deliverables

* Cross‑platform app builds.
* File format spec (`schemaVersion 1`).
* Export conformance fixtures (golden files).
* QA test plan & automation scripts.
* User guide (quickstart + shortcuts cheatsheet).

