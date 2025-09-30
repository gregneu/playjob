import React from 'react'

export type RocketTicketGhostStatus = 'planned' | 'done'

interface RocketTicketGhostProps {
  title: string
  ticketType?: 'story' | 'task' | 'bug' | 'test'
  priority?: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'
  originName?: string | null
  status: RocketTicketGhostStatus
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  subtitle?: string | null
  onClick?: () => void
}

const statusStyles: Record<RocketTicketGhostStatus, { label: string; background: string; color: string; opacity: number }> = {
  planned: { label: '🚀 Planned', background: 'rgba(14, 165, 233, 0.18)', color: '#0EA5E9', opacity: 0.55 },
  done: { label: '✅ Done', background: 'rgba(34, 197, 94, 0.18)', color: '#22C55E', opacity: 1 }
}

export const RocketTicketGhost: React.FC<RocketTicketGhostProps> = ({
  title,
  ticketType,
  priority,
  originName,
  status,
  onDragStart,
  onDragEnd,
  subtitle,
  onClick
}) => {
  const state = statusStyles[status]

  return (
    <div
      className="rocket-ticket-ghost"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 18,
        border: '1px dashed rgba(148, 163, 184, 0.35)',
        background: 'rgba(15, 23, 42, 0.05)',
        padding: 14,
        minHeight: 160,
        opacity: state.opacity,
        cursor: onDragStart ? 'grab' : onClick ? 'pointer' : 'default',
        gap: 10,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)'
      }}
    >
      <div
        style={{
          alignSelf: 'flex-start',
          background: state.background,
          color: state.color,
          fontSize: 12,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 999
        }}
      >
        {state.label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#0F172A',
          lineHeight: 1.35,
          flex: 1,
          overflow: 'hidden'
        }}>
          {title}
        </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748B' }}>
        <span>{ticketType ? ticketType.toUpperCase() : 'TASK'}</span>
        {priority && <span>Priority: {priority}</span>}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'rgba(15, 23, 42, 0.6)' }}>{subtitle}</div>
      )}
      {originName && (
        <div style={{ fontSize: 11, color: '#94A3B8' }}>
          From {originName}
        </div>
      )}
      </div>
    </div>
  )
}

export default RocketTicketGhost
