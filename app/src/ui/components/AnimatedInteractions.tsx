import React, { useEffect, useState } from 'react'

interface AnimatedInteractionsProps {
  children: React.ReactNode
}

export function AnimatedInteractions({ children }: AnimatedInteractionsProps) {
  const [interactions, setInteractions] = useState<Array<{
    id: string
    x: number
    y: number
    timestamp: number
    type: 'click' | 'hover'
  }>>([])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const newInteraction = {
        id: `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
        type: 'click' as const
      }
      
      setInteractions(prev => [...prev, newInteraction])
      
      // Remove interaction after animation completes
      setTimeout(() => {
        setInteractions(prev => prev.filter(i => i.id !== newInteraction.id))
      }, 1000)
    }

    document.addEventListener('click', handleClick)
    
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
      
      {/* Click ripple effects */}
      {interactions.map(interaction => (
        <div
          key={interaction.id}
          style={{
            position: 'fixed',
            left: interaction.x - 15,
            top: interaction.y - 15,
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79, 70, 229, 0.6) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'ripple 1s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            transform: 'scale(0)',
          }}
        />
      ))}
      
      <style jsx>{`
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
