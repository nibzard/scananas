import React, { useState, useEffect } from 'react'
import { getRecentFiles, clearRecentFiles } from '../bridge/tauri'
import { ModernButton } from './components/ModernButton'

interface RecentFilesProps {
  onOpenRecentFile: (filePath: string) => void
}

export function RecentFiles({ onOpenRecentFile }: RecentFilesProps) {
  const [recentFiles, setRecentFiles] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load recent files when component mounts
  useEffect(() => {
    loadRecentFiles()
  }, [])

  const loadRecentFiles = async () => {
    try {
      setIsLoading(true)
      const files = await getRecentFiles()
      setRecentFiles(files)
    } catch (error) {
      console.warn('Failed to load recent files:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearRecentFiles = async () => {
    try {
      await clearRecentFiles()
      setRecentFiles([])
      setIsOpen(false)
    } catch (error) {
      console.warn('Failed to clear recent files:', error)
    }
  }

  const handleOpenRecentFile = (filePath: string) => {
    onOpenRecentFile(filePath)
    setIsOpen(false)
  }

  // Extract filename from path for display
  const getDisplayName = (filePath: string) => {
    const parts = filePath.split(/[/\\]/)
    return parts[parts.length - 1] || filePath
  }

  // Format file path for display (shorten if too long)
  const formatPath = (filePath: string) => {
    const maxLength = 60
    if (filePath.length <= maxLength) return filePath

    const parts = filePath.split(/[/\\]/)
    const filename = parts[parts.length - 1]
    const pathParts = parts.slice(0, -1)

    // Try to keep first and last parts of the path
    if (pathParts.length <= 2) {
      return filePath
    }

    return `.../${pathParts.slice(-1).join('/')}/${filename}`
  }

  return (
    <div style={{ position: 'relative' }}>
      <ModernButton
        onClick={() => setIsOpen(!isOpen)}
        variant={isOpen ? 'primary' : 'ghost'}
        size="sm"
        icon={<span style={{ fontSize: '14px' }}>📂</span>}
        title="Open recent file"
        style={{
          position: 'relative'
        }}
      >
        Recent
        {recentFiles.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '10px',
            minWidth: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
          }}>
            {recentFiles.length}
          </span>
        )}
      </ModernButton>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              background: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              minWidth: 320,
              maxWidth: 450,
              zIndex: 1000,
              overflow: 'hidden',
              marginTop: '8px'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 16px 12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#f1f5f9',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                Recent Files
              </span>
              {recentFiles.length > 0 && (
                <ModernButton
                  onClick={handleClearRecentFiles}
                  variant="ghost"
                  size="sm"
                  title="Clear recent files"
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    color: 'rgba(148, 163, 184, 0.8)'
                  }}
                >
                  Clear All
                </ModernButton>
              )}
            </div>

            {/* Files list */}
            {isLoading ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#999',
                fontSize: '12px'
              }}>
                Loading...
              </div>
            ) : recentFiles.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#999',
                fontSize: '12px',
                fontStyle: 'italic'
              }}>
                No recent files
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {recentFiles.map((filePath, index) => (
                  <button
                    key={filePath}
                    onClick={() => handleOpenRecentFile(filePath)}
                    style={{
                      ...menuButtonStyle,
                      borderBottom: index === recentFiles.length - 1 ? 'none' : '1px solid #333',
                      textAlign: 'left',
                      width: '100%'
                    }}
                    title={filePath}
                  >
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#fff'
                      }}>
                        {getDisplayName(filePath)}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: '#999',
                        fontFamily: 'monospace'
                      }}>
                        {formatPath(filePath)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  background: '#333',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: '12px',
  whiteSpace: 'nowrap'
}

const smallButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  transition: 'background-color 0.2s'
}

const menuButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '8px 12px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  width: '100%',
  textAlign: 'left',
  fontSize: '12px'
}

// Add hover effect
menuButtonStyle.toString = () => `
  background: transparent;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;
  text-align: left;
  font-size: 12px;
`