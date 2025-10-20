import React from 'react'
import { recoverFromAutosave } from '../bridge/tauri'

interface AutosaveInfo {
  original_path: string
  recovery_path: string
  timestamp: string
}

interface RecoveryDialogProps {
  recoveryFiles: AutosaveInfo[]
  onRecover: (doc: any, originalPath: string) => void
  onDismiss: () => void
  onDeleteAll: () => void
}

export function RecoveryDialog({ recoveryFiles, onRecover, onDismiss, onDeleteAll }: RecoveryDialogProps) {
  const [loading, setLoading] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handleRecover = async (recoveryFile: AutosaveInfo) => {
    setLoading(recoveryFile.recovery_path)
    setError(null)

    try {
      const doc = await recoverFromAutosave(recoveryFile.recovery_path)
      onRecover(doc, recoveryFile.original_path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recover document')
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp
    }
  }

  if (recoveryFiles.length === 0) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2d2d30',
        border: '1px solid #3e3e42',
        borderRadius: 8,
        padding: 24,
        maxWidth: 600,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        color: '#cccccc'
      }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#ffffff' }}>
          🔄 Recovery Files Found
        </h2>

        <p style={{ margin: '0 0 20px 0', lineHeight: 1.5 }}>
          The application found unsaved changes from previous sessions. You can recover these documents or dismiss them.
        </p>

        {error && (
          <div style={{
            backgroundColor: '#4d1f1f',
            border: '1px solid #8b3333',
            borderRadius: 4,
            padding: 12,
            marginBottom: 16,
            color: '#ff6b6b'
          }}>
            ❌ {error}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          {recoveryFiles.map((recoveryFile, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#3e3e42',
                border: '1px solid #555',
                borderRadius: 6,
                padding: 16,
                marginBottom: 12
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#ffffff', marginBottom: 4 }}>
                    📄 {recoveryFile.original_path}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: 8 }}>
                    💾 Saved: {formatDate(recoveryFile.timestamp)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    📁 Recovery: {recoveryFile.recovery_path}
                  </div>
                </div>
                <button
                  onClick={() => handleRecover(recoveryFile)}
                  disabled={loading === recoveryFile.recovery_path}
                  style={{
                    backgroundColor: loading === recoveryFile.recovery_path ? '#666' : '#1f6feb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '8px 16px',
                    cursor: loading === recoveryFile.recovery_path ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    marginLeft: 12
                  }}
                >
                  {loading === recoveryFile.recovery_path ? '⏳ Recovering...' : '🔄 Recover'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onDeleteAll}
            style={{
              backgroundColor: '#8b3333',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🗑️ Delete All Recovery Files
          </button>
          <button
            onClick={onDismiss}
            style={{
              backgroundColor: '#555',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ❌ Dismiss All
          </button>
        </div>
      </div>
    </div>
  )
}