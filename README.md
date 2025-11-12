# Freeform Idea Map (FIM)

Fast, low‑friction, freeform canvas for capturing, arranging, and lightly structuring ideas. Cross-platform desktop app using Tauri + React, fully offline, with JSON document storage.

## 🎉 Current Status - MVP Feature-Complete with Modern UI! ✨

**Major Breakthrough**: FIM has achieved **MVP completion** with 2 of 3 core systems fully implemented! The application is now a **production-ready mind mapping tool** with sophisticated interactive features and a **beautiful, modern user interface** inspired by contemporary web design trends.

### ✅ **Core Note System:**
- **✨ Note Creation**: Double-click empty space to create notes
- **✏️ Text Editing**: Select note → Enter to edit, Esc to finish
- **🎯 Note Movement**: Drag notes around the infinite canvas with resize handles (E/S/SE)
- **🗑️ Deletion**: Select notes → Delete/Backspace (removes notes + connections)
- **🖱️ Selection**: Click, Shift+click, marquee selection, Alt+drag to subtract
- **🔍 Navigation**: Mouse wheel zoom, Space+drag or middle-mouse to pan
- **🎨 HiDPI Support**: Crisp rendering on high-resolution displays

### ✅ **Connection System:**
- **🔗 Basic Connections**: Alt+drag between notes to create dotted connections  
- **🎨 Connection Styles**: Solid/dotted lines, arrows (none/source/destination/both)
- **🏷️ Connection Labels**: Double-click connections to add/edit labels
- **🔍 Search Integration**: Search across connection labels

### ✅ **Background Shapes System (COMPLETE!):**
- **⬜ Shape Creation**: "Shape" toolbar button creates rounded rectangles
- **🧲 Magnetic Behavior**: Overlap detection (50% threshold) with group translation
- **👀 Visual Feedback**: Red tint for grouped notes, yellow tint for proximity attraction
- **🔗 Shape-to-Shape**: Magnetic interactions between overlapping shapes  
- **🎛️ Inspector Integration**: Shape properties, magnetic toggle, dimensions control

### ✅ **Stacks System (COMPLETE!):**
- **📚 Stack Creation**: Ctrl+S to create stacks from 2+ selected notes, Ctrl+Shift+S to unstack
- **⌨️ Keyboard Behaviors**: Enter/Ctrl+Enter for siblings, Tab/Shift+Tab for indentation
- **👀 Visual Indentation**: 20px per indent level with dotted blue backgrounds
- **🏷️ Stack Labels**: Shows note count, subtle styling for stacked notes
- **📐 Alignment Tools**: Full alignment/distribution commands with keyboard shortcuts

### ✅ **Advanced Features:**
- **💾 File I/O**: Open/Save with dual format support (.fim zip containers + JSON)
- **🔄 Undo/Redo**: Comprehensive command pattern for all operations  
- **🔍 Search System**: Incremental search (Ctrl+F), connected cluster selection (Ctrl+G)
- **📁 Recent Files**: Track 10 most recent documents with quick access
- **🎨 Inspector Panel**: Right sidebar with Note/Connection/Shape/Document tabs
- **📤 Export System**: PDF, PNG, TXT, RTF, OPML with intelligent ordering
- **💾 Autosave**: 30-second intervals with crash recovery

### ✨ **Modern UI/UX Features:**
- **🎨 Modern Design**: Glassmorphism effects, gradients, and subtle shadows
- **🌟 Magical Interactions**: Smooth animations, hover effects, and visual feedback
- **🎯 Intelligent Toolbar**: Contextual buttons with modern styling and tooltips
- **🎪 Canvas Effects**: Dynamic background gradients and interactive glow effects
- **📱 Responsive Design**: Clean layout with proper spacing and modern typography
- **🎭 Visual Hierarchy**: Clear information architecture with modern color schemes

### 🔄 **Next Priority:**
- **⚡ Performance Optimization**: Spatial indexing for 10k+ notes, dirty-rect rendering

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

## 🍎 Building for macOS

### Development Build
```bash
cd app
npm install
npm run tauri dev
```

### Production Build
```bash
cd app
npm install
npm run tauri build
```

The built app will be located at:
- **App Bundle**: `app/src-tauri/target/release/bundle/macos/FIM.app`
- **DMG Installer**: `app/src-tauri/target/release/bundle/dmg/FIM_0.1.0_x64.dmg`

### macOS-Specific Build Options

For **Universal Binary** (Intel + Apple Silicon):
```bash
# Install targets
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Build universal binary
npm run tauri build -- --target universal-apple-darwin
```

