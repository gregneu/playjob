import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { setDragImage, type DragGhostData } from '../utils/dragGhost'
import { TicketCard } from './TicketCard'
import { UserAvatar } from './UserAvatar'

// Упрощенные типы статусов
type TaskStatus = 'open' | 'in_progress' | 'done'

// type TaskPriority = 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'

interface ZoneObject {
  id: string
  type: 'story' | 'task' | 'bug' | 'test' | 'mountain' | 'castle' | 'house' | 'garden' | 'factory' | 'helipad' | 'zone' | 'meet'
  title: string
  description?: string
  status: TaskStatus
  priority: string
  storyPoints?: number
  zoneId: string
  cellPosition: [number, number]
  // color удален - цвет зоны хранится только в zones.color
  createdAt: Date
  // Специальные поля для центральных объектов зон
  isZoneCenter?: boolean
  zoneProgress?: number
}

interface ZoneObjectDetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  zoneObject: ZoneObject | null
  projectId: string
  zoneColor?: string
  onSave?: (updatedZoneObject: ZoneObject) => void
  isDragging?: boolean // Добавляем prop для отслеживания drag состояния
  // Optional: tickets to render inside building sidebar
  zoneTickets?: Array<{
    id: string
    object_type: 'story' | 'task' | 'bug' | 'test'
    title: string
    status?: TaskStatus
    priority?: string
    assignee?: string | null
    assignee_id?: string | null
    created_by?: string | null
    board_column?: string | null
    sprint_id?: string | null
  }>
  onOpenTicket?: (ticketId: string, position?: { x: number; y: number; width: number; height: number }) => void
  plannedTickets?: Set<string>
  sprintName?: string
  sprintNames?: Record<string, string>
  sprintLabelByTicketId?: Record<string, string>
  onSprintBadgeClick?: (sprintId: string) => void
  side?: 'left' | 'right'
  ticketNotifications?: Record<string, { commentCount: number; assignmentCount: number }>
}


