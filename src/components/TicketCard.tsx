import React, { useMemo, useRef, useState } from 'react'
import { UserAvatar } from './UserAvatar'

type TicketPriority = 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'

interface TicketCardProps {
  id: string
  title: string
  priority?: TicketPriority
  assigneeId?: string | null
  assigneeName?: string | null
  draggable?: boolean
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  isPlannedInSprint?: boolean
  sprintName?: string
  isDone?: boolean
  onSprintBadgeClick?: () => void
  customBorderColor?: string
  statusBadge?: {
    label: string
    background?: string
    color?: string
  }
  fullWidth?: boolean
  hidePriorityLabel?: boolean
  unreadCommentCount?: number
  unseenAssignmentCount?: number
}

const getPriorityIcon = (priority: TicketPriority | undefined): string => {
  const pr = priority || 'medium'
  switch (pr) {
    case 'veryhigh': return 'loicon-veryhigh'
    case 'high': return 'loicon-high'
    case 'medium': return 'loicon-medium'
    case 'low': return 'loicon-low'
    case 'v-low': return 'loicon-v-low'
    default: return 'loicon-medium'
  }
}

const getPriorityLabel = (priority: TicketPriority | undefined): string => {
  const pr = priority || 'medium'
  return pr === 'veryhigh' ? 'Very High' : pr === 'high' ? 'High' : pr === 'medium' ? 'Medium' : pr === 'low' ? 'Low' : 'Very Low'
}

const getIconFilter = (_priority: TicketPriority | undefined): string => {
  // Use native icon colors
  return 'none'
}

