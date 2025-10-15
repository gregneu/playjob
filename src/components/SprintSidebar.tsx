import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { TicketCard } from './TicketCard'
import { type RocketTicketGhostStatus } from './RocketTicketGhost'

interface SprintSidebarTicket {
  id: string
  title: string
  ticketType: 'story' | 'task' | 'bug' | 'test'
  priority?: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh' | null
  status: RocketTicketGhostStatus
  subtitle: string
  originName?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onClick?: () => void
}

interface SprintSidebarProps {
  sprintName: string
  onSprintNameChange: (value: string) => void
  onSprintNameCommit: (value: string) => Promise<void> | void
  durationWeeks: number
  onDurationChange: (weeks: number) => void
  sprintStartedAt: Date | null
  isSprintStarted: boolean
  plannedTickets: SprintSidebarTicket[]
  doneTickets: SprintSidebarTicket[]
  onClose: () => void
  onStart: () => void
  onStop: () => void
  startDisabled: boolean
  stopDisabled: boolean
  isActionLoading: boolean
  sprintObjectId?: string | null
  sprintZoneColor?: string | null
}

const DURATION_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '2 weeks', value: 2 },
  { label: '3 weeks', value: 3 },
  { label: '1 month', value: 4 }
]

const SIDEBAR_CONTENT_PADDING = 16
const SIDEBAR_SECTION_GAP = 16
const TICKET_GRID_GAP = 4 // Match standard building sidebar grid spacing

