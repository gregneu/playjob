import React, { useState } from 'react'
import { Html } from '@react-three/drei'
import { UserAvatar } from './UserAvatar'

interface MeetingParticipant {
  id: string
  name: string
  avatarUrl?: string
  avatarConfig?: any
  userId?: string
}

interface MeetingBadgeProps {
  position: [number, number, number]
  participants: MeetingParticipant[]
  onClick?: () => void
  isHidden?: boolean
}

export const MeetingBadge: React.FC<MeetingBadgeProps> = ({
  position,
  participants,
  onClick,
  isHidden = false
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Если бейдж скрыт или нет участников, не рендерим его
  if (isHidden || participants.length === 0) {
    return null
  }

  const firstParticipant = participants[0]
  const additionalCount = participants.length - 1

  // Обработчик клика
  const handleClick = (event: React.MouseEvent) => {
    console.log('MeetingBadge clicked:', { participantCount: participants.length })
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    
    if (onClick) {
      onClick()
    }
  }

  // Обработчики для надежности
  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  const handleMouseUp = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  return (
    <Html
      position={position}
      billboard
      occlude={false}
      className="meeting-badge"
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        cursor: 'pointer'
      }}
    >
      <div 
        className="meeting-badge-container"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(59, 130, 246, 0.6)',
          borderRadius: '12px',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          outline: 'none',
          minWidth: '60px',
          position: 'relative'
        }}
      >
        {/* Avatar of first participant */}
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <UserAvatar
            userId={firstParticipant.userId}
            userName={firstParticipant.name}
            size={24}
            showName={false}
            renderHex3D={false}
          />
        </div>

        {/* Participant count */}
        {additionalCount > 0 && (
          <span style={{
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'Inter, sans-serif'
          }}>
            +{additionalCount}
          </span>
        )}

        {/* Tooltip on hover */}
        {isHovered && participants.length > 0 && (
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
            fontSize: '11px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 10001,
            pointerEvents: 'none'
          }}>
            <div style={{ marginBottom: '4px', fontWeight: '600' }}>
              Meeting ({participants.length} participant{participants.length !== 1 ? 's' : ''})
            </div>
            {participants.map((participant, index) => (
              <div key={participant.id} style={{ 
                fontSize: '10px', 
                opacity: 0.9,
                marginBottom: index < participants.length - 1 ? '2px' : '0'
              }}>
                {participant.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </Html>
  )
}
