import React from 'react'
import { ModernButton } from './ModernButton'
import { ModernSelect } from './ModernSelect'

interface ModernToolbarProps {
  // File operations
  onOpen: () => void
  onSave: () => void
  onForceAutosave?: () => void
  showAutosave?: boolean
  
  // Undo/Redo
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  undoDescription?: string
  redoDescription?: string
  
  // Tools
  onCreateShape: () => void
  
  // Export
  onExportPNG: () => void
  onExportPDF: () => void
  
  // Export options
  pngDPI: 1 | 2 | 3
  setPngDPI: (dpi: 1 | 2 | 3) => void
  pdfPageSize: 'a3' | 'a4' | 'a5' | 'letter' | 'legal'
  setPdfPageSize: (size: 'a3' | 'a4' | 'a5' | 'letter' | 'legal') => void
  pdfOrientation: 'auto' | 'portrait' | 'landscape'
  setPdfOrientation: (orientation: 'auto' | 'portrait' | 'landscape') => void
  
  // Text export
  textOrdering: 'spatial' | 'connections' | 'hierarchical'
  setTextOrdering: (ordering: 'spatial' | 'connections' | 'hierarchical') => void
  onExportTXT: () => void
  onExportRTF: () => void
  onExportOPML: () => void
  
  // Status
  currentFilePath?: string | null
  isDirty?: boolean
  schemaVersion?: number
  
  // Help
  onShowHelp: () => void
  
  // Recent files component
  recentFilesComponent?: React.ReactNode
}

