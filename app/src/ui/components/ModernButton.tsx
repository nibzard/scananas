import React, { useState } from 'react'

interface ModernButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  className?: string
  title?: string
  style?: React.CSSProperties
}

export function ModernButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  title,
  style = {}
}: ModernButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const baseStyle: React.CSSProperties = {
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    transform: isPressed ? 'translateY(1px) scale(0.98)' : 'translateY(0) scale(1)',
    ...style
  }

  const sizeStyles = {
    sm: {
      fontSize: '12px',
      padding: '6px 10px',
      borderRadius: '6px',
      minHeight: '28px'
    },
    md: {
      fontSize: '13px',
      padding: '8px 14px',
      borderRadius: '8px',
      minHeight: '34px'
    },
    lg: {
      fontSize: '14px',
      padding: '10px 18px',
      borderRadius: '10px',
      minHeight: '40px'
    }
  }

  const variantStyles = {
    primary: {
      background: disabled 
        ? 'linear-gradient(135deg, #94a3b8, #64748b)'
        : isHovered 
          ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
          : 'linear-gradient(135deg, #4f46e5, #3b82f6)',
      color: '#ffffff',
      boxShadow: disabled
        ? 'none'
        : isHovered
          ? '0 8px 25px -8px rgba(59, 130, 246, 0.6), 0 0 0 1px rgba(255,255,255,0.1)'
          : '0 4px 15px -4px rgba(79, 70, 229, 0.4), 0 0 0 1px rgba(255,255,255,0.05)'
    },
    secondary: {
      background: disabled
        ? 'rgba(148, 163, 184, 0.1)'
        : isHovered
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(255, 255, 255, 0.05)',
      color: disabled ? '#64748b' : '#e2e8f0',
      border: `1px solid ${disabled ? '#374151' : isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
      boxShadow: disabled
        ? 'none' 
        : '0 2px 8px -2px rgba(0, 0, 0, 0.1)'
    },
    success: {
      background: disabled
        ? 'linear-gradient(135deg, #94a3b8, #64748b)'
        : isHovered
          ? 'linear-gradient(135deg, #10b981, #059669)'
          : 'linear-gradient(135deg, #22c55e, #10b981)',
      color: '#ffffff',
      boxShadow: disabled
        ? 'none'
        : isHovered
          ? '0 8px 25px -8px rgba(34, 197, 94, 0.6)'
          : '0 4px 15px -4px rgba(34, 197, 94, 0.4)'
    },
    danger: {
      background: disabled
        ? 'linear-gradient(135deg, #94a3b8, #64748b)'
        : isHovered
          ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
          : 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#ffffff',
      boxShadow: disabled
        ? 'none'
        : isHovered
          ? '0 8px 25px -8px rgba(239, 68, 68, 0.6)'
          : '0 4px 15px -4px rgba(239, 68, 68, 0.4)'
    },
    ghost: {
      background: 'transparent',
      color: disabled ? '#64748b' : isHovered ? '#f1f5f9' : '#e2e8f0',
      border: 'none',
      boxShadow: 'none'
    }
  }

  const rippleStyle: React.CSSProperties = {
    content: '',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '0',
    height: '0',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.6)',
    transform: 'translate(-50%, -50%)',
    transition: 'width 0.6s, height 0.6s',
    zIndex: 0
  }

  const handleMouseDown = () => {
    if (!disabled) {
      setIsPressed(true)
    }
  }

  const handleMouseUp = () => {
    setIsPressed(false)
  }

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
  }

  return (
    <button
      className={className}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant]
      }}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      disabled={disabled}
      title={title}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  )
}
