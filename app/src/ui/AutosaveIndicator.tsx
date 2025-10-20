import React, { useState, useEffect } from 'react'

interface AutosaveIndicatorProps {
  style?: React.CSSProperties
}

export function AutosaveIndicator({ style }: AutosaveIndicatorProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [visible, setVisible] = useState<boolean>(false)

  useEffect(() => {
    const handleAutosaveCompleted = (event: CustomEvent) => {
      setStatus('saved')
      setMessage(`Autosaved at ${new Date(event.detail.timestamp).toLocaleTimeString()}`)
      setVisible(true)

      // Hide after 3 seconds
      setTimeout(() => {
        setVisible(false)
      }, 3000)
    }

    const handleAutosaveFailed = (event: CustomEvent) => {
      setStatus('error')
      setMessage(`Autosave failed: ${event.detail.error}`)
      setVisible(true)

      // Hide after 5 seconds for errors
      setTimeout(() => {
        setVisible(false)
      }, 5000)
    }

    const handleAutosaveStart = () => {
      setStatus('saving')
      setMessage('Autosaving...')
      setVisible(true)
    }

    // Listen for autosave events
    window.addEventListener('autosave-completed', handleAutosaveCompleted as EventListener)
    window.addEventListener('autosave-failed', handleAutosaveFailed as EventListener)

    // We'll need to dispatch a custom event when autosave starts
    // For now, we'll use a mutation observer approach
    const originalAutosave = window.autosaveDocument
    if (originalAutosave) {
      window.autosaveDocument = async (...args: any[]) => {
        handleAutosaveStart()
        try {
          const result = await originalAutosave.apply(window, args)
          return result
        } catch (error) {
          // Error will be handled by the failed event
          throw error
        }
      }
    }

    return () => {
      window.removeEventListener('autosave-completed', handleAutosaveCompleted as EventListener)
      window.removeEventListener('autosave-failed', handleAutosaveFailed as EventListener)
      // Restore original function if we replaced it
      if (originalAutosave) {
        window.autosaveDocument = originalAutosave
      }
    }
  }, [])

  if (!visible) {
    return null
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return '⏳'
      case 'saved':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '💾'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return '#ffa500'
      case 'saved':
        return '#4caf50'
      case 'error':
        return '#f44336'
      default:
        return '#666'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        backgroundColor: '#2d2d30',
        border: `1px solid ${getStatusColor()}`,
        borderRadius: 6,
        padding: '8px 12px',
        color: '#cccccc',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        zIndex: 100,
        transition: 'all 0.3s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        ...style
      }}
    >
      <span style={{ color: getStatusColor() }}>{getStatusIcon()}</span>
      <span>{message}</span>
    </div>
  )
}