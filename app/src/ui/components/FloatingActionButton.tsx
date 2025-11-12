import React, { useState } from 'react'
import { ModernButton } from './ModernButton'

interface FloatingAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}

interface FloatingActionButtonProps {
  actions: FloatingAction[]
}

export function FloatingActionButton({ actions }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 1000
  }

  const fabStyle: React.CSSProperties = {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
    border: 'none',
    boxShadow: '0 8px 25px -8px rgba(79, 70, 229, 0.6), 0 0 0 1px rgba(255,255,255,0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '24px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
    backdropFilter: 'blur(20px)'
  }

  const actionsContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '70px',
    right: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: isOpen ? 'auto' : 'none'
  }

  const actionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(17, 24, 39, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50px',
    padding: '8px 16px',
    color: '#f1f5f9',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 25px -8px rgba(0, 0, 0, 0.3)',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }

  const handleActionClick = (action: FloatingAction) => {
    action.onClick()
    setIsOpen(false)
  }

  return (
    <div style={containerStyle}>
      {/* Action items */}
      <div style={actionsContainerStyle}>
        {actions.map((action, index) => (
          <div
            key={action.id}
            style={{
              ...actionStyle,
              transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
            }}
            onClick={() => handleActionClick(action)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(79, 70, 229, 0.2)'
              e.currentTarget.style.transform = 'translateX(-4px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(17, 24, 39, 0.95)'
              e.currentTarget.style.transform = 'translateX(0)'
            }}
          >
            <span style={{ fontSize: '16px' }}>{action.icon}</span>
            <span>{action.label}</span>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <button
        style={fabStyle}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = `${isOpen ? 'rotate(45deg)' : 'rotate(0deg)'} scale(1.1)`
          e.currentTarget.style.boxShadow = '0 12px 35px -8px rgba(79, 70, 229, 0.8), 0 0 0 1px rgba(255,255,255,0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = `${isOpen ? 'rotate(45deg)' : 'rotate(0deg)'} scale(1)`
          e.currentTarget.style.boxShadow = '0 8px 25px -8px rgba(79, 70, 229, 0.6), 0 0 0 1px rgba(255,255,255,0.1)'
        }}
      >
        +
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(2px)',
            zIndex: -1
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
