import React from 'react'
import { createPortal } from 'react-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  side?: 'right' | 'left'
  width?: number
  zIndex?: number
  header?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  side = 'right',
  width = 430,
  zIndex = 2147483600,
  header,
  footer,
  children
}) => {
  if (!isOpen) return null

  // ESC key handler
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex, background: 'transparent', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 16,
          bottom: 16,
          [side]: 16 as any,
          width,
          background: 'rgba(0, 0, 0, 0.01)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '20px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
          border: '1.5px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pointerEvents: 'auto',
          transform: isOpen ? 'translateX(0)' : `translateX(${side === 'left' ? '-100%' : '100%'})`,
          opacity: isOpen ? 1 : 0,
          transition: 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {header && (
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px 20px 0 0' }}>
            {header}
          </div>
        )}
        <div
          style={{ flex: 1, overflowY: 'auto', background: 'transparent', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
          onWheel={(e) => { e.stopPropagation() }}
          onPointerMove={(e) => { e.stopPropagation() }}
          onTouchMove={(e) => { e.stopPropagation() }}
        >
          {children}
        </div>
        {footer && (
          <div style={{ position: 'sticky', bottom: 0, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default Sidebar