export const ZoneObjectDetailsPanel: React.FC<ZoneObjectDetailsPanelProps> = ({
  isOpen,
  onClose,
  zoneObject,
  zoneColor,
  onSave,
  isDragging = false,
  zoneTickets = [],
  onOpenTicket,
  plannedTickets,
  sprintName,
  sprintNames,
  sprintLabelByTicketId,
  onSprintBadgeClick,
  side = 'right',
  ticketNotifications = {}
}) => {
  // const { user } = useAuth()
  
  // Логирование изменений drag состояния
  useEffect(() => {
    console.log('🔄 ZoneObjectDetailsPanel: isDragging changed to:', isDragging)
    console.log('🔄 ZoneObjectDetailsPanel: Outer container pointerEvents: none (always)')
    console.log('🔄 ZoneObjectDetailsPanel: Inner sidebar pointerEvents: auto (always)')
    console.log('🔄 ZoneObjectDetailsPanel: zIndex will be:', isDragging ? 2147483647 : 2500)
  }, [isDragging])
  const [editedTitle, setEditedTitle] = useState(zoneObject?.title || '')
  // Simplified panel: only Title is editable now
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  // IDs соседних объектов по связям
  // const [prevObjectId, setPrevObjectId] = useState<string | null>(null)
  // const [nextObjectId, setNextObjectId] = useState<string | null>(null)
  // Состояние анимации
  const [isVisible, setIsVisible] = useState(false)
  // Zone color and team management
  const [currentZoneColor, setCurrentZoneColor] = useState('#ef4444') // Default red color
  const [teamMembers, setTeamMembers] = useState<Array<{id: string, name: string, avatar?: string, email?: string}>>([])
  const [isLoadingTeam, setIsLoadingTeam] = useState(false)
  // hexagonPosition removed - no longer needed
  
  // Ref for content div to handle touch events with passive: false
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  // Handle touch events with preventDefault (non-passive)
  React.useEffect(() => {
    const element = contentRef.current
    if (!element || !isOpen) return
    
    const handleTouchMove = (e: TouchEvent) => {
      e.stopPropagation()
      // Prevent default only if not scrolling inside the panel
      if (element.scrollHeight > element.clientHeight) {
        // Let touch scroll work inside the panel
        return
      }
      e.preventDefault()
    }
    
    // Add listener with passive: false to allow preventDefault
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    
    return () => {
      element.removeEventListener('touchmove', handleTouchMove)
    }
  }, [isOpen])

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

  // Color menu is now handled externally

  // Загружаем цвет зоны из связанной зоны (не из zoneObject.color)
  useEffect(() => {
    if (zoneColor) {
      console.log('🎨 ZoneObjectDetailsPanel: Updating currentZoneColor from zoneColor prop:', zoneColor)
      setCurrentZoneColor(zoneColor)
    }
  }, [zoneColor])

  // Функция для получения CSS filter для окрашивания иконки
  const getIconFilter = (_priority: string): string => {
    // Показываем оригинальные цвета SVG без фильтров
    return 'none'
  }
  
  // Функция для получения иконки приоритета
  const getPriorityIcon = (priority: string): string => {
    switch (priority) {
      case 'v-low': return 'loicon-v-low'
      case 'low': return 'loicon-low'
      case 'medium': return 'loicon-medium'
      case 'high': return 'loicon-high'
      case 'veryhigh': return 'loicon-veryhigh'
      default: return 'loicon-medium'
    }
  }

  // Функция для загрузки пользователей здания (используем участников проекта)
  const loadZoneTeamMembers = async () => {
    setIsLoadingTeam(true)
    try {
      const { supabase } = await import('../lib/supabase')
      
      // Get project_id from zone_object
      if (!zoneObject?.zone_id) {
        console.debug('ZoneObjectDetailsPanel: zone_id missing, skipping team load')
        setTeamMembers([])
        setIsLoadingTeam(false)
        return
      }
      
      // Get zone to find project_id
      const { data: zoneData } = await supabase
        .from('zones')
        .select('project_id')
        .eq('id', zoneObject.zone_id)
        .single()
      
      if (!zoneData?.project_id) {
        console.warn('⚠️ No project_id found for zone')
        setTeamMembers([])
        setIsLoadingTeam(false)
        return
      }
      
      console.log('🔍 Loading project members for project:', zoneData.project_id)
      
      // Load project members instead of zone members
      const { data, error } = await supabase
        .from('project_memberships')
        .select('user_id, role')
        .eq('project_id', zoneData.project_id)
      
      console.log('📊 Project members data:', data, 'Error:', error)
      
      if (!error && data && data.length > 0) {
        // Загружаем профили отдельно для каждого user_id
        const userIds = (data as any[]).map(m => m.user_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, avatar_url')
          .in('id', userIds)
        
        if (!profilesError && profilesData) {
          const mappedMembers = (data as any[]).map(m => {
            const profile = profilesData.find(p => p.id === m.user_id)
            const email = profile?.email ?? null
            const name = email ? email.split('@')[0] : 'Unknown User'
            return {
              id: m.user_id, 
              name: name,
              email: email,
              avatar: profile?.avatar_url ?? null
            }
          })
          console.log('👥 Mapped zone team members:', mappedMembers)
          setTeamMembers(mappedMembers)
        } else {
          console.warn('⚠️ Failed to load profiles:', profilesError)
          // Fallback: create basic members with just user_id
          const fallbackMembers = (data as any[]).map(m => ({
            id: m.user_id,
            name: `User ${m.user_id.slice(0, 8)}`,
            email: undefined,
            avatar: undefined
          }))
          setTeamMembers(fallbackMembers)
        }
      } else {
        console.warn('⚠️ No project members found or error:', error)
        // Fallback: try to get current user as a member
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          console.log('🔄 Using current user as fallback for zone:', user)
          const email = user.email || ''
          const name = email ? email.split('@')[0] : 'Current User'
          const fallbackMembers = [{ 
            id: user.id, 
            name: name,
            email: email || undefined,
            avatar: user.user_metadata?.avatar_url || undefined
          }]
          setTeamMembers(fallbackMembers)
        } else {
          setTeamMembers([])
        }
      }
    } catch (error) {
      console.error('❌ Error loading zone team members:', error)
      setTeamMembers([])
    } finally {
      setIsLoadingTeam(false)
    }
  }

  // Инициализируем состояния при открытии панели
  useEffect(() => {
    if (zoneObject) {
      console.log('🎨 ZoneObjectDetailsPanel: Initializing with zone object:', zoneObject)
      console.log('🎨 ZoneObjectDetailsPanel: zoneColor prop:', zoneColor)
      // Заголовок всегда равен названию объекта (единый источник для зоны)
      setEditedTitle(zoneObject.title)
      // Other fields removed
      setHasUnsavedChanges(false)
      // Анимация появления
      setIsVisible(true)
      // Загружаем участников команды
      loadZoneTeamMembers()
      // Обновляем цвет зоны при инициализации
      if (zoneColor) {
        console.log('🎨 ZoneObjectDetailsPanel: Initializing currentZoneColor:', zoneColor)
        setCurrentZoneColor(zoneColor)
      }
    } else {
      console.log('🎨 ZoneObjectDetailsPanel: No zoneObject provided')
      setIsVisible(false)
      setTeamMembers([])
    }
  }, [zoneObject, zoneColor])

  // Обновляем цвет зоны при изменении пропса
  useEffect(() => {
    if (zoneColor) {
      console.log('🎨 ZoneObjectDetailsPanel: Updating color from zoneColor prop:', zoneColor)
      setCurrentZoneColor(zoneColor)
    }
  }, [zoneColor])

  // Цвет зоны теперь всегда берется из zoneColor prop (из связанной зоны)

  // Color picker animation will be added here later

  // Color picker functions will be added here later

  // Загружаем направления связей для отображения кнопок навигации тикета
  // useEffect(() => {
  //   let cancelled = false
  //   ;(async () => {
  //     if (!zoneObject) return
  //     try {
  //       const { linkService } = await import('../lib/supabase')
  //       const _out = (await linkService.getPrimaryLink(zoneObject.id)) || (await linkService.getFirstLinkFrom(zoneObject.id))
  //       const _inc = await linkService.getFirstIncomingTo(zoneObject.id)
  //       if (cancelled) return
  //       // setNextObjectId(out?.to_object_id ?? null)
  //       // setPrevObjectId(inc?.from_object_id ?? null)
  //     } catch {
  //       if (cancelled) return
  //       // setNextObjectId(null)
  //       // setPrevObjectId(null)
  //     }
  //   })()
  //   return () => { cancelled = true }
  // }, [zoneObject])



  // Функция принудительного сохранения при закрытии
  const handleCloseWithSave = () => {
    console.log('🔴 ZoneObjectDetailsPanel: handleCloseWithSave called!')
    console.log('🔴 Current state:', { hasUnsavedChanges, zoneObject: !!zoneObject, onSave: !!onSave })
    
    if (hasUnsavedChanges && zoneObject && onSave) {
      console.log('ZoneObjectDetailsPanel: Saving changes before closing...')
      const updatedZoneObject = {
        ...zoneObject,
        title: editedTitle,
        // other fields unchanged
      }
      onSave(updatedZoneObject)
    }
    try { window.dispatchEvent(new CustomEvent('sidebar-hover', { detail: { hover: false } })) } catch {}
    // Анимация закрытия
    setIsVisible(false)
    setTimeout(() => {
      console.log('🔴 ZoneObjectDetailsPanel: Calling onClose()')
      onClose()
    }, 300) // Ждем завершения анимации
  }

  if (!isOpen || !zoneObject) {
    return null
  }

  // Проверяем, является ли объект центральным объектом зоны или замком
  // Not used anymore, keep for future if needed
  // const isZoneCenter = zoneObject.type === 'zone' || zoneObject.isZoneCenter
  // const isCastleObject = zoneObject.type === 'castle'

  // const getStatusColor = (status: TaskStatus) => {
  //   switch (status) {
  //     case 'open':
  //       return '#FF6B6B'
  //     case 'in_progress':
  //       return '#4ECDC4'
  //     case 'done':
  //       return '#96CEB4'
  //     default:
  //       return '#FF6B6B'
  //   }
  // }

  // const getStatusText = (status: TaskStatus) => {
  //   switch (status) {
  //     case 'open':
  //       return 'Open'
  //     case 'in_progress':
  //       return 'In Progress'
  //     case 'done':
  //       return 'Done'
  //     default:
  //       return 'Open'
  //   }
  // }

  // const getPriorityColor = (priority: string) => {
  //   switch (priority) {
  //     case 'v-low':
  //       return '#96CEB4'
  //     case 'low':
  //       return '#96CEB4'
  //     case 'medium':
  //       return '#4ECDC4'
  //     case 'high':
  //       return '#FFEAA7'
  //     case 'veryhigh':
  //       return '#FF6B6B'
  //     default:
  //       return '#4ECDC4'
  //   }
  // }

  // const getPriorityText = (priority: string) => {
  //   switch (priority) {
  //     case 'v-low':
  //       return 'V-Low'
  //     case 'low':
  //       return 'Low'
  //     case 'medium':
  //       return 'Medium'
  //     case 'high':
  //       return 'High'
  //     case 'veryhigh':
  //       return 'Very High'
  //     default:
  //       return 'Medium'
  //   }
  // }

  // const handleStatusChange = (newStatus: TaskStatus) => {
  //   setHasUnsavedChanges(true)
  //   console.log('ZoneObjectDetailsPanel: Status changed to:', newStatus)
  //   if (onSave && zoneObject) {
  //     onSave({
  //       ...zoneObject,
  //       status: newStatus
  //     })
  //     setTimeout(() => setHasUnsavedChanges(false), 100)
  //   }
  // }

  // const handlePriorityChange = (newPriority: string) => {
  //   setHasUnsavedChanges(true)
  //   console.log('ZoneObjectDetailsPanel: Priority changed to:', newPriority)
  //   if (onSave && zoneObject) {
  //     onSave({
  //       ...zoneObject,
  //       priority: newPriority
  //     })
  //     setTimeout(() => setHasUnsavedChanges(false), 100)
  //   }
  // }

  // const handleStoryPointsChange = (newStoryPoints: number) => {
  //   setHasUnsavedChanges(true)
  //   console.log('ZoneObjectDetailsPanel: Status changed to:', newStoryPoints)
  //   if (onSave && zoneObject) {
  //     onSave({
  //       ...zoneObject,
  //       storyPoints: newStoryPoints
  //     })
  //     setTimeout(() => setHasUnsavedChanges(false), 100)
  //   }
  // }

  return createPortal(
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: isDragging ? 2147483647 : 2500, // Высокий z-index только во время drag, иначе между canvas и UI
      pointerEvents: 'none' // Внешний контейнер НЕ блокирует события
    }}>
      <div style={{
        position: 'absolute',
        top: 16,
        right: side === 'right' ? 16 : 'auto',
        left: side === 'left' ? 16 : 'auto',
        bottom: 16,
        width: 386,
        borderRadius: '20px',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: isVisible
          ? 'translateX(0)'
          : side === 'right'
            ? 'translateX(100%)'
            : 'translateX(-100%)',
        pointerEvents: 'auto', // Sidebar всегда кликабелен для drag & drop
        opacity: isVisible ? 1 : 0
      }}>
      <div
        onMouseEnter={() => {
          try { window.dispatchEvent(new CustomEvent('sidebar-hover', { detail: { hover: true } })) } catch {}
        }}
        onMouseLeave={() => {
          try { window.dispatchEvent(new CustomEvent('sidebar-hover', { detail: { hover: false } })) } catch {}
        }}
        style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '20px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
        background: 'rgba(0, 0, 0, 0.01)',
        border: '1.5px solid rgba(255, 255, 255, 0.05)',
        position: 'relative'
      } as any}>
        
        {/* Header */}
        <div style={{
          height: '134px',
          display: 'flex',
          flexDirection: 'column',
          padding: '0px 16px 16px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px 20px 0 0',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        } as any}>
          {/* Top row: Hexagon color selector, Title and Close button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', height: '64px' } as any}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              {/* Hexagon color selector */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={(e) => {
                    console.log('🎨 ZoneObjectDetailsPanel: Hexagon button clicked!')
                    console.log('🎨 ZoneObjectDetailsPanel: Event:', e)
                    console.log('🎨 ZoneObjectDetailsPanel: Event target:', e.target)
                    console.log('🎨 ZoneObjectDetailsPanel: Event currentTarget:', e.currentTarget)
                    
                    e.stopPropagation()
                    
                    console.log('🎨 ZoneObjectDetailsPanel: Hexagon clicked:', {
                      zoneObjectId: zoneObject?.id,
                      currentZoneColor,
                      zoneObject
                    })
                    
                    // Получаем позицию гексагона относительно viewport
                    const rect = e.currentTarget.getBoundingClientRect()
                    const position = {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2
                    }
                    
                    // Отправляем событие для открытия color picker
                    console.log('🎨 ZoneObjectDetailsPanel: Dispatching open-zone-color-picker event:', {
                      position,
                      currentColor: currentZoneColor,
                      zoneId: zoneObject?.id
                    })
                    
                    window.dispatchEvent(new CustomEvent('open-zone-color-picker', {
                      detail: {
                        position,
                        currentColor: currentZoneColor,
                        zoneId: zoneObject?.id // Это zoneObjectId, не zoneId
                      }
                    }))
                    
                    console.log('🎨 ZoneObjectDetailsPanel: Event dispatched successfully!')
                  }}
                  onMouseEnter={(e) => {
                    const svg = e.currentTarget.querySelector('svg')
                    if (svg) {
                      svg.style.transform = 'scale(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    const svg = e.currentTarget.querySelector('svg')
                    if (svg) {
                      svg.style.transform = 'scale(1)'
                    }
                  }}
                  style={{
                    width: '24px',
                    height: '20px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  } as any}
                >
                  <svg width="24" height="20" viewBox="0 0 24 24" style={{ 
                    display: 'block',
                    transition: 'transform 0.2s ease'
                  }}>
                    <path 
                      d="M10.425 1.41397L3.65 5.40997C3.14964 5.6882 2.7328 6.09518 2.44268 6.58874C2.15256 7.08229 1.99972 7.64446 2 8.21697V15.502C2.00078 16.0802 2.15693 16.6475 2.45213 17.1447C2.74733 17.6418 3.17072 18.0505 3.678 18.328L10.373 22.565C11.407 23.135 12.593 23.135 13.573 22.597L20.377 18.295C21.357 17.758 22 16.677 22 15.502V8.21797L21.995 8.01397C21.9676 7.54621 21.8385 7.09005 21.6167 6.67728C21.395 6.26451 21.0859 5.90506 20.711 5.62397L20.604 5.54897L20.597 5.54197C20.5415 5.49143 20.4808 5.44685 20.416 5.40897L13.64 1.41397C13.1476 1.14242 12.5944 1 12.032 1C11.4696 1 10.9164 1.14242 10.424 1.41397H10.425Z" 
                      fill={currentZoneColor}
                    />
                  </svg>
                </button>
                
                {/* Color picker is now handled externally */}
              </div>

              {/* Title input */}
              <input
                value={editedTitle}
                onChange={(e) => { setEditedTitle(e.target.value); setHasUnsavedChanges(true) }}
                onBlur={handleCloseWithSave}
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontFamily: 'Inter, sans-serif',
                  color: '#000000',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%'
                } as any}
              />
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                console.log('🔴 ZoneObjectDetailsPanel: X button clicked!')
                console.log('🔴 Event:', e)
                console.log('🔴 Event target:', e.target)
                console.log('🔴 Event currentTarget:', e.currentTarget)
                e.preventDefault()
                e.stopPropagation()
                handleCloseWithSave()
              }}
              onMouseDown={(e) => {
                console.log('🔴 ZoneObjectDetailsPanel: X button mouseDown!')
                e.preventDefault()
                e.stopPropagation()
              }}
                style={{
                  width: '18px',
                  height: '18px',
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer',
                  color: '#000000',
                  padding: '0',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto', // Принудительно включаем pointer events для кнопки X
                  zIndex: 1001 // Высокий z-index для кнопки X
                } as any}
            >
              ✕
            </button>
          </div>


          {/* Bottom row: Team members */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Add member button (hexagon) */}
            <button
              onClick={() => {
                // TODO: Implement team member invitation
              }}
                style={{
                  width: '24px',
                  height: '20px',
                  background: '#6b7280',
                  border: 'none',
                  cursor: 'pointer',
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                } as any}
            >
              +
            </button>
            
            {/* Team members */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isLoadingTeam ? (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Loading...</div>
              ) : teamMembers.length > 0 ? teamMembers.map(member => (
                <div
                  key={member.id}
                  title={`${member.name} (${member.email})`}
                >
                  <UserAvatar
                    userId={member.id}
                    size={32}
                    showName={false}
                  />
                </div>
              )) : (
                // Default creator (placeholder) - показываем только если нет участников
                <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'white',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                } as any}
                  title="Zone Creator"
                >
                  C
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '16px',
            pointerEvents: 'auto', // Принудительно включаем pointer events
            zIndex: 999 // Чуть ниже grid
          }}
          onWheel={(e) => { e.stopPropagation() }}
          onMouseDown={(e) => {
            console.log('🖱️ ZoneObjectDetailsPanel CONTENT: onMouseDown triggered')
            console.log('🖱️ ZoneObjectDetailsPanel CONTENT: target:', e.target)
            console.log('🖱️ ZoneObjectDetailsPanel CONTENT: currentTarget:', e.currentTarget)
          }}
        >
          {/* Tickets grid 2 columns */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 4, 
              justifyContent: 'center', 
              alignItems: 'center',
              pointerEvents: 'auto', // Принудительно включаем pointer events
              zIndex: 1000 // Высокий z-index
            }}
            onMouseDown={(e) => {
              console.log('🖱️ ZoneObjectDetailsPanel GRID: onMouseDown triggered')
              console.log('🖱️ ZoneObjectDetailsPanel GRID: target:', e.target)
              console.log('🖱️ ZoneObjectDetailsPanel GRID: currentTarget:', e.currentTarget)
              console.log('🖱️ ZoneObjectDetailsPanel GRID: event bubbling allowed:', !e.defaultPrevented)
            }}
            onPointerDown={(e) => {
              console.log('🖱️ ZoneObjectDetailsPanel GRID: onPointerDown triggered')
              console.log('🖱️ ZoneObjectDetailsPanel GRID: target:', e.target)
              console.log('🖱️ ZoneObjectDetailsPanel GRID: currentTarget:', e.currentTarget)
            }}
          >
            {(() => {
              console.log('🎫 ZoneObjectDetailsPanel: Rendering tickets:', zoneTickets)
              console.log('🎫 ZoneObjectDetailsPanel: Number of tickets:', zoneTickets.length)
              return zoneTickets.map((t, index) => {
                console.log('🎫 ZoneObjectDetailsPanel: Rendering ticket:', t.id, t.title)
              const pr = (t.priority || 'medium') as string
              // const priorityLabel = pr === 'veryhigh' ? 'Very High' : pr === 'high' ? 'High' : pr === 'medium' ? 'Medium' : pr === 'low' ? 'Low' : pr === 'v-low' ? 'Very Low' : 'Medium'
              // const priorityColor = pr === 'veryhigh' ? '#FF554A' : pr === 'high' ? '#FFA726' : pr === 'medium' ? '#42A5F5' : pr === 'low' ? '#9CCC65' : pr === 'v-low' ? '#9CCC65' : '#42A5F5'
              const isPlannedDirect = plannedTickets?.has(t.id) || false
              const isPlannedByColumn = (t as any).board_column === 'in_sprint'
              const isPlannedInSprint = (isPlannedDirect || isPlannedByColumn || Boolean((t as any).sprint_id)) && t.status !== 'done'
              const plannedSprintName = (() => {
                const sid = (t as any).sprint_id as string | undefined
                console.log('Determining sprint name for ticket:', {
                  ticketId: t.id,
                  ticketTitle: t.title,
                  sprint_id: sid,
                  sprintNames: sprintNames,
                  sprintLabelByTicketId: sprintLabelByTicketId,
                  sprintName: sprintName
                })
                
                if (sid && sprintNames && sprintNames[sid]) {
                  console.log('Using sprintNames[sid]:', sprintNames[sid])
                  return sprintNames[sid]
                }
                // fallback: label from global planned map by ticket id
                if (sprintLabelByTicketId && sprintLabelByTicketId[t.id]) {
                  console.log('Using sprintLabelByTicketId[t.id]:', sprintLabelByTicketId[t.id])
                  return sprintLabelByTicketId[t.id]
                }
                console.log('Using fallback sprintName:', sprintName)
                return sprintName
              })()
              return (
                <div
                  key={t.id}
                  className="ticket-card-animate"
                  style={{
                    animationDelay: `${index * 0.05}s`
                  }}
                >
                  <TicketCard
                    id={t.id}
                    title={t.title}
                    priority={pr as any}
                    assigneeId={t.assignee_id || t.created_by}
                    assigneeName={t.assignee}
                    draggable={true}
                    unreadCommentCount={(ticketNotifications[t.id]?.commentCount) || 0}
                    unseenAssignmentCount={(ticketNotifications[t.id]?.assignmentCount) || 0}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      if (onOpenTicket) {
                        // Получаем позицию тикета для smart анимации
                        const rect = e.currentTarget.getBoundingClientRect()
                        onOpenTicket(t.id, {
                          x: rect.left,
                          y: rect.top,
                          width: rect.width,
                          height: rect.height
                        })
                      }
                    }}
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer?.setData('application/x-existing-ticket', JSON.stringify({ ticketId: t.id, fromZoneObjectId: zoneObject.id, type: t.object_type }))
                      e.dataTransfer?.setData('application/x-ticket-type', t.object_type)
                      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
                      // Создаем единый drag ghost
                      const ghostData: DragGhostData = {
                        title: t.title,
                        type: t.object_type,
                        priority: t.priority as any,
                        assigneeName: t.assignee,
                        status: t.status as any,
                        isNewTicket: false
                      }
                      setDragImage(e, ghostData)
                    } catch {}
                    try { 
                      const eventData = { type: t.object_type, ticketId: t.id, fromZoneObjectId: zoneObject.id }
                      console.log('🚀 ZoneObjectDetailsPanel: Dispatching ticket-dragstart with data:', eventData)
                      window.dispatchEvent(new CustomEvent('ticket-dragstart', { detail: eventData }))
                      console.log('✅ ZoneObjectDetailsPanel: ticket-dragstart event dispatched successfully')
                    } catch (err) {
                      console.error('❌ ZoneObjectDetailsPanel: Error dispatching ticket-dragstart:', err)
                    }
                  }}
                  onDragEnd={() => { 
                    try { 
                      console.log('🎯 ZoneObjectDetailsPanel: Dispatching ticket-dragend')
                      window.dispatchEvent(new CustomEvent('ticket-dragend'))
                      console.log('✅ ZoneObjectDetailsPanel: ticket-dragend event dispatched successfully')
                    } catch (err) {
                      console.error('❌ ZoneObjectDetailsPanel: Error dispatching ticket-dragend:', err)
                    }
                  }}
                  isPlannedInSprint={isPlannedInSprint}
                  sprintName={plannedSprintName}
                  isDone={t.status === 'done'}
                  onSprintBadgeClick={() => {
                    console.log('Sprint badge clicked in ZoneObjectDetailsPanel, sprint_id:', t.sprint_id)
                    console.log('onSprintBadgeClick function available:', !!onSprintBadgeClick)
                    if (onSprintBadgeClick) {
                      onSprintBadgeClick(t.sprint_id || '') // Передаем пустую строку если sprint_id null
                    }
                  }}
                />
                </div>
              )
            })
            })()}
          </div>

          {/* Unsaved Changes Indicator */}
          {hasUnsavedChanges && (
            <div style={{
              padding: '12px',
              background: '#FFF3CD',
              border: '1px solid #FFEAA7',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#856404',
              marginTop: 16
            }}>
              ⚠️ You have unsaved changes
            </div>
          )}
        </div>
      </div>
    </div>
    </div>,
    document.body
  )
}
