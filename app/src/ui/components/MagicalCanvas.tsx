import React, { useRef, useEffect, useState } from 'react'

interface MagicalCanvasProps {
  children: React.ReactNode
}

export function MagicalCanvas({ children }: MagicalCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }

    const handleMouseEnter = () => setIsHovering(true)
    const handleMouseLeave = () => setIsHovering(false)

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseenter', handleMouseEnter)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseenter', handleMouseEnter)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    borderRadius: '12px',
    boxShadow: `
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 1px 3px rgba(0, 0, 0, 0.1),
      0 1px 2px rgba(0, 0, 0, 0.06)
    `
  }

  const glowStyle: React.CSSProperties = {
    position: 'absolute',
    top: mousePos.y - 100,
    left: mousePos.x - 100,
    width: '200px',
    height: '200px',
    background: `radial-gradient(circle, 
      rgba(99, 102, 241, ${isHovering ? 0.1 : 0}) 0%, 
      rgba(59, 130, 246, ${isHovering ? 0.05 : 0}) 50%, 
      transparent 70%
    )`,
    borderRadius: '50%',
    pointerEvents: 'none',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1
  }

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%)
    `,
    pointerEvents: 'none',
    zIndex: 0
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* Magical background glow effects */}
      <div style={overlayStyle} />
      <div style={glowStyle} />
      
      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  )
}
