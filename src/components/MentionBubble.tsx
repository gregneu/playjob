import React from 'react'

interface MentionBubbleProps {
  hasMentions: boolean
}

export const MentionBubble: React.FC<MentionBubbleProps> = ({ hasMentions }) => {
  if (!hasMentions) return null

  return (
    <div 
      className="ticket-badge mention-badge"
      style={{
        background: '#F97316',
        color: 'white',
        borderRadius: '50%',
        width: '20px',
        minHeight: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 700,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        border: '2px solid white',
        pointerEvents: 'auto',
        zIndex: 10,
        cursor: 'pointer',
        lineHeight: 1
      }}
      title="New comments"
    >
      💬
    </div>
  )
}

export default MentionBubble