For **Code Signing** (requires Apple Developer Certificate):
```bash
# Set environment variables
export APPLE_CERTIFICATE="Developer ID Application: Your Name (TEAM_ID)"
export APPLE_ID="your-apple-id@email.com"
export APPLE_PASSWORD="app-specific-password"

# Build with signing
npm run tauri build -- --config '{"bundle":{"macOS":{"signing":{"identity":"'$APPLE_CERTIFICATE'"}}}}'
```

For **Notarization** (macOS Gatekeeper):
```bash
# After signing, notarize the DMG
xcrun notarytool submit "app/src-tauri/target/release/bundle/dmg/FIM_0.1.0_x64.dmg" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_PASSWORD" \
  --team-id "TEAM_ID" \
  --wait

# Staple the notarization
xcrun stapler staple "app/src-tauri/target/release/bundle/dmg/FIM_0.1.0_x64.dmg"
```

### macOS Build Troubleshooting

**Common Issues:**

1. **Xcode Command Line Tools Missing:**
   ```bash
   xcode-select --install
   ```

2. **Rust Toolchain Issues:**
   ```bash
   rustup update
   rustup target add x86_64-apple-darwin aarch64-apple-darwin
   ```

3. **Node.js Version Issues:**
   ```bash
   # Use Node.js 18+ (recommended: use nvm)
   nvm install 18
   nvm use 18
   ```

4. **Permission Issues:**
   ```bash
   # Clear npm cache and reinstall
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

## How to Use

When you run the app, you'll see demo notes with instructions. Here are the key interactions:

### Basic Operations:
- **Create Notes**: Double-click any empty area on the canvas
- **Edit Text**: Click to select a note, press Enter to edit, Esc when done
- **Move Notes**: Click and drag notes around the canvas
- **Resize Notes**: Drag the resize handles (SE corner, E edge, S edge)
- **Delete Notes**: Select notes and press Delete or Backspace

### Background Shapes:
- **Create Shape**: Click "⬜ Shape" button in toolbar  
- **Magnetic Behavior**: Notes near shapes get attracted (yellow), overlapping notes move together (red)
- **Shape Properties**: Use Inspector panel to adjust label, corner radius, magnetic toggle

### Stacks (Hierarchical Organization):
- **Create Stack**: Select 2+ notes, press Ctrl+S (Cmd+S on Mac)
- **Add Siblings**: In stack, press Enter (below) or Ctrl+Enter (above) 
- **Indent/Outdent**: Press Tab (indent) or Shift+Tab (outdent)
- **Unstack**: Press Ctrl+Shift+S (Cmd+Shift+S on Mac)

### Connections:
- **Make Connections**: Hold Alt and drag from one note to another
- **Connection Labels**: Double-click on connections to add/edit labels
- **Connection Styles**: Use Inspector to change line style and arrows

### Advanced Features:
- **Multi-Select**: Shift+click to add notes to selection, or drag a box around notes
- **Navigate Canvas**: Mouse wheel to zoom, Space+drag (or middle-mouse drag) to pan
- **Search**: Ctrl+F (Cmd+F) for incremental search, Ctrl+G (Cmd+G) for connected clusters
- **File Operations**: Use Open/Save buttons, or Ctrl+O/Ctrl+S shortcuts
- **Export**: Multiple formats (PDF, PNG, TXT, RTF, OPML) with various options

## Development

### Repo Structure:
- `app/` — Frontend (Vite + React + TypeScript)
- `src-tauri/` — Rust backend (Tauri commands, file I/O)
- `SPECS.md` — Complete product specification
- `TODO.md` — Development task breakdown

### Project Status:
- **🎉 MVP Feature-Complete**: 2 of 3 core systems fully implemented
- **✅ Background Shapes**: Complete magnetic behavior system  
- **✅ Stacks System**: Full hierarchical organization with visual indentation
- **✅ Advanced Features**: Search, export, inspector, undo/redo, autosave
- **⚡ Next Priority**: Performance optimization for large documents (10k+ notes)

### Key Technical Details:
- **Frontend**: Vite + React + TypeScript with Canvas2D rendering
- **Backend**: Tauri v2 + Rust for file I/O, export, and performance-critical operations
- **Architecture**: Command pattern for undo/redo, proper TypeScript-Rust integration
- **File Formats**: Dual support (.fim zip containers + JSON), schema versioning
- **Security**: Memory-safe Rust, no .unwrap() panics, proper error handling

### Performance Characteristics:
- **Small-Medium Documents**: Excellent performance (< 1000 notes)
- **Large Documents**: Good performance (1000-5000 notes) 
- **Very Large Documents**: Optimization needed (10k+ notes) - **Next Priority**