export const TicketCard: React.FC<TicketCardProps> = ({
  id,
  title,
  priority,
  assigneeId,
  assigneeName,
  draggable,
  onClick,
  onDragStart,
  onDragEnd,
  isPlannedInSprint,
  sprintName,
  isDone,
  onSprintBadgeClick,
  customBorderColor,
  statusBadge,
  fullWidth,
  hidePriorityLabel = false,
  unreadCommentCount = 0,
  unseenAssignmentCount = 0
}) => {
  // ДОБАВЛЯЕМ ЛОГИРОВАНИЕ ПРИ РЕНДЕРЕ
  console.log('🎨 TicketCard: RENDERING ticket:', id, title, 'draggable:', draggable)

  const priorityLabel = getPriorityLabel(priority)
  const hasCommentUpdate = (unreadCommentCount ?? 0) > 0
  const hasAssignmentUpdate = (unseenAssignmentCount ?? 0) > 0
  const hasUpdates = hasCommentUpdate || hasAssignmentUpdate

  const notificationStyleTag = useMemo(() => (
    `<style>
      .ticket-card { overflow: visible; position: relative; }
      .ticket-card--updates::before,
      .ticket-card--updates::after {
        content: '';
        position: absolute;
        inset: -8px;
        border-radius: 24px;
        pointer-events: none;
        opacity: 0;
      }
      .ticket-card--updates::before {
        background: radial-gradient(circle, rgba(68, 132, 255, 0.32) 0%, rgba(68, 132, 255, 0) 70%);
        animation: ticket-card-wave 2.6s ease-out infinite;
      }
      .ticket-card--updates::after {
        border: 2px solid rgba(68, 132, 255, 0.4);
        inset: -12px;
        animation: ticket-card-wave 2.6s ease-out infinite;
        animation-delay: 0.45s;
      }
      @keyframes ticket-card-wave {
        0% { opacity: 0; transform: scale(0.92); }
        18% { opacity: 0.55; transform: scale(1); }
        60% { opacity: 0.2; transform: scale(1.1); }
        100% { opacity: 0; transform: scale(1.18); }
      }
      .ticket-card-avatar {
        flex: 1;
        min-width: 0;
      }
      .ticket-card-avatar span {
        max-width: 110px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
      .notification-icon {
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
        transform-origin: center;
      }
      .notification-icon--comment {
        animation: notification-comment-pulse 1.8s ease-in-out infinite;
      }
      .notification-icon--assignment {
        animation: notification-assignment-pulse 1.8s ease-in-out infinite;
        animation-delay: 0.4s;
      }
      @keyframes notification-comment-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.32); opacity: 0.78; }
      }
      @keyframes notification-assignment-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.32); opacity: 0.78; }
      }
    </style>`
  ), [])

  const updateIndicators: React.ReactNode[] = useMemo(() => {
    const indicators: React.ReactNode[] = []
    if (hasCommentUpdate) {
      indicators.push((
        <div
          key="comment"
          style={{ display: 'flex', alignItems: 'center', gap: unreadCommentCount > 1 ? 4 : 0 }}
        >
          <img
            src="/icons/stash_comments-solid.svg"
            alt="comment updates"
            style={{ width: 16, height: 16 }}
            className="notification-icon notification-icon--comment"
          />
          {unreadCommentCount > 1 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>{unreadCommentCount}</span>
          )}
        </div>
      ))
    }
    if (hasAssignmentUpdate) {
      indicators.push((
        <div
          key="assignment"
          style={{ display: 'flex', alignItems: 'center', gap: unseenAssignmentCount > 1 ? 4 : 0 }}
        >
          <img
            src="/icons/my_new_ticket.svg"
            alt="assignment updates"
            style={{ width: 16, height: 16 }}
            className="notification-icon notification-icon--assignment"
          />
          {unseenAssignmentCount > 1 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>{unseenAssignmentCount}</span>
          )}
        </div>
      ))
    }
    return indicators
  }, [hasCommentUpdate, hasAssignmentUpdate, unreadCommentCount, unseenAssignmentCount])

  const cardClassName = hasUpdates ? 'ticket-card ticket-card--updates' : 'ticket-card'
  const cardRef = useRef<HTMLDivElement>(null)
  const [mouseHover, setMouseHover] = useState(false)
  const isClickable = Boolean(onClick)

  const SCALE_X = 8
  const SCALE_Y = 12

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mouseHover || !cardRef.current) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const currentWidth = cardRef.current.offsetWidth || 0
    const currentHeight = cardRef.current.offsetHeight || 0
    
    // Use current dimensions directly instead of state
    const rotateX = (y / currentHeight) * -(SCALE_Y * 2) + SCALE_Y
    const rotateY = (x / currentWidth) * (SCALE_X * 2) - SCALE_X
    
    if (cardRef.current) {
      cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`
    }
  }

  const handleMouseEnter = () => {
    console.log('🖱️ TicketCard: onMouseEnter triggered for ticket:', id, title)
    console.log('🖱️ TicketCard: draggable prop:', draggable)
    console.log('🖱️ TicketCard: cardRef.current exists:', !!cardRef.current)
    
    // Проверяем draggable атрибут в DOM
    if (cardRef.current) {
      console.log('🖱️ TicketCard: DOM draggable attribute:', cardRef.current.draggable)
      console.log('🖱️ TicketCard: DOM element:', cardRef.current)
    }
    
    setMouseHover(true)
  }

  const handleMouseLeave = () => {
    console.log('🖱️ TicketCard: onMouseLeave triggered for ticket:', id, title)
    setMouseHover(false)
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
    }
  }

  const borderStyle = React.useMemo(() => {
    if (customBorderColor) {
      return `4px solid ${customBorderColor}`
    }
    if (isDone) return '4px solid #22C55E'
    if (isPlannedInSprint) return '4px solid #B97FF9'
    return '1px solid rgba(255, 255, 255, 0.2)'
  }, [customBorderColor, isDone, isPlannedInSprint])

  return (
    <div
      ref={cardRef}
      key={id}
      className={cardClassName}
      onClick={(e) => {
        console.log('🖱️ TicketCard: onClick triggered for ticket:', id, title)
        console.log('🖱️ TicketCard: event type:', e.type)
        console.log('🖱️ TicketCard: event defaultPrevented:', e.defaultPrevented)
        if (onClick) {
          onClick(e)
        }
      }}
      onDoubleClick={(e) => {
        console.log('🖱️ TicketCard: onDoubleClick triggered for ticket:', id, title)
        console.log('🖱️ TicketCard: draggable:', draggable)
        
        // Тестовый способ - двойной клик для инициализации drag
        if (draggable && onDragStart) {
          console.log('🚀 TicketCard: Double-click drag test - calling onDragStart...')
          const syntheticEvent = {
            ...e,
            dataTransfer: {
              setData: (type: string, data: string) => {
                console.log('🎯 TicketCard: setData called:', type, data)
              },
              effectAllowed: 'move'
            },
            preventDefault: () => {},
            stopPropagation: () => {}
          } as any
          onDragStart(syntheticEvent)
        }
      }}
      draggable={Boolean(draggable)}
      onDragStart={(e) => {
        console.log('🎯 TicketCard: onDragStart triggered for ticket:', id, title)
        console.log('🎯 TicketCard: draggable prop:', draggable)
        console.log('🎯 TicketCard: onDragStart function exists:', !!onDragStart)
        console.log('🎯 TicketCard: dataTransfer exists:', !!e.dataTransfer)
        console.log('🎯 TicketCard: DOM element draggable attribute:', e.currentTarget.draggable)
        console.log('🎯 TicketCard: DOM element:', e.currentTarget)
        
        try {
          if (onDragStart) {
            console.log('🚀 TicketCard: Calling parent onDragStart function...')
            onDragStart(e)
            console.log('✅ TicketCard: Parent onDragStart called successfully!')
          } else {
            console.log('❌ TicketCard: No parent onDragStart function provided')
          }
        } catch (error) {
          console.error('❌ TicketCard: Error calling parent onDragStart:', error)
        }
      }}
      onDragEnd={() => {
        console.log('🎯 TicketCard: onDragEnd triggered for ticket:', id, title)
        
        try {
          if (onDragEnd) {
            console.log('🚀 TicketCard: Calling parent onDragEnd function...')
            onDragEnd()
            console.log('✅ TicketCard: Parent onDragEnd called successfully!')
          } else {
            console.log('❌ TicketCard: No parent onDragEnd function provided')
          }
        } catch (error) {
          console.error('❌ TicketCard: Error calling parent onDragEnd:', error)
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(e) => {
        console.log('🖱️ TicketCard: onMouseDown triggered for ticket:', id, title)
        console.log('🖱️ TicketCard: event type:', e.type)
        console.log('🖱️ TicketCard: event button:', e.button)
        console.log('🖱️ TicketCard: draggable:', draggable)
        console.log('🖱️ TicketCard: Mouse button pressed, waiting for drag to start...')
        
        // Принудительно инициализируем drag если draggable=true
        if (draggable && e.button === 0) { // Левая кнопка мыши
          console.log('🚀 TicketCard: Forcing drag initialization...')
          console.log('🚀 TicketCard: Setting draggable attribute on DOM element...')
          
          // Принудительно устанавливаем draggable на DOM элемент
          if (cardRef.current) {
            cardRef.current.draggable = true
            console.log('🚀 TicketCard: DOM element draggable set to:', cardRef.current.draggable)
          }
          
          // Создаем искусственное событие dragstart
          setTimeout(() => {
            if (onDragStart) {
              console.log('🎯 TicketCard: Simulating onDragStart...')
              const syntheticEvent = {
                ...e,
                dataTransfer: {
                  setData: (type: string, data: string) => {
                    console.log('🎯 TicketCard: setData called:', type, data)
                  },
                  effectAllowed: 'move'
                },
                preventDefault: () => {},
                stopPropagation: () => {}
              } as any
              onDragStart(syntheticEvent)
            }
          }, 100)
        }
      }}
      onDragEnter={() => {
        console.log('🎯 TicketCard: onDragEnter triggered for ticket:', id, title)
      }}
      onDragOver={() => {
        console.log('🎯 TicketCard: onDragOver triggered for ticket:', id, title)
      }}
      onDrag={(e) => {
        console.log('🎯 TicketCard: onDrag triggered for ticket:', id, title)
        console.log('🎯 TicketCard: drag event:', e)
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: borderStyle,
        borderRadius: 18,
        background: 'rgba(0, 0, 0, 0.59)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: 14,
        boxShadow: mouseHover ? '0 8px 32px rgba(0,0,0,0.15)' : '0 4px 14px rgba(0,0,0,0.06)',
        cursor: draggable ? 'grab' : (isClickable ? 'pointer' : 'default'),
        height: 165,
        maxWidth: fullWidth ? '100%' : '180px',
        width: fullWidth ? '100%' : 'auto',
        position: 'relative',
        transition: 'transform 0.1s ease-out, box-shadow 0.2s ease-out',
        transformStyle: 'preserve-3d',
        willChange: 'transform'
      } as React.CSSProperties}
    >
      {hasUpdates && <span dangerouslySetInnerHTML={{ __html: notificationStyleTag }} style={{ display: 'none' }} />}
      {/* Done badge */}
      {isDone && !statusBadge && (
        <div style={{
          position: 'absolute',
          top: -8,
          left: -8,
          background: '#22C55E',
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: 700,
          padding: '4px 8px',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
          zIndex: 10
        }}>
          Done
        </div>
      )}
      {/* Sprint badge */}
      {isPlannedInSprint && !statusBadge && (
        <div 
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'linear-gradient(135deg, #5646FF 0%, #8B5CF6 25%, #A855F7 50%, #C084FC 75%, #5646FF 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            height: '23px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          } as React.CSSProperties}
          onClick={(e) => {
            e.stopPropagation()
            console.log('Sprint badge clicked in TicketCard')
            if (onSprintBadgeClick) {
              onSprintBadgeClick()
            }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(86, 70, 255, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {sprintName || 'Sprint'}
        </div>
      )}
      {statusBadge && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: statusBadge.background || 'rgba(79, 70, 229, 0.18)',
            color: statusBadge.color || '#4C1D95',
            borderRadius: 999,
            padding: '2px 8px',
            height: 23,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {statusBadge.label}
        </div>
      )}
      {/* Header: priority */}
      <div style={{ display: 'flex', alignItems: 'center', gap: hidePriorityLabel ? 0 : 8, marginBottom: 6 }}>
        <img 
          src={`/icons/${getPriorityIcon(priority)}.svg`}
          alt={priorityLabel}
          style={{ width: 20, height: 20, filter: getIconFilter(priority) } as React.CSSProperties}
        />
        {!hidePriorityLabel && (
          <span style={{ fontSize: 12, color: '#CCCCCC', fontWeight: 600 }}>{priorityLabel}</span>
        )}
      </div>
      {/* Title - clamp */}
      <div style={{ flex: 1, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{
          fontSize: 14,
          lineHeight: 1.35,
          color: '#FFFFFF',
          fontWeight: 500,
          fontFamily: 'Inter, sans-serif',
          display: '-webkit-box',
          WebkitLineClamp: 4 as any,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>{title}</div>
      </div>
      {/* Footer: assignee */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}><UserAvatar userId={assigneeId || null} userName={assigneeName || undefined} size={28} showName={true} className="ticket-card-avatar" /></div>
        {updateIndicators.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {updateIndicators}
          </div>
        )}
      </div>
    </div>
  )
}

export default TicketCard
