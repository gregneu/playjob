import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import { SmartLink } from './SmartLink'
import { SmartText } from './SmartText'
import { UserAvatar } from './UserAvatar'
import { AssigneeDropdown } from './AssigneeDropdown'


type TicketStatus = 'open' | 'in_progress' | 'done'
type TicketPriority = 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'

interface TicketDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  ticket: {
    id: string
    zone_object_id: string
    title: string
    description?: string
    status: TicketStatus
    priority: TicketPriority
    assignee_id?: string | null
    checklist?: Array<{ id: string; text: string; done: boolean }>
    links?: Array<{ id: string; url: string }>
    attachments?: Array<{ id: string; name: string }>
    comments?: Array<{ id: string; author: string; author_id?: string | null; text: string; ts: string; assignee_id?: string }>
  } | null
  onSave: (updates: Partial<{ title: string; description: string; status: TicketStatus; priority: TicketPriority; assignee_id?: string | null; checklist: any; links: any; comments: any; attachments: any }>) => void
  onSaveToDatabase?: (ticketId: string, updates: any) => Promise<boolean>
  ticketPosition?: { x: number; y: number; width: number; height: number } | null
}

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({ isOpen, onClose, projectId, ticket, onSave, onSaveToDatabase, ticketPosition }) => {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TicketStatus>('open')
  // status is used in setStatus(ticket.status) on line 113
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [smartInput, setSmartInput] = useState('')
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [members, setMembers] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([])
  const smartInputRef = useRef<HTMLInputElement>(null)
  const [leadMention, setLeadMention] = useState<string | null>(null)
  const [showInputGlow, setShowInputGlow] = useState(false)
  const [isMembersLoading, setIsMembersLoading] = useState(true)
  
  // Кэш для участников проекта
  const membersCacheRef = useRef<Map<string, Array<{ id: string; full_name: string | null; email: string | null }>>>(new Map())

  const [inputMode, setInputMode] = useState<'text' | 'comment' | 'link' | 'requirement' | 'file'>('text')
  const [isDragOver, setIsDragOver] = useState(false)
  const checklistItems = (ticket?.checklist || []) as Array<{ id: string; text: string; done: boolean }>
  const totalItems = checklistItems.length
  const doneItems = checklistItems.filter(i => i.done).length
  const progress = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100)
  const prevProgressRef = useRef(progress)
  const [isProgressAnimating, setIsProgressAnimating] = useState(false)
  // isProgressAnimating is used in setIsProgressAnimating calls

  useEffect(() => {
    if (!ticket) return
    
    console.log('🎫 TicketDetailsModal: Opening ticket:', ticket)
    console.log('💬 Comments in ticket:', ticket.comments)
    console.log('🔗 Links in ticket:', ticket.links)
    console.log('✅ Checklist in ticket:', ticket.checklist)
    console.log('👤 Assignee ID in ticket:', ticket.assignee_id)

    // Мгновенная загрузка данных тикета
    setTitle(ticket.title)
    setDescription(ticket.description || '')
    setStatus(ticket.status)
    setPriority(ticket.priority)
    setAssigneeId(ticket.assignee_id || null)
    
    console.log('👤 Set assigneeId to:', ticket.assignee_id || null)
  }, [ticket?.id])

  // Load project members for mentions and auto-focus input
  useEffect(() => {
    if (!isOpen) return
    
    // Clear input and mentions when modal opens
    setSmartInput('')
    setLeadMention(null)
    setMentionQuery('')
    setShowMentionList(false)
    setMentionIndex(0)
    
    // Auto-focus the smart input when modal opens
    setTimeout(() => {
      if (smartInputRef.current) {
        smartInputRef.current.focus()
        // Trigger glow animation
        setShowInputGlow(true)
        setTimeout(() => setShowInputGlow(false), 3000) // Reset after animation
        console.log('🎯 Auto-focused smart input and cleared previous data')
      }
    }, 100) // Small delay to ensure modal is fully rendered
    
    ;(async () => {
      try {
        // Проверяем кэш
        const cachedMembers = membersCacheRef.current.get(projectId)
        if (cachedMembers) {
          console.log('🚀 Using cached members for project:', projectId)
          setMembers(cachedMembers)
          setIsMembersLoading(false)
          return
        }

        setIsMembersLoading(true)
        const { supabase } = await import('../lib/supabase')
        console.log('🔍 Loading project members for project:', projectId)
        
        // Используем простой запрос без JOIN
        const { data, error } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', projectId)
        
        console.log('📊 Project members data:', data, 'Error:', error)
        
        if (!error && data && data.length > 0) {
          // Получаем профили отдельно
          const userIds = data.map(pm => pm.user_id).filter(Boolean)
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
          
          if (!profilesError && profilesData) {
            const mappedMembers = profilesData.map(p => ({ 
              id: p.id, 
              full_name: p.full_name ?? null, 
              email: p.email ?? null 
            }))
            console.log('👥 Mapped members:', mappedMembers)
            
            // Сохраняем в кэш
            membersCacheRef.current.set(projectId, mappedMembers)
            
            setMembers(mappedMembers)
            setIsMembersLoading(false)
          } else {
            console.error('❌ Failed to load profiles:', profilesError)
            // Fallback: try to get current user as a member
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              console.log('🔄 Using current user as fallback:', user)
              const fallbackMembers = [{ id: user.id, full_name: user.user_metadata?.full_name || null, email: user.email || null }]
              membersCacheRef.current.set(projectId, fallbackMembers)
              setMembers(fallbackMembers)
            } else {
              setMembers([])
            }
            setIsMembersLoading(false)
          }
        } else {
          console.error('❌ Failed to load project members:', error)
          // Fallback: try to get current user as a member
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            console.log('🔄 Using current user as fallback:', user)
            const fallbackMembers = [{ id: user.id, full_name: user.user_metadata?.full_name || null, email: user.email || null }]
            membersCacheRef.current.set(projectId, fallbackMembers)
            setMembers(fallbackMembers)
            setIsMembersLoading(false)
          } else {
            setIsMembersLoading(false)
          }
        }
      } catch (err) {
        console.error('❌ Error loading project members:', err)
        setIsMembersLoading(false)
      }
    })()
  }, [isOpen, projectId])

  useEffect(() => {
    if (prevProgressRef.current !== progress) {
      setIsProgressAnimating(true)
      const t = setTimeout(() => setIsProgressAnimating(false), 600)
      prevProgressRef.current = progress
      return () => clearTimeout(t)
    }
  }, [progress])

  // Skeleton component for loading states
  const AvatarSkeleton = () => (
    <div style={{
      width: 140,
      height: 140,
      borderRadius: '50%',
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      marginBottom: '8px'
    } as React.CSSProperties} />
  )

  const TextSkeleton = ({ width = '80px', height = '16px' }: { width?: string; height?: string }) => (
    <div style={{
      width,
      height,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '4px',
      margin: '4px 0'
    } as React.CSSProperties} />
  )

  // Добавляем CSS для shimmer анимации
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `
    document.head.appendChild(style)
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  if (!isOpen || !ticket) return null

  // Функция для определения активна ли иконка для выбранного приоритета
  const isIconActive = (iconIndex: number, selectedPriority: TicketPriority): boolean => {
    const priorityOrder = ['v-low', 'low', 'medium', 'high', 'veryhigh']
    const selectedIndex = priorityOrder.indexOf(selectedPriority)
    return iconIndex <= selectedIndex
  }


  // Функция для обработки файлов через drag & drop
  const handleFileDrop = async (files: FileList) => {
    try {
      const newAttachments = Array.from(files).map(file => ({
        id: crypto.randomUUID(),
        name: file.name
      }))
      
      const updatedAttachments = [...(ticket?.attachments || []), ...newAttachments]
      
      // Сохраняем локально
      onSave({ attachments: updatedAttachments })
      
      // Сохраняем в базу данных
      if (onSaveToDatabase && ticket) {
        await onSaveToDatabase(ticket.id, { attachments: updatedAttachments })
      }
      
      console.log('📎 Files attached:', newAttachments.map(f => f.name))
    } catch (error) {
      console.error('Error attaching files:', error)
    }
  }

  // Функция для получения CSS filter для окрашивания иконки
  const getIconFilter = (iconIndex: number, selectedPriority: TicketPriority): string => {
    if (!isIconActive(iconIndex, selectedPriority)) {
      return 'grayscale(100%) opacity(0.5)' // неактивная иконка - серая
    }
    
    // Активные иконки показывают оригинальные цвета SVG
    // case 0-1: всегда черные для всех приоритетов
    // case 2: оригинальный цвет (черный для medium, оранжевый для high+, красный для veryhigh)
    // case 3: оригинальный цвет (черный для medium, оранжевый для high+, красный для veryhigh)
    // case 4: оригинальный цвет (черный для medium, оранжевый для high+, красный для veryhigh)
    return 'none' // показываем оригинальный цвет SVG
  }

  // Функция для получения текста приоритета
  const getPriorityText = (priority: TicketPriority): string => {
    switch (priority) {
      case 'v-low': return 'Very Low'
      case 'low': return 'Low'
      case 'medium': return 'Medium'
      case 'high': return 'High'
      case 'veryhigh': return 'Very High'
      default: return 'Medium'
    }
  }


  // Умные функции для обработки ввода
  const detectInputType = (text: string): 'comment' | 'link' | 'requirement' | 'file' | 'text' => {
    const trimmed = text.trim()
    
    // @username - комментарий с упоминанием
    if (trimmed.startsWith('@')) return 'comment'
    
    // http:// или www. - ссылка
    if (trimmed.match(/^(https?:\/\/|www\.)/i)) return 'link'
    
    // #hashtag - тег/категория
    if (trimmed.startsWith('#')) return 'comment'
    
    // !priority - изменение приоритета
    if (trimmed.startsWith('!')) return 'text'
    
    // +requirement - добавление в requirements
    if (trimmed.startsWith('+')) return 'requirement'
    
    // /command - специальные команды
    if (trimmed.startsWith('/')) return 'text'
    
    // Любой другой текст - комментарий
    return 'comment'
  }

    const handleSmartInput = async (text: string) => {
    const inputType = detectInputType(text)
    const trimmed = text.trim()

    if (!trimmed) return

    try {
      switch (inputType) {
        case 'comment':
          // Добавляем комментарий
          const newComment = {
            id: crypto.randomUUID(),
            author: user?.user_metadata?.full_name || user?.email || 'User',
            author_id: user?.id || null,
            text: trimmed,
            ts: new Date().toISOString()
          }
          const updatedComments = [...(ticket?.comments || []), newComment]
          
          // Сохраняем локально
          onSave({ comments: updatedComments })
          
          // Сохраняем в базу данных
          if (onSaveToDatabase && ticket) {
            await onSaveToDatabase(ticket.id, { comments: updatedComments })
          }
          break

        case 'link':
          // Добавляем ссылку
          const newLink = {
            id: crypto.randomUUID(),
            url: trimmed
          }
          const updatedLinks = [...(ticket?.links || []), newLink]
          
          // Сохраняем локально
          onSave({ links: updatedLinks })
          
          // Сохраняем в базу данных
          if (onSaveToDatabase && ticket) {
            await onSaveToDatabase(ticket.id, { links: updatedLinks })
          }
          break

        case 'requirement':
          // Добавляем в requirements
          const requirementText = trimmed.startsWith('+') ? trimmed.slice(1).trim() : trimmed
          if (requirementText) {
            const newRequirement = {
              id: crypto.randomUUID(),
              text: requirementText,
              done: false
            }
            const updatedChecklist = [...checklistItems, newRequirement]
            
            // Сохраняем локально
            onSave({ checklist: updatedChecklist })
            
            // Сохраняем в базу данных
            if (onSaveToDatabase && ticket) {
              await onSaveToDatabase(ticket.id, { checklist: updatedChecklist })
            }
          }
          break

        case 'file':
          // Обрабатываем файлы (будет реализовано через drag & drop)
          break
          
        case 'text':
          // Обрабатываем специальные команды
          if (trimmed.startsWith('!')) {
            const priorityMatch = trimmed.match(/^!(\w+)$/i)
            if (priorityMatch) {
              const newPriority = priorityMatch[1].toLowerCase() as TicketPriority
              if (['v-low', 'low', 'medium', 'high', 'veryhigh'].includes(newPriority)) {
                setPriority(newPriority)
                
                // Сохраняем локально
                onSave({ priority: newPriority })
                
                // Сохраняем в базу данных
                if (onSaveToDatabase && ticket) {
                  await onSaveToDatabase(ticket.id, { priority: newPriority })
                }
              }
            }
          }
          break
      }

      setSmartInput('')
      setInputMode('text')
    } catch (error) {
      console.error('Error saving to database:', error)
      // Можно добавить уведомление об ошибке
    }
  }

  // Функция для форматирования текста комментария с выделением упоминаний и ссылок
  const formatCommentText = (text: string) => {
    if (!text) return ''
    
    // Разбиваем текст на части для выделения @username
    const parts = text.split(/(@\w+)/g)
    
    return parts.map((part, index) => {
      if (part.match(/^@\w+$/)) {
        // Выделяем упоминания синим цветом
        return (
          <span key={index} style={{ 
            color: '#3B82F6', 
            fontWeight: '600',
            backgroundColor: '#EFF6FF',
            padding: '2px 4px',
            borderRadius: '4px'
          }}>
            {part}
          </span>
        )
      }
      
      // Используем SmartText для обработки ссылок в обычном тексте
      return <SmartText key={index} text={part} />
    })
  }


  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.4)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 2147483647, 
            overscrollBehavior: 'contain',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') onClose() }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ 
              opacity: 0
            }}
            animate={{ 
              opacity: 1
            }}
            exit={{ 
              opacity: 0
            }}
            transition={{ 
              duration: 0.1,
              ease: "easeOut"
            }}
            style={{ 
              width: 1058, 
              minHeight: 800, 
              height: 'calc(100vh - 40px)', 
              maxHeight: 840, 
              background: '#fff', 
              borderRadius: 12, 
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)', 
              overflow: 'hidden', 
              display: 'grid', 
              gridTemplateColumns: '240px 1fr'
            } as React.CSSProperties}
            onMouseDown={(e) => e.stopPropagation()}
          >
        {/* Left: avatar */}
        <div style={{ background: '#F8FAFC', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {(() => { console.log('🎨 Rendering UserAvatar with assigneeId:', assigneeId); return null })()}
          {isMembersLoading ? (
            <AvatarSkeleton />
          ) : (
            <UserAvatar 
              userId={assigneeId || null}
              size={140}
              showName={true}
            />
          )}
          
          {/* Assignee Dropdown */}
          <div style={{ width: '100%' }}>
            {isMembersLoading ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <TextSkeleton width="120px" height="32px" />
                <TextSkeleton width="80px" height="12px" />
              </div>
            ) : (
              <AssigneeDropdown
                projectId={projectId}
                currentAssignee={assigneeId}
                onAssigneeChange={(assigneeId) => {
                  onSave({ assignee_id: assigneeId })
                  // Сохраняем в базу данных
                  if (onSaveToDatabase && ticket) {
                    onSaveToDatabase(ticket.id, { assignee_id: assigneeId })
                  }
                  // Уведомляем об изменении назначения для обновления заголовка
                  window.dispatchEvent(new CustomEvent('ticket-assignment-changed'))
                }}
                onAssigneeSelected={(member) => {
                  setAssigneeId(member?.id || null)
                }}
              />
            )}
          </div>
        </div>

        {/* Right: content */}
        <div style={{ padding: 0, height: '100%', overflow: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' } as React.CSSProperties}>
          {/* Header controls (sticky) */}
          <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#fff', padding: '20px 24px 12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #EEF2F6' }}>
            {/* Система выбора важности с иконками */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {/* Иконки приоритетов */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0px'
              }}>
                {(['v-low', 'low', 'medium', 'high', 'veryhigh'] as TicketPriority[]).map((p, index) => (
                  <button
                    key={p}
                    onClick={async () => { 
                      setPriority(p); 
                      onSave({ priority: p });
                      // Сохраняем в базу данных
                      if (onSaveToDatabase && ticket) {
                        try {
                          await onSaveToDatabase(ticket.id, { priority: p });
                        } catch (error) {
                          console.error('Error saving priority to database:', error);
                        }
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '50%',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px'
                    } as React.CSSProperties}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F3F4F6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none'
                    }}
                  >
                    <img 
                      src={`/icons/loicon-${p}.svg`}
                      alt={getPriorityText(p)}
                      style={{ 
                        width: '24px', 
                        height: '24px',
                        filter: getIconFilter(index, priority),
                        opacity: isIconActive(index, priority) ? 1 : 0.5
                      } as React.CSSProperties}
                    />
                  </button>
                ))}
              </div>

              {/* Текст выбранного приоритета */}
              <div style={{
                marginLeft: '1px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '500',
                color: '#374151',
                minWidth: '70px',
                textAlign: 'center'
              }}>
                {getPriorityText(priority)}
              </div>
            </div>
            <button onClick={onClose} style={{ border: '1px solid #E2E8F0', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Main Content Container - takes remaining space */}
          <div style={{ flex: 1, overflow: 'auto' }}>
                      {/* Title (editable, looks like text) */}
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={async (e) => { 
              const v = e.currentTarget.textContent || ''; 
              if (v !== title) { 
                setTitle(v); 
                onSave({ title: v });
                // Сохраняем в базу данных
                if (onSaveToDatabase && ticket) {
                  try {
                    await onSaveToDatabase(ticket.id, { title: v });
                  } catch (error) {
                    console.error('Error saving title to database:', error);
                  }
                }
              } 
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLElement).blur() } }}
            style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', outline: 'none', marginBottom: 6, padding: '16px 24px 0 24px' }}
          >{title}</div>

          {/* Description */}
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6, padding: '0 24px' }}>Description</div>
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={async (e) => { 
              const v = e.currentTarget.textContent || ''; 
              if (v !== description) {
                setDescription(v); 
                onSave({ description: v });
                // Сохраняем в базу данных
                if (onSaveToDatabase && ticket) {
                  try {
                    await onSaveToDatabase(ticket.id, { description: v });
                  } catch (error) {
                    console.error('Error saving description to database:', error);
                  }
                }
              }
            }}
            style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.5, outline: 'none', background: 'transparent', padding: '0 24px', border: 'none', marginBottom: 16, textAlign: 'left' }}
          >{description}</div>

          {/* Requirements */}
          <div style={{ margin: '0 24px 14px 24px', background: '#F8FAFC', borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Requirements</div>
            {/* Progress row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: '#475569', width: 40, textAlign: 'right' }}>{progress}%</div>
              <div style={{ flex: 1, height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' } as React.CSSProperties}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#2563EB' } as React.CSSProperties} />
              </div>
            </div>

            {/* Creator row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', border: 'none', borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* create icon */}
                <img src="/icons/tabler-icon-square-plus.svg" width={24} height={24} alt="add" style={{ opacity: 0.6 }}/>
                <input
                  placeholder="Create new item"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 14, width: 340, background: 'transparent' }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const value = newItem.trim()
                      if (!value) return
                      const next = [...checklistItems, { id: crypto.randomUUID(), text: value, done: false }]
                      onSave({ checklist: next });
                      
                      // Сохраняем в базу данных
                      if (onSaveToDatabase && ticket) {
                        try {
                          await onSaveToDatabase(ticket.id, { checklist: next });
                        } catch (error) {
                          console.error('Error saving checklist to database:', error);
                        }
                      }
                      
                      setNewItem('')
                    }
                  }}
                />
              </div>
              <button
                onClick={async () => {
                  const value = newItem.trim()
                  if (!value) return
                  const next = [...checklistItems, { id: crypto.randomUUID(), text: value, done: false }]
                  onSave({ checklist: next });
                  
                  // Сохраняем в базу данных
                  if (onSaveToDatabase && ticket) {
                    try {
                      await onSaveToDatabase(ticket.id, { checklist: next });
                    } catch (error) {
                      console.error('Error saving checklist to database:', error);
                    }
                  }
                  
                  setNewItem('')
                }}
                disabled={!newItem.trim()}
                style={{ background: 'none', border: 'none', color: newItem.trim() ? '#0F172A' : '#94A3B8', fontSize: 14, cursor: newItem.trim() ? 'pointer' : 'default' }}
              >
                Create one
              </button>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {checklistItems.map(it => (
                <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer' }}>
                  <img
                    src={it.done ? '/icons/tabler-icon-square-check-filled.svg' : '/icons/tabler-icon-square.svg'}
                    width={24}
                    height={24}
                    alt={it.done ? 'done' : 'open'}
                    onClick={async () => {
                      const next = checklistItems.map(x => x.id === it.id ? { ...x, done: !it.done } : x)
                      onSave({ checklist: next });
                      
                      // Сохраняем в базу данных
                      if (onSaveToDatabase && ticket) {
                        try {
                          await onSaveToDatabase(ticket.id, { checklist: next });
                        } catch (error) {
                          console.error('Error saving checklist to database:', error);
                        }
                      }
                    }}
                  />
                  <span contentEditable suppressContentEditableWarning onBlur={async (e) => {
                    const v = (e.currentTarget.textContent || '').trim()
                    if (v && v !== it.text) {
                      const next = checklistItems.map(x => x.id === it.id ? { ...x, text: v } : x)
                      onSave({ checklist: next });
                      
                      // Сохраняем в базу данных
                      if (onSaveToDatabase && ticket) {
                        try {
                          await onSaveToDatabase(ticket.id, { checklist: next });
                        } catch (error) {
                          console.error('Error saving checklist to database:', error);
                        }
                      }
                    }
                  }}>{it.text}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Links Section - отображаем только если есть ссылки */}
          {(ticket.links && ticket.links.length > 0) && (
            <>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6, padding: '0 24px' }}>Links</div>
              <div style={{ margin: '0 24px 16px 24px', background: '#F8FAFC', borderRadius: 16, padding: 12 }}>
                {(ticket.links || []).map(l => (
                  <SmartLink 
                    key={l.id} 
                    url={l.url}
                    onDelete={() => {
                      const updatedLinks = ticket.links?.filter(link => link.id !== l.id) || []
                      onSave({ links: updatedLinks })
                      if (onSaveToDatabase && ticket) {
                        onSaveToDatabase(ticket.id, { links: updatedLinks })
                      }
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Attachments - отображаем только если есть файлы */}
          {(ticket.attachments && ticket.attachments.length > 0) && (
            <>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6, padding: '0 24px' }}>Attachments</div>
              <div style={{ margin: '0 24px 16px 24px', background: '#F8FAFC', borderRadius: 16, padding: 12 }}>
                {(ticket.attachments || []).map((attachment) => (
                  <div key={attachment.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 0',
                    borderBottom: '1px solid #E2E8F0'
                  }}>
                    {/* File Icon */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    } as React.CSSProperties}>
                      <span style={{ fontSize: '16px' }}>📎</span>
                    </div>
                    
                    {/* File Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        color: '#374151',
                        fontWeight: '500',
                        lineHeight: '1.3'
                      }}>
                        {attachment.name}
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={async () => {
                        const updatedAttachments = ticket.attachments?.filter(a => a.id !== attachment.id) || []
                        onSave({ attachments: updatedAttachments })
                        if (onSaveToDatabase && ticket) {
                          await onSaveToDatabase(ticket.id, { attachments: updatedAttachments })
                        }
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(0, 0, 0, 0.64)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        transition: 'color 0.2s ease'
                      } as React.CSSProperties}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#000000'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(0, 0, 0, 0.64)'
                      }}
                    >
                      <img 
                        src="/icons/tabler-icon-minus.svg" 
                        alt="Delete" 
                        style={{
                          width: '16px',
                          height: '16px',
                          filter: 'brightness(0)',
                          opacity: 0.64
                        } as React.CSSProperties}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Comments - отображаем только если есть комментарии */}
          {(ticket.comments && ticket.comments.length > 0) && (
            <>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6, padding: '0 24px' }}>Comments</div>
              <div style={{ margin: '0 8px 16px 8px', background: 'white', borderRadius: 16, padding: 16 }}>
                {(ticket.comments || []).map(c => (
                  <div key={c.id} style={{ padding: '16px 16px 16px 0', background: 'transparent', borderRadius: 0, marginBottom: '12px', border: 'none' }}>
                    {/* Comment Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      {/* Avatar */}
                      <UserAvatar 
                        userId={c.author_id || null}
                        userName={c.author}
                        size={40}
                        showName={false}
                      />
                      
                      {/* User Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '2px' }}>
                          {c.author || 'Unassigned'}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                          {new Date(c.ts).toLocaleDateString('de-DE', { 
                            day: '2-digit', 
                            month: 'long', 
                            year: 'numeric' 
                          })} um {new Date(c.ts).toLocaleTimeString('de-DE', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Comment Content */}
                    <div style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.5 }}>
                      {formatCommentText(c.text)}
                    </div>
                    
                    {/* Comment Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTop: 'none' }}>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 12, cursor: 'pointer' }}>
                        <span style={{ fontSize: 16 }}>↶</span>
                        Reply
                      </button>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 12, cursor: 'pointer' }}>
                        <span style={{ fontSize: 16 }}>👍</span>
                        Like
                      </button>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 12, cursor: 'pointer' }}>
                        <span style={{ fontSize: 16 }}>😊</span>
                        React
                      </button>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 12, cursor: 'pointer' }}>
                        <span style={{ fontSize: 16 }}>⋯</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

                {/* Sticky Command Input Section - positioned in right column */}
        <div style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '1px solid #E2E8F0',
          padding: '12px 24px',
          marginTop: 'auto',
          zIndex: 10,
          minHeight: '60px'
        }}>
            <div 
              className={showInputGlow ? 'magic-input-glow' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: isDragOver ? '#EFF6FF' : '#F8FAFC',
                border: isDragOver ? '2px dashed #3B82F6' : '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 16px',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDragOver(false)
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                const files = e.dataTransfer.files
                if (files.length > 0) {
                  handleFileDrop(files)
                }
              }}
            >
                          {/* Smart Command Icon */}
            <div 
              title="Click to select files or drag & drop files here"
              style={{
                width: '20px',
                height: '20px',
                background: 'transparent',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'black',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onClick={() => {
                // Создаем скрытый input для выбора файлов
                const fileInput = document.createElement('input')
                fileInput.type = 'file'
                fileInput.multiple = true
                fileInput.accept = '*/*'
                fileInput.style.display = 'none'
                
                fileInput.onchange = async (e) => {
                  const target = e.target as HTMLInputElement
                  if (target.files && target.files.length > 0) {
                    await handleFileDrop(target.files)
                  }
                  // Удаляем input после использования
                  document.body.removeChild(fileInput)
                }
                
                document.body.appendChild(fileInput)
                fileInput.click()
              }}
              >
              {inputMode === 'comment' ? '💬' : 
               inputMode === 'link' ? '🔗' : 
               inputMode === 'requirement' ? '✅' : 
               inputMode === 'file' ? '📎' :
                               <img 
                  src="/icons/tabler-icon-build.svg" 
                  alt="Build" 
                  style={{
                    width: '20px',
                    height: '20px',
                    filter: 'brightness(0)'
                  } as React.CSSProperties}
                />}
            </div>
              
              {/* Smart Input Field */}
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {leadMention && (
                  <div
                    style={{
                      background: '#000',
                      color: '#fff',
                      borderRadius: 999,
                      padding: '6px 10px',
                      fontSize: 14,
                      fontWeight: 800,
                      pointerEvents: 'none'
                    }}
                  >@{leadMention}</div>
                )}
                <input
                  type="text"
                  ref={smartInputRef as any}
                  value={smartInput}
                  onFocus={() => {
                    // Trigger glow animation on manual focus
                    setShowInputGlow(true)
                    setTimeout(() => setShowInputGlow(false), 3000)
                  }}
                  onChange={(e) => {
                  const v = e.target.value
                  setSmartInput(v)
                  const inputType = detectInputType(v)
                  setInputMode(inputType)
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
                  onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (showMentionList) {
                      e.preventDefault()
                      const list = members
                        .filter(m => (m.email || '').toLowerCase().includes(mentionQuery) || (m.full_name || '').toLowerCase().includes(mentionQuery))
                      if (list.length > 0) {
                        const m = list[Math.max(0, Math.min(mentionIndex, list.length - 1))]
                        // Move selected mention to chip and keep input clean
                        const token = (m.full_name || m.email || 'user')
                        const remainder = smartInput.replace(/(^|\s)@[^\s]*$/,'').trimStart()
                        setLeadMention(token)
                        setSmartInput(remainder)
                        setShowMentionList(false)
                        setTimeout(() => smartInputRef.current?.focus(), 0)
                        return
                      }
                    }
                    e.preventDefault()
                    const combined = (leadMention ? `@${leadMention} ` : '') + smartInput
                    handleSmartInput(combined)
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
                  if (e.key === 'Backspace' && !smartInput && leadMention) {
                    // remove chip when input is empty
                    setLeadMention(null)
                  }
                  }}
                  placeholder={inputMode === 'comment' ? 'Напишите комментарий, @username или #hashtag...' : 
                             inputMode === 'link' ? 'http://... или www...' : 
                             inputMode === 'requirement' ? '+requirement...' : 
                             inputMode === 'file' ? 'Drop files here or type...' :
                             'Type a command or add content...'}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '14px',
                    color: '#0F172A',
                    caretColor: '#0F172A',
                    paddingRight: 4,
                    minHeight: '20px'
                  }}
                />
              </div>

              {showMentionList && mentionQuery && (
                <div style={{
                  position: 'absolute',
                  bottom: 46,
                  left: 56,
                  background: 'rgba(0, 0, 0, 0.88)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  padding: '8px 0',
                  minWidth: 260,
                  zIndex: 50
                }}>
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
                      onClick={() => {
                        const token = (m.full_name || m.email || 'user')
                        const remainder = smartInput.replace(/(^|\s)@[^\s]*$/,'').trimStart()
                        setLeadMention(token)
                        setSmartInput(remainder)
                        setShowMentionList(false)
                        setTimeout(() => smartInputRef.current?.focus(), 0)
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
              
              {/* Drop Zone Overlay */}
              {isDragOver && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  <div style={{
                    background: '#3B82F6',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📎 Drop files to attach
                  </div>
                </div>
              )}
              
              {/* Send Button */}
              <button 
                onClick={() => handleSmartInput((leadMention ? `@${leadMention} ` : '') + smartInput)}
                disabled={!smartInput.trim()}
                style={{
                  background: smartInput.trim() ? '#3B82F6' : '#E2E8F0',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: smartInput.trim() ? 'white' : '#94A3B8',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: smartInput.trim() ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  opacity: smartInput.trim() ? 1 : 0.6
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default TicketDetailsModal