const formatDate = (date: Date) => {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const addWeeks = (date: Date, weeks: number) => {
  const clone = new Date(date.getTime())
  clone.setDate(clone.getDate() + weeks * 7)
  return clone
}

const statusBadgeStyles: Record<RocketTicketGhostStatus, { label: string; background: string; color: string; borderColor: string }> = {
  planned: {
    label: 'Planned',
    background: '#7C3AED',
    color: '#FFFFFF',
    borderColor: '#7C3AED'
  },
  done: {
    label: 'Done',
    background: '#16A34A',
    color: '#FFFFFF',
    borderColor: '#22C55E'
  }
}

const SprintSidebar: React.FC<SprintSidebarProps> = ({
  sprintName,
  onSprintNameChange,
  onSprintNameCommit,
  durationWeeks,
  onDurationChange,
  sprintStartedAt,
  isSprintStarted,
  plannedTickets,
  doneTickets,
  onClose,
  onStart,
  onStop,
  startDisabled,
  stopDisabled,
  isActionLoading,
  sprintObjectId,
  sprintZoneColor
}) => {
  const totalTickets = plannedTickets.length + doneTickets.length
  const doneCount = doneTickets.length
  const percent = totalTickets === 0 ? 0 : Math.round((doneCount / totalTickets) * 100)

  const startDate = sprintStartedAt ?? new Date()
  const endDate = addWeeks(startDate, durationWeeks)

  const durationDisabled = isSprintStarted || isActionLoading

  const [isEditingName, setIsEditingName] = useState(false)
  const [localName, setLocalName] = useState(sprintName)

  useEffect(() => {
    setLocalName(sprintName)
  }, [sprintName])

  const handleNameCommit = useCallback(async () => {
    const trimmed = localName.trim() || 'Sprint'
    setLocalName(trimmed)
    onSprintNameChange(trimmed)
    await onSprintNameCommit(trimmed)
    setIsEditingName(false)
  }, [localName, onSprintNameChange, onSprintNameCommit])

  const orderedTickets = useMemo(() => [...plannedTickets, ...doneTickets], [plannedTickets, doneTickets])
  const hasTickets = orderedTickets.length > 0

  return (
    <div data-sprint-sidebar style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 134,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 16px 16px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px 20px 0 0',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <button
              type="button"
              onClick={(event) => {
                if (!sprintObjectId) return
                const sidebarElement = event.currentTarget.closest('[data-sprint-sidebar]') as HTMLElement | null
                const sidebarRect = sidebarElement?.getBoundingClientRect()
                const buttonRect = event.currentTarget.getBoundingClientRect()
                const anchorX = sidebarRect ? sidebarRect.right : buttonRect.left + buttonRect.width / 2
                const anchorY = buttonRect.top + buttonRect.height / 2
                const position = { x: anchorX, y: anchorY }

                window.dispatchEvent(new CustomEvent('open-zone-color-picker', {
                  detail: {
                    position,
                    currentColor: sprintZoneColor ?? null,
                    zoneId: sprintObjectId
                  }
                }))
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: sprintZoneColor ?? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
                border: 'none',
                cursor: sprintObjectId ? 'pointer' : 'default',
                padding: 0
              }}
              title={sprintObjectId ? 'Change sprint zone color' : 'Open the sprint zone on the map to enable color change'}
              disabled={!sprintObjectId}
            >
              <svg width="24" height="20" viewBox="0 0 24 24" style={{ display: 'block' }}>
                <path
                  d="M10.425 1.41397L3.65 5.40997C3.14964 5.6882 2.7328 6.09518 2.44268 6.58874C2.15256 7.08229 1.99972 7.64446 2 8.21697V15.502C2.00078 16.0802 2.15693 16.6475 2.45213 17.1447C2.74733 17.6418 3.17072 18.0505 3.678 18.328L10.373 22.565C11.407 23.135 12.593 23.135 13.573 22.597L20.377 18.295C21.357 17.758 22 16.677 22 15.502V8.21797L21.995 8.01397C21.9676 7.54621 21.8385 7.09005 21.6167 6.67728C21.395 6.26451 21.0859 5.90506 20.711 5.62397L20.604 5.54897L20.597 5.54197C20.5415 5.49143 20.4808 5.44685 20.416 5.40897L13.64 1.41397C13.1476 1.14242 12.5944 1 12.032 1C11.4696 1 10.9164 1.14242 10.424 1.41397H10.425Z"
                  fill={sprintZoneColor ? '#0f172a' : '#ffffff'}
                />
              </svg>
            </button>
            {isEditingName ? (
              <input
                value={localName}
                onChange={(event) => {
                  setLocalName(event.currentTarget.value)
                  onSprintNameChange(event.currentTarget.value)
                }}
                onBlur={handleNameCommit}
                onKeyDown={async (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    await handleNameCommit()
                  } else if (event.key === 'Escape') {
                    setLocalName(sprintName)
                    onSprintNameChange(sprintName)
                    setIsEditingName(false)
                  }
                }}
                disabled={isActionLoading}
                autoFocus
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontFamily: 'Inter, sans-serif',
                  color: '#0F172A',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: 10,
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.9)'
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => !isActionLoading && setIsEditingName(true)}
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontFamily: 'Inter, sans-serif',
                  color: '#0F172A',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  padding: 0,
                  cursor: isActionLoading ? 'default' : 'text'
                }}
                title="Click to rename sprint"
              >
                {sprintName}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 18,
              height: 18,
              background: 'none',
              border: 'none',
              fontSize: 16,
              cursor: 'pointer',
              color: '#0F172A',
              padding: 0,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {DURATION_OPTIONS.map((option) => {
            const isActive = durationWeeks === option.value
            return (
              <button
                key={option.value}
                onClick={() => !durationDisabled && onDurationChange(option.value)}
                disabled={durationDisabled}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: isActive ? '1px solid rgba(14, 165, 233, 0.65)' : '1px solid rgba(148, 163, 184, 0.35)',
                  color: isActive ? '#0EA5E9' : '#475569',
                  background: isActive ? 'rgba(14, 165, 233, 0.12)' : 'rgba(148, 163, 184, 0.1)',
                  cursor: durationDisabled ? 'not-allowed' : 'pointer',
                  opacity: durationDisabled && !isActive ? 0.6 : 1
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div
          style={{
            padding: SIDEBAR_CONTENT_PADDING,
            display: 'flex',
            flexDirection: 'column',
            gap: SIDEBAR_SECTION_GAP
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
              <span>{isSprintStarted ? `Started ${formatDate(startDate)}` : `Starts ${formatDate(startDate)}`}</span>
              <span>{`Ends ${formatDate(endDate)}`}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(148, 163, 184, 0.25)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(5, percent)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #38BDF8 0%, #818CF8 100%)'
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(71,85,105,0.7)' }}>{doneCount}/{totalTickets} done ({percent}%)</div>
          </div>

          {hasTickets ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: TICKET_GRID_GAP,
                alignItems: 'stretch'
              }}
            >
              {orderedTickets.map((ticket, index) => {
                const badge = statusBadgeStyles[ticket.status]
                return (
                  <div
                    key={ticket.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <TicketCard
                      id={ticket.id}
                      title={ticket.title}
                      priority={ticket.priority || undefined}
                      assigneeId={ticket.assigneeId || undefined}
                      assigneeName={ticket.assigneeName || undefined}
                      draggable={Boolean(ticket.onDragStart)}
                      onClick={ticket.onClick ? (event) => {
                        event.stopPropagation()
                        ticket.onClick?.()
                      } : undefined}
                      onDragStart={ticket.onDragStart}
                      onDragEnd={ticket.onDragEnd}
                      customBorderColor={badge.borderColor}
                      statusBadge={{
                        label: badge.label,
                        background: badge.background,
                        color: badge.color
                      }}
                      fullWidth
                      hidePriorityLabel
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Drag tickets here to plan this sprint.</div>
          )}
        </div>
      </div>

      <footer style={{ display: 'flex', gap: 12, padding: '0 16px 16px 16px' }}>
        {isSprintStarted ? (
          <button
            onClick={onStop}
            disabled={stopDisabled}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: stopDisabled ? 'rgba(248, 113, 113, 0.35)' : '#EF4444',
              color: 'white',
              fontWeight: 700,
              cursor: stopDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform 0.15s ease'
            }}
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            onClick={onStart}
            disabled={startDisabled}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: startDisabled ? 'rgba(34, 197, 94, 0.35)' : '#22C55E',
              color: 'white',
              fontWeight: 700,
              cursor: startDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform 0.15s ease'
            }}
          >
            ▶ Play
          </button>
        )}
      </footer>
    </div>
  )
}

export default SprintSidebar
export type { SprintSidebarTicket, SprintSidebarProps }
