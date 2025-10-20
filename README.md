# Freeform Idea Map (FIM)

Fast, low‑friction, freeform canvas for capturing, arranging, and lightly structuring ideas. Cross-platform desktop app using Tauri + React, fully offline, with JSON document storage.

## Current Status - MVP in Progress ✨

The core idea mapping functionality is **implemented and working**:

### ✅ **Working Features:**
- **✨ Note Creation**: Double-click empty space to create notes
- **✏️ Text Editing**: Select note → Enter to edit, Esc to finish
- **🎯 Note Movement**: Drag notes around the infinite canvas  
- **🔗 Connections**: Alt+drag between notes to create dotted connections
- **🗑️ Deletion**: Select notes → Delete/Backspace (removes notes + connections)
- **🖱️ Selection**: Click, Shift+click, marquee selection, Alt+drag to subtract
- **🔍 Navigation**: Mouse wheel zoom, Space+drag or middle-mouse to pan
- **💾 File I/O**: Open/Save JSON documents via native dialogs
- **🎨 HiDPI Support**: Crisp rendering on high-resolution displays

### 🚧 **In Development:**
- Inspector panel for styling
- PDF/PNG export functionality  
- Note resizing handles
- `.fim` file format (zip containers)
- Background shapes & stacks
- Undo/redo system

## Prerequisites

- **Rust toolchain**: `rustup` with latest stable (`rustup update`)
- **Node.js 18+** and npm
- **Platform deps**: 
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: See [Tauri prerequisites](https://tauri.app/start/prerequisites/)
  - Windows: See [Tauri prerequisites](https://tauri.app/start/prerequisites/)

## Quick Start

The project is **ready to run** - no bootstrap needed:

```bash
# 1. Install frontend dependencies
cd app && npm install

# 2. Run in development mode
npm run tauri dev

# 3. Or build for production  
npm run tauri build
```

## How to Use

When you run the app, you'll see demo notes with instructions. Here are the key interactions:

### Basic Operations:
- **Create Notes**: Double-click any empty area on the canvas
- **Edit Text**: Click to select a note, press Enter to edit, Esc when done
- **Move Notes**: Click and drag notes around the canvas
- **Delete Notes**: Select notes and press Delete or Backspace

### Advanced Features:
- **Make Connections**: Hold Alt and drag from one note to another
- **Multi-Select**: Shift+click to add notes to selection, or drag a box around notes
- **Navigate Canvas**: Mouse wheel to zoom, Space+drag (or middle-mouse drag) to pan
- **File Operations**: Use Open/Save buttons in the top toolbar

## Development

### Repo Structure:
- `app/` — Frontend (Vite + React + TypeScript)
- `src-tauri/` — Rust backend (Tauri commands, file I/O)
- `SPECS.md` — Complete product specification
- `TODO.md` — Development task breakdown

### Project Status:
- Core MVP features are functional and tested
- Architecture supports all planned features from SPECS.md
- Ready for advanced features like exports, styling, and file formats

### Next Steps:
See `TODO.md` for remaining MVP tasks. The foundation is solid for extending with:
- Inspector panel for note/connection styling
- PDF/PNG/OPML export functionality  
- Advanced features like stacks, background shapes, and undo/redo
