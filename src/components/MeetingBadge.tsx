import React, { useState, useMemo } from 'react'
import { UserAvatar } from './UserAvatar'

interface MeetingBadgeProps {
  participants: Array<{
    id: string
    name: string
    avatarUrl?: string
    avatarConfig?: any
    userId?: string
  }>
  onClick?: () => void
  isHovered?: boolean
}

export const MeetingBadge: React.FC<MeetingBadgeProps> = ({ 
  participants, 
  onClick, 
  isHovered = false 
}) => {
  const [showTooltip, setShowTooltip] = useState(false)

  // Стили для бейджа участников встреч
  const badgeStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    background: 'rgba(0, 0, 0, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
    zIndex: 10,
    height: '28px',
    lineHeight: 1,
    position: 'relative' as const,
    overflow: 'visible' as const
  }), [isHovered])

  // Стили для анимации (аналогично notification-panel)
  const animationStyleTag = useMemo(() => (
    `<style>
      .meeting-badge {
        position: relative;
        overflow: visible;
      }
      .meeting-badge::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 24px;
        background: radial-gradient(circle, rgba(34, 197, 94, 0.55) 0%, rgba(34, 197, 94, 0) 70%);
        opacity: 0;
        animation: meeting-badge-wave 2.4s ease-out infinite;
      }
      .meeting-badge::after {
        content: '';
        position: absolute;
        inset: -9px;
        border-radius: 28px;
        border: 2px solid rgba(34, 197, 94, 0.5);
        opacity: 0;
        animation: meeting-badge-wave 2.4s ease-out infinite;
        animation-delay: 0.4s;
      }
      @keyframes meeting-badge-wave {
        0% { opacity: 0; transform: scale(0.9); }
        18% { opacity: 0.7; transform: scale(1); }
        62% { opacity: 0.25; transform: scale(1.12); }
        100% { opacity: 0; transform: scale(1.18); }
      }
      .meeting-badge-pulse {
        animation: meeting-badge-pulse 1.8s ease-in-out infinite;
      }
      @keyframes meeting-badge-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.8; }
      }
    </style>`
  ), [])

  if (!participants || participants.length === 0) {
    return null
  }

  const firstParticipant = participants[0]
  const remainingCount = participants.length - 1

  return (
    <>
      {/* Встроенные стили */}
      <span
        dangerouslySetInnerHTML={{ __html: animationStyleTag }}
        style={{ display: 'none' }}
      />
      
      <div
        className="meeting-badge meeting-badge-pulse"
        style={badgeStyle}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Аватар первого участника */}
        <div style={{ 
          width: '20px', 
          height: '20px', 
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid rgba(255, 255, 255, 0.3)'
        }}>
          <UserAvatar
            userId={firstParticipant.userId}
            userName={firstParticipant.name}
            size={20}
            showName={false}
            renderHex3D={false}
          />
        </div>

        {/* Счетчик остальных участников */}
        {remainingCount > 0 && (
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#FFFFFF',
            background: 'rgba(34, 197, 94, 0.8)',
            borderRadius: '10px',
            padding: '2px 6px',
            minWidth: '16px',
            textAlign: 'center',
            lineHeight: 1
          }}>
            +{remainingCount}
          </span>
        )}

        {/* Иконка встречи */}
        <div style={{
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="/icons/tdesign_camera-2-filled.svg" 
            alt="Meeting"
            style={{ 
              width: '14px', 
              height: '14px',
              filter: 'brightness(0) invert(1)' // Белая иконка
            }}
          />
        </div>

        {/* Tooltip с именами участников */}
        {showTooltip && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              Meeting ({participants.length} participant{participants.length !== 1 ? 's' : ''})
            </div>
            {participants.map((participant, index) => (
              <div key={participant.id} style={{ 
                fontSize: '11px',
                opacity: 0.9,
                marginBottom: index < participants.length - 1 ? '2px' : '0'
              }}>
                {participant.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default MeetingBadge