export function ModernToolbar(props: ModernToolbarProps) {
  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    position: 'relative',
    zIndex: 100
  }

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.1), transparent)',
    margin: '0 4px'
  }

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }

  const statusStyle: React.CSSProperties = {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12px',
    color: 'rgba(226, 232, 240, 0.7)',
    fontWeight: 500
  }

  const fileStatusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    borderRadius: '6px',
    background: props.isDirty ? 'rgba(251, 146, 60, 0.1)' : 'rgba(34, 197, 94, 0.1)',
    border: `1px solid ${props.isDirty ? 'rgba(251, 146, 60, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
    color: props.isDirty ? '#fb923c' : '#22c55e'
  }

  // Icons as components for better scalability
  const FileIcon = () => <span style={{ fontSize: '14px' }}>📄</span>
  const SaveIcon = () => <span style={{ fontSize: '14px' }}>💾</span>
  const UndoIcon = () => <span style={{ fontSize: '14px' }}>↶</span>
  const RedoIcon = () => <span style={{ fontSize: '14px' }}>↷</span>
  const ShapeIcon = () => <span style={{ fontSize: '14px' }}>⬜</span>
  const ImageIcon = () => <span style={{ fontSize: '14px' }}>🖼️</span>
  const PdfIcon = () => <span style={{ fontSize: '14px' }}>📑</span>
  const TextIcon = () => <span style={{ fontSize: '14px' }}>📝</span>
  const HelpIcon = () => <span style={{ fontSize: '14px' }}>❓</span>

  return (
    <div style={toolbarStyle}>
      {/* File Operations */}
      <section style={sectionStyle}>
        <ModernButton
          onClick={props.onOpen}
          variant="ghost"
          size="sm"
          icon={<FileIcon />}
          title="Open Document (Ctrl+O)"
        >
          Open
        </ModernButton>
        
        {props.recentFilesComponent}
        
        <ModernButton
          onClick={props.onSave}
          variant="ghost"
          size="sm"
          icon={<SaveIcon />}
          title="Save Document (Ctrl+S)"
        >
          Save As
        </ModernButton>
        
        {props.showAutosave && props.onForceAutosave && (
          <ModernButton
            onClick={props.onForceAutosave}
            variant="success"
            size="sm"
            icon={<SaveIcon />}
            title="Force Autosave (Ctrl+Shift+S)"
          >
            Autosave
          </ModernButton>
        )}
      </section>

      <div style={separatorStyle} />

      {/* Undo/Redo */}
      <section style={sectionStyle}>
        <ModernButton
          onClick={props.onUndo}
          disabled={!props.canUndo}
          variant="ghost"
          size="sm"
          icon={<UndoIcon />}
          title={`Undo ${props.undoDescription || ''} (Ctrl+Z)`}
        >
          Undo
        </ModernButton>
        
        <ModernButton
          onClick={props.onRedo}
          disabled={!props.canRedo}
          variant="ghost"
          size="sm"
          icon={<RedoIcon />}
          title={`Redo ${props.redoDescription || ''} (Ctrl+Shift+Z)`}
        >
          Redo
        </ModernButton>
      </section>

      <div style={separatorStyle} />

      {/* Tools */}
      <section style={sectionStyle}>
        <ModernButton
          onClick={props.onCreateShape}
          variant="primary"
          size="sm"
          icon={<ShapeIcon />}
          title="Create Background Shape"
        >
          Shape
        </ModernButton>
      </section>

      <div style={separatorStyle} />

      {/* Export Options */}
      <section style={sectionStyle}>
        <ModernButton
          onClick={props.onExportPNG}
          variant="secondary"
          size="sm"
          icon={<ImageIcon />}
        >
          PNG
        </ModernButton>
        
        <ModernSelect
          value={props.pngDPI}
          onChange={(value) => props.setPngDPI(parseInt(value) as 1 | 2 | 3)}
          options={[
            { value: 1, label: '1x DPI' },
            { value: 2, label: '2x DPI' },
            { value: 3, label: '3x DPI' }
          ]}
          title="PNG Export DPI"
        />
      </section>

      <section style={sectionStyle}>
        <ModernButton
          onClick={props.onExportPDF}
          variant="secondary"
          size="sm"
          icon={<PdfIcon />}
        >
          PDF
        </ModernButton>
        
        <ModernSelect
          value={props.pdfPageSize}
          onChange={(value) => props.setPdfPageSize(value as any)}
          options={[
            { value: 'a4', label: 'A4' },
            { value: 'a3', label: 'A3' },
            { value: 'a5', label: 'A5' },
            { value: 'letter', label: 'Letter' },
            { value: 'legal', label: 'Legal' }
          ]}
          title="PDF Page Size"
        />
        
        <ModernSelect
          value={props.pdfOrientation}
          onChange={(value) => props.setPdfOrientation(value as any)}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'portrait', label: 'Portrait' },
            { value: 'landscape', label: 'Landscape' }
          ]}
          title="PDF Orientation"
        />
      </section>

      <section style={sectionStyle}>
        <ModernSelect
          value={props.textOrdering}
          onChange={(value) => props.setTextOrdering(value as any)}
          options={[
            { value: 'spatial', label: 'Spatial Order' },
            { value: 'connections', label: 'Connection Order' },
            { value: 'hierarchical', label: 'Hierarchical Order' }
          ]}
          title="Text Ordering Heuristic"
        />
        
        <ModernButton
          onClick={props.onExportTXT}
          variant="secondary"
          size="sm"
          icon={<TextIcon />}
        >
          TXT
        </ModernButton>
        
        <ModernButton
          onClick={props.onExportRTF}
          variant="secondary"
          size="sm"
          icon={<TextIcon />}
        >
          RTF
        </ModernButton>
        
        <ModernButton
          onClick={props.onExportOPML}
          variant="secondary"
          size="sm"
          icon={<TextIcon />}
        >
          OPML
        </ModernButton>
      </section>

      {/* Status */}
      <div style={statusStyle}>
        <ModernButton
          onClick={props.onShowHelp}
          variant="ghost"
          size="sm"
          icon={<HelpIcon />}
          title="Show Help (?)"
        >
          Help
        </ModernButton>
        
        <span>v{props.schemaVersion || 1}</span>
        
        {props.currentFilePath && (
          <div style={fileStatusStyle}>
            <span style={{ fontSize: '16px' }}>
              {props.isDirty ? '●' : '○'}
            </span>
            <span>
              {props.currentFilePath.split('/').pop() || props.currentFilePath}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
