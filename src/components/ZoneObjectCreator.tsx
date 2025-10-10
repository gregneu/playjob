import React, { useState, useEffect, useRef } from 'react'

interface ZoneObjectCreatorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (objectData: {
    title: string
    type: 'story' | 'task' | 'bug' | 'test'
    status: 'open' | 'in_progress' | 'done'
    priority: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'
    assignee_id?: string | null
  }) => void
  cellPosition: [number, number] | null
  zoneColor?: string
  defaultType?: 'story' | 'task' | 'bug' | 'test'
  projectId?: string
}

export const ZoneObjectCreator: React.FC<ZoneObjectCreatorProps> = ({
  isOpen,
  onClose,
  onSave,
  cellPosition,
  // zoneColor,
  defaultType,
  projectId
}) => {
  // Отладочные логи для проверки пропсов
  console.log('🎭 ZoneObjectCreator render:', {
    isOpen,
    cellPosition,
    defaultType,
    projectId
  })
  
  // Логируем каждый рендер
  console.log('🎭 ZoneObjectCreator: Component rendered with isOpen =', isOpen)
  const [objectTitle, setObjectTitle] = useState('')
  const [selectedType, setSelectedType] = useState<'story' | 'task' | 'bug' | 'test'>(defaultType || 'story')
  const inputRef = useRef<HTMLInputElement>(null)
  const [members, setMembers] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([])
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string>('')
  const [showMentionList, setShowMentionList] = useState<boolean>(false)
  const [selectedAssignee, setSelectedAssignee] = useState<{ id: string; full_name: string | null; email: string | null } | null>(null)
  const [mentionIndex, setMentionIndex] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState(true)
  const [isInternalAnimating, setIsInternalAnimating] = useState(true)
  const mentionListRef = useRef<HTMLDivElement>(null)

  // Автофокус на поле ввода при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      // Мгновенный запуск анимации
      setIsAnimating(false) // Основной контейнер готов быстро
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        } else {
          // Fallback: попробовать найти input по селектору
          const input = document.querySelector('input[placeholder="Story name"]')
          if (input) (input as HTMLInputElement).focus()
        }
      }, 10)
      
      // Внутренние элементы продолжают анимацию еще полсекунды
      setTimeout(() => {
        setIsInternalAnimating(false)
      }, 100) // Задержка для внутренних элементов
    } else if (!isOpen) {
      // Сбрасываем состояние анимации при закрытии
      setIsAnimating(true)
      setIsInternalAnimating(true)
    }
  }, [isOpen])

  useEffect(() => {
    if (defaultType) {
      setSelectedType(defaultType)
    }
  }, [defaultType])

  // Load project members for @mentions - async, don't block UI
  useEffect(() => {
    if (!isOpen || !projectId) return
    
    // Set empty members initially for instant UI response
    setMembers([])
    
    // Load members in background
    ;(async () => {
      try {
        const { supabase } = await import('../lib/supabase')
        console.log('🔍 Loading project members for project:', projectId)
        
        // Сначала пробуем простой запрос без JOIN
        let { data, error } = await supabase
          .from('project_memberships')
          .select('user_id')
          .eq('project_id', projectId)
        
        console.log('📊 Project members data (step 1):', data, 'Error:', error)
        
        if (!error && data && data.length > 0) {
          // Получаем профили отдельно
          const userIds = data.map(pm => pm.user_id).filter(Boolean)
          console.log('📊 User IDs to fetch:', userIds)
          
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', userIds)
            
            console.log('📊 Profiles data:', profilesData, 'Profiles error:', profilesError)
            
            if (!profilesError && profilesData) {
              const mappedMembers = profilesData.map(p => ({ 
                id: p.id, 
                full_name: p.full_name ?? null, 
                email: p.email ?? null 
              }))
              console.log('👥 Mapped members:', mappedMembers)
              setMembers(mappedMembers)
            } else {
              console.error('❌ Failed to load profiles:', profilesError)
              // Fallback to current user
              await loadCurrentUserFallback()
            }
          } else {
            console.log('⚠️ No valid user IDs found')
            await loadCurrentUserFallback()
          }
        } else {
          console.error('❌ Failed to load project members:', error)
          await loadCurrentUserFallback()
        }
        
        // Fallback функция для загрузки текущего пользователя
        async function loadCurrentUserFallback() {
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              console.log('🔄 Using current user as fallback:', user)
              setMembers([{ id: user.id, full_name: user.user_metadata?.full_name || null, email: user.email || null }])
            } else {
              console.log('⚠️ No current user found, setting empty members')
              setMembers([])
            }
          } catch (err) {
            console.error('❌ Error getting current user:', err)
            setMembers([])
          }
        }
      } catch (err) {
        console.error('❌ Error loading project members:', err)
      }
    })()
  }, [isOpen, projectId])

  // Global shortcuts: only ESC closes; Enter is handled locally in input to avoid accidental saves
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      }
      if (e.key === 'Enter') {
        // Ignore global Enter when typing in the input or when mention list is open
        const active = document.activeElement as HTMLElement | null
        if (active === inputRef.current || showMentionList) {
          return
        }
        // Otherwise allow Enter to confirm creation
        handleSave()
      }
    }
    window.addEventListener('keydown', onKey, false)
    return () => window.removeEventListener('keydown', onKey, false)
  }, [isOpen, objectTitle, selectedType, showMentionList])

  const handleSave = () => {
    if (objectTitle.trim()) {
      console.log('=== ZONEOBJECTCREATOR SAVE ===')
      console.log('Title:', objectTitle.trim())
      console.log('Type:', selectedType)
      console.log('Cell position:', cellPosition)
      
      onSave({
        title: objectTitle.trim(),
        type: selectedType,
        status: 'open',
        priority: 'medium',
        assignee_id: assigneeId ?? undefined
      })
      setObjectTitle('')
      setSelectedType('story')
      setAssigneeId(null)
      setSelectedAssignee(null)
    } else {
      console.log('Title is empty, not saving')
    }
  }

  const handleCancel = () => {
    setObjectTitle('')
    setSelectedType('story')
    onClose()
  }

  if (!isOpen) {
    console.log('🚫 ZoneObjectCreator: isOpen is false, not rendering')
    return null
  }
  
  console.log('✅ ZoneObjectCreator: isOpen is true, rendering modal!')
  console.log('🔍 ZoneObjectCreator props:', {
    isOpen,
    cellPosition,
    defaultType,
    projectId
  })

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: isAnimating 
        ? 'translate(-50%, -50%) scale(0.1)' 
        : 'translate(-50%, -50%) scale(1)',
      background: 'rgb(0 0 0 / 64%)',
      border: 'none',
      borderRadius: isAnimating ? '50%' : '12px',
      padding: '4px 4px',
      boxShadow: isAnimating 
        ? 'rgba(0, 0, 0, 0.1) 0px 2px 8px' 
        : 'rgba(0, 0, 0, 0.3) 0px 8px 32px',
      zIndex: 4000, // Выше всех UI элементов и badges
      minWidth: isAnimating ? '60px' : '500px',
      maxWidth: isAnimating ? '60px' : '600px',
      height: isAnimating ? '60px' : 'auto',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
      opacity: isAnimating ? 0.8 : 1
    } as React.CSSProperties}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0px',
        position: 'relative',
        opacity: isInternalAnimating ? 0 : 1,
        transform: isInternalAnimating ? 'scale(0.5)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) 0.05s'
      }}>
        {/* Крестик слева */}
        <button
          onClick={handleCancel}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            transition: '0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
          }}
        >
          <img 
            src="/icons/tabler-icon-x.svg" 
            alt="Close" 
            style={{ width: '20px', height: '20px', filter: 'brightness(0) invert(1)' } as React.CSSProperties}
          />
        </button>

        {/* Иконка типа тикета */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px'
        } as React.CSSProperties}>
          <img 
            src={`/icons/tabler-icon-${getIconForType(selectedType)}.svg`}
            alt={selectedType}
            style={{ width: '20px', height: '20px', filter: 'brightness(0) invert(1)' } as React.CSSProperties}
          />
        </div>

        {/* Поле ввода названия c chip слева */}
        {selectedAssignee && (
          <div
            style={{
              marginLeft: 8,
              marginRight: 8,
              background: '#000',
              color: '#fff',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 14,
              fontWeight: 800,
              pointerEvents: 'none'
            }}
          >@{selectedAssignee.full_name || selectedAssignee.email || 'User'}</div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={objectTitle}
          onChange={(e) => {
            const v = e.target.value
            setObjectTitle(v)
            const last = v.split(/\s+/).pop() || ''
            if (last.startsWith('@')) {
              const q = last.slice(1).toLowerCase()
              setMentionQuery(q)
              setShowMentionList(Boolean(q.length))
              setMentionIndex(0)
            } else {
              setMentionQuery('')
              setShowMentionList(false)
              setMentionIndex(0)
            }
          }}
          placeholder="Story name"
          style={{
            display: 'flex',
            width: '486px',
            height: '52px',
            padding: '0 4px 0 16px',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: 'none',
            borderRadius: '16px',
            background: 'transparent',
            fontSize: '16px',
            color: 'white',
            outline: 'none'
          } as React.CSSProperties}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (showMentionList) {
                e.preventDefault()
                const list = members
                  .filter(m => (m.email || '').toLowerCase().includes(mentionQuery) || (m.full_name || '').toLowerCase().includes(mentionQuery))
                if (list.length > 0) {
                  const m = list[Math.max(0, Math.min(mentionIndex, list.length - 1))]
                  setAssigneeId(m.id)
                  setSelectedAssignee(m)
                  setShowMentionList(false)
                  // remove last @token from input
                  setObjectTitle(prev => prev.replace(/(^|\s)@[^\s]*$/,'').trim())
                  setTimeout(() => inputRef.current?.focus(), 0)
                  return
                }
              }
              // Создаём тикет только если есть не пустой title
              if (objectTitle.trim()) {
                handleSave()
              }
            }
            if (e.key === 'ArrowDown') {
              const list = members
                .filter(m => (m.email || '').toLowerCase().includes(mentionQuery) || (m.full_name || '').toLowerCase().includes(mentionQuery))
              if (list.length > 0) {
                e.preventDefault()
                setShowMentionList(true)
                setMentionIndex(prev => (prev + 1) % list.length)
              }
            }
            if (e.key === 'ArrowUp') {
              const list = members
                .filter(m => (m.email || '').toLowerCase().includes(mentionQuery) || (m.full_name || '').toLowerCase().includes(mentionQuery))
              if (list.length > 0) {
                e.preventDefault()
                setShowMentionList(true)
                setMentionIndex(prev => (prev - 1 + list.length) % list.length)
              }
            }
            if (e.key === 'Backspace') {
              // Если поле пустое и есть выбранный ассайни — удаляем чип
              if (!objectTitle.trim() && selectedAssignee) {
                e.preventDefault()
                setAssigneeId(null)
                setSelectedAssignee(null)
                setTimeout(() => inputRef.current?.focus(), 0)
                return
              }
            }
            if (e.key === 'Escape') handleCancel()
          }}
        />

        {/* Selected assignee tag */}
        {selectedAssignee && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 72,
            transform: 'translateY(-50%)',
            background: '#000000',
            color: 'white',
            borderRadius: 999,
            padding: '6px 10px',
            fontSize: 14,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 12px 24px rgba(0,0,0,0.25)'
          }}>
            @{selectedAssignee.full_name || selectedAssignee.email || 'User'}
          </div>
        )}

        {showMentionList && mentionQuery && (
          <div style={{
            position: 'absolute',
            top: 40,
            left: 88,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            padding: '8px 0',
            minWidth: 260,
            zIndex: 5000 // Выше самой модалки
          }} ref={mentionListRef}>
            {(() => {
              const filteredMembers = members.filter(m => {
                const emailMatch = (m.email || '').toLowerCase().includes(mentionQuery.toLowerCase())
                const nameMatch = (m.full_name || '').toLowerCase().includes(mentionQuery.toLowerCase())
                console.log(`🔍 Filtering member ${m.full_name || m.email}: emailMatch=${emailMatch}, nameMatch=${nameMatch}, query="${mentionQuery}"`)
                return emailMatch || nameMatch
              }).slice(0, 6)
              
              console.log('📋 Filtered members:', filteredMembers)
              
              return filteredMembers.length > 0 ? filteredMembers.map((m, idx) => (
              <div
                key={m.id}
                id={`mention-item-${idx}`}
                onClick={() => {
                  setAssigneeId(m.id)
                  setSelectedAssignee(m)
                  setShowMentionList(false)
                  setObjectTitle(prev => prev.replace(/(^|\s)@[^\s]*$/,'').trim())
                  setTimeout(() => inputRef.current?.focus(), 0)
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', background: idx === mentionIndex ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.12)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ width: 6, height: 6, borderRadius: 999, background: '#A3B0C2' } as React.CSSProperties} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, color: 'white', fontWeight: 700 }}>{m.full_name || m.email || 'User'}</span>
                  {m.email && <span style={{ fontSize: 12, color: '#D1D5DB' }}>{m.email}</span>}
                </div>
              </div>
              )) : (
                <div style={{ padding: '12px 16px', color: '#D1D5DB', fontSize: 14 }}>
                  No users found
                </div>
              )
            })()}
          </div>
        )}

        {/* Кнопка Create */}
        <button
          onClick={handleSave}
          disabled={!objectTitle.trim()}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            background: objectTitle.trim() ? '#000000' : 'rgba(0, 0, 0, 0.3)',
            cursor: objectTitle.trim() ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            transition: '0.2s',
            minWidth: '100px',
            opacity: isInternalAnimating ? 0 : 1,
            transform: isInternalAnimating ? 'scale(0.8)' : 'scale(1)',
            transitionDelay: isInternalAnimating ? '0s' : '0.1s'
          }}
          onMouseEnter={(e) => {
            if (objectTitle.trim()) {
              e.currentTarget.style.background = '#333333'
            }
          }}
          onMouseLeave={(e) => {
            if (objectTitle.trim()) {
              e.currentTarget.style.background = '#000000'
            }
          }}
        >
          Create
        </button>
      </div>
    </div>
  )
}

// Функция для получения имени иконки по типу тикета
function getIconForType(type: 'story' | 'task' | 'bug' | 'test'): string {
  switch (type) {
    case 'story':
      return 'bookmark-filled'
    case 'task':
      return 'list-check'
    case 'bug':
      return 'bug-filled'
    case 'test':
      return 'test-pipe'
    default:
      return 'bookmark-filled'
  }
} 