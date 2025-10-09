import React, { useState, useEffect, useRef } from 'react'
import { UserAvatar } from './UserAvatar'
import { supabase } from '../lib/supabase'
import { Search, ChevronDown, UserPlus } from 'lucide-react'

interface ProjectMember {
  id: string
  full_name: string | null
  email: string | null
  role: string
  avatar_url?: string | null
}

type MembersFunctionRow = {
  user_id: string | null
  display_name: string | null
  email: string | null
  role?: string | null
  status?: 'member' | 'invited'
  avatar_url?: string | null
}

interface AssigneeDropdownProps {
  projectId: string
  currentAssignee?: string | null
  onAssigneeChange: (assigneeId: string | null) => void
  disabled?: boolean
  onAssigneeSelected?: (member: ProjectMember | null) => void
}

export const AssigneeDropdown: React.FC<AssigneeDropdownProps> = ({
  projectId,
  currentAssignee,
  onAssigneeChange,
  disabled = false,
  onAssigneeSelected
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Загружаем участников проекта
  useEffect(() => {
    const loadProjectMembers = async () => {
      if (!projectId) return
      
      setLoading(true)
      try {
        const { data, error } = await supabase.functions.invoke('list-project-members', {
          body: { projectId }
        })

        if (error) {
          console.error('AssigneeDropdown: failed to load members via edge function', error)
          setMembers([])
          return
        }

        const payload = (data ?? {}) as { members?: MembersFunctionRow[] }

        const normalizedMembers: ProjectMember[] = (payload.members ?? [])
          .filter((member) => member.status !== 'invited' && Boolean(member.user_id))
          .map((member) => ({
            id: member.user_id as string,
            full_name: member.display_name ?? member.email ?? 'Unnamed User',
            email: member.email ?? null,
            role: (member.role ?? 'viewer').toLowerCase(),
            avatar_url: member.avatar_url ?? null
          }))

        setMembers(normalizedMembers)
      } catch (error) {
        console.error('Error loading project members:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjectMembers()
  }, [projectId]) // Убрали currentAssignee из зависимостей

  // Отдельный useEffect для установки selectedMember
  useEffect(() => {
    if (currentAssignee && members.length > 0) {
      const current = members.find(m => m.id === currentAssignee) || null
      setSelectedMember(current)
      if (onAssigneeSelected) onAssigneeSelected(current)
    } else if (!currentAssignee) {
      setSelectedMember(null)
      if (onAssigneeSelected) onAssigneeSelected(null)
    }
  }, [currentAssignee, members, onAssigneeSelected])

  // Фильтруем участников по поисковому запросу
  const filteredMembers = members.filter(member => {
    const query = (searchQuery || '').toLowerCase()
    const name = (member.full_name || '').toLowerCase()
    const email = (member.email || '').toLowerCase()
    const role = (member.role || '').toLowerCase()
    return name.includes(query) || email.includes(query) || role.includes(query)
  })

  // Обработчик выбора участника
  const handleMemberSelect = (member: ProjectMember) => {
    setSelectedMember(member)
    onAssigneeChange(member.id)
    if (onAssigneeSelected) onAssigneeSelected(member)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Обработчик снятия назначения
  const handleUnassign = () => {
    setSelectedMember(null)
    onAssigneeChange(null)
    if (onAssigneeSelected) onAssigneeSelected(null)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Закрытие dropdown при нажатии Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Поле выбора/поиска */}
      {!isOpen ? (
        <div
          onClick={() => !disabled && setIsOpen(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.6 : 1,
            minHeight: '44px'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = '#F8FAFC'
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <UserAvatar
              userId={selectedMember?.id}
              userName={selectedMember?.full_name ?? undefined}
              size={40}
              show3D={false}
            />
            {selectedMember ? (
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedMember.full_name || selectedMember.email || 'Без имени'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedMember.email || 'Не назначено'}
                </div>
              </div>
            ) : (
              <span style={{ color: '#64748B', fontSize: '14px' }}>
                Назначить участника
              </span>
            )}
          </div>
          
          <ChevronDown 
            size={16} 
            style={{ 
              color: '#64748B',
              transform: 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} 
          />
        </div>
      ) : (
        <div style={{
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          borderRadius: '8px',
          minHeight: '44px'
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.85)',
            borderRadius: '12px',
            padding: '0 12px'
          }}>
            <Search size={16} style={{ color: '#64748B' }} />
            <input
              type="text"
              placeholder="Поиск участников..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                outline: 'none',
                color: '#0F172A'
              }}
              onFocus={(e) => e.target.select()}
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Dropdown меню */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '320px', // Фиксированная ширина вместо right: 0
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          zIndex: 1000,
          marginTop: '4px',
          maxHeight: '300px',
          overflow: 'hidden',
          overflowX: 'hidden', // Убираем горизонтальный скроллбар
          padding: '8px 0'
        }}>
          {/* Список участников */}
          <div style={{ maxHeight: '200px', overflow: 'auto', overflowX: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '12px 16px', textAlign: 'center', color: '#D1D5DB', fontSize: '14px' }}>
                Загрузка участников...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div style={{ padding: '12px 16px', textAlign: 'center', color: '#D1D5DB', fontSize: '14px' }}>
                {searchQuery ? 'Участники не найдены' : 'Нет участников в проекте'}
              </div>
            ) : (
              <>
                {/* Кнопка снятия назначения */}
                {selectedMember && (
                  <button
                    onClick={handleUnassign}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#DC2626',
                      fontSize: '14px',
                      borderRadius: '8px',
                      margin: '0 8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(220, 38, 38, 0.12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '999px',
                      background: '#DC2626'
                    }} />
                    Снять назначение
                  </button>
                )}

                {/* Список участников */}
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleMemberSelect(member)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px',
                      color: 'white',
                      borderRadius: '8px',
                      margin: '0 8px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <UserAvatar
                      userId={member.id}
                      userName={member.full_name ?? undefined}
                      size={28}
                      show3D={false}
                    />
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'white' }}>
                        {member.full_name || member.email || 'Без имени'}
                      </div>
                      {member.email && (
                        <div style={{ fontSize: '12px', color: '#D1D5DB' }}>
                          {member.email}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
