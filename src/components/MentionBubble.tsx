import React from 'react'

interface MentionBubbleProps {
  hasMentions: boolean
}

export const MentionBubble: React.FC<MentionBubbleProps> = ({ hasMentions }) => {
  if (!hasMentions) return null

  const size = 30

  return (
    <div
      style={{
        width: size,
        height: size,
        pointerEvents: 'none',
        position: 'relative'
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: '#FFFFFF',
          border: '2px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.5)',
          animation: 'pulse-glow 2s ease-in-out infinite'
        }}
      >
        💬
      </div>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 4px 20px rgba(59, 130, 246, 0.8);
          }
        }
      `}</style>
    </div>
  )
}

export default MentionBubble

