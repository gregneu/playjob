import React from 'react'
import { GlassPanel } from './GlassPanel'

interface LinkButtonProps {
  onLinkModeToggle?: () => void
  isLinkModeActive?: boolean
}

export const LinkButton: React.FC<LinkButtonProps> = ({ 
  onLinkModeToggle, 
  isLinkModeActive = false 
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '12px',
        zIndex: 1500
      }}
    >
      <GlassPanel
        className=""
        variant="compact"
        style={{ padding: '8px 16px' }}
      >
        <button
          onClick={onLinkModeToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            background: isLinkModeActive ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.1)',
            border: isLinkModeActive ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            transition: '0.2s'
          }}
        >
          <span style={{ fontSize: '16px' }}>🔗</span>
          <span>Link</span>
        </button>
      </GlassPanel>
    </div>
  )
}

export default LinkButton
