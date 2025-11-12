import React from 'react'

interface ModernInspectorProps {
  children: React.ReactNode
  title?: string
}

export function ModernInspector({ children, title = "Inspector" }: ModernInspectorProps) {
  const containerStyle: React.CSSProperties = {
    width: '280px',
    height: '100%',
    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
    backdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1), -2px 0 4px -1px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 10
  }

  const headerStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(59, 130, 246, 0.05))'
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
    letterSpacing: '-0.025em'
  }

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '0'
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>{title}</h2>
      </div>
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  )
}

interface ModernTabsProps {
  tabs: Array<{ id: string; label: string; icon?: React.ReactNode }>
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function ModernTabs({ tabs, activeTab, onTabChange }: ModernTabsProps) {
  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(0, 0, 0, 0.1)'
  }

  return (
    <div style={tabsStyle}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            background: activeTab === tab.id 
              ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.3), rgba(59, 130, 246, 0.2))'
              : 'transparent',
            color: activeTab === tab.id ? '#f1f5f9' : 'rgba(226, 232, 240, 0.7)',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderBottom: activeTab === tab.id ? '2px solid #4f46e5' : '2px solid transparent',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.color = '#e2e8f0'
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)'
            }
          }}
        >
          {tab.icon && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

interface ModernSectionProps {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
}

export function ModernSection({ 
  title, 
  children, 
  icon, 
  collapsible = false, 
  defaultCollapsed = false 
}: ModernSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(255, 255, 255, 0.02)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: collapsible ? 'pointer' : 'default'
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#cbd5e1',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }

  const contentStyle: React.CSSProperties = {
    padding: isCollapsed ? '0' : '16px',
    maxHeight: isCollapsed ? '0' : '1000px',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    background: 'rgba(0, 0, 0, 0.1)'
  }

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed)
    }
  }

  return (
    <div>
      <div style={headerStyle} onClick={toggleCollapse}>
        <div style={titleStyle}>
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </div>
        {collapsible && (
          <span style={{
            fontSize: '12px',
            color: '#64748b',
            transition: 'transform 0.2s ease',
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
          }}>
            ▼
          </span>
        )}
      </div>
      <div style={contentStyle}>
        {!isCollapsed && children}
      </div>
    </div>
  )
}

interface ModernInputProps {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: 'text' | 'number'
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

export function ModernInput({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder,
  min,
  max,
  step
}: ModernInputProps) {
  const containerStyle: React.CSSProperties = {
    marginBottom: '16px'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: '6px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: '#f1f5f9',
    fontSize: '13px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    boxSizing: 'border-box' as const
  }

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = 'rgba(79, 70, 229, 0.5)'
          e.target.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.1)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
