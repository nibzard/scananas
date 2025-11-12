import React, { useState } from 'react'

interface ModernSelectProps {
  value: string | number
  onChange: (value: string) => void
  options: Array<{ value: string | number; label: string }>
  placeholder?: string
  disabled?: boolean
  className?: string
  title?: string
}

export function ModernSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  title
}: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const selectedOption = options.find(opt => opt.value === value)

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleSelect = (optionValue: string | number) => {
    onChange(String(optionValue))
    setIsOpen(false)
  }

  const selectStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    minWidth: '120px'
  }

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 32px 8px 12px',
    background: disabled
      ? 'rgba(148, 163, 184, 0.1)'
      : isHovered || isOpen
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${disabled ? '#374151' : isHovered || isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '8px',
    color: disabled ? '#64748b' : '#e2e8f0',
    fontSize: '13px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    boxShadow: disabled
      ? 'none'
      : isOpen
        ? '0 8px 25px -8px rgba(59, 130, 246, 0.3), 0 0 0 2px rgba(59, 130, 246, 0.2)'
        : '0 2px 8px -2px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    zIndex: 1000,
    marginTop: '4px',
    background: 'rgba(17, 24, 39, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.95)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: isOpen ? 'auto' : 'none'
  }

  const optionStyle: React.CSSProperties = {
    padding: '10px 12px',
    color: '#e2e8f0',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  }

  const optionHoverStyle: React.CSSProperties = {
    ...optionStyle,
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#ffffff'
  }

  return (
    <div 
      className={className}
      style={selectStyle}
      title={title}
    >
      <div
        style={triggerStyle}
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <span style={{ 
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          fontSize: '12px'
        }}>
          ▼
        </span>
      </div>
      
      <div style={dropdownStyle}>
        {options.map((option, index) => (
          <div
            key={option.value}
            style={{
              ...optionStyle,
              ...(index === options.length - 1 ? { borderBottom: 'none' } : {})
            }}
            onClick={() => handleSelect(option.value)}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, optionHoverStyle)
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, optionStyle)
            }}
          >
            {option.label}
          </div>
        ))}
      </div>
      
      {/* Backdrop to close dropdown */}
      {isOpen && (
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
      )}
    </div>
  )
}
