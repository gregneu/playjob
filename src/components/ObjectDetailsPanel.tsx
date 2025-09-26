import React, { useState, useEffect } from 'react'
import { GlassPanel } from './GlassPanel'
import { X, Paperclip, MessageCircle, CheckSquare, Square, ChevronDown } from 'lucide-react'
import { SmartText } from './SmartText'
import { UserAvatar } from './UserAvatar'

// Упрощенные типы статусов
type TaskStatus = 'open' | 'in_progress' | 'done'

type TaskPriority = 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  storyPoints?: number
  checklist?: Array<{
    id: string
    text: string
    completed: boolean
  }>
  attachments?: Array<{
    id: string
    name: string
    type: string
    size: string
  }>
  comments?: Array<{
    id: string
    author: string
    author_id?: string | null
    text: string
    timestamp: string
  }>
}

interface ObjectDetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onSave?: (updatedTask: Task) => void
}

export const ObjectDetailsPanel: React.FC<ObjectDetailsPanelProps> = ({
  isOpen,
  onClose,
  task,
  onSave
}) => {
  const [newComment, setNewComment] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedStatus, setEditedStatus] = useState<TaskStatus>('open')
  const [editedPriority, setEditedPriority] = useState<TaskPriority>('medium')
  const [editedStoryPoints, setEditedStoryPoints] = useState<number>(0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  // Состояние анимации
  const [isVisible, setIsVisible] = useState(false)

  // Инициализируем состояния при открытии панели
  useEffect(() => {
    if (task) {
      setEditedTitle(task.title)
      setEditedDescription(task.description)
      setEditedStatus(task.status)
      setEditedPriority(task.priority || 'medium')
      setEditedStoryPoints(task.storyPoints || 0)
      setHasUnsavedChanges(false)
      // Анимация появления
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [task])

  // Закрываем dropdown'ы при клике вне их области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.status-dropdown') && !target.closest('.priority-dropdown')) {
        setShowStatusDropdown(false)
        setShowPriorityDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Функция принудительного сохранения при закрытии
  const handleCloseWithSave = () => {
    if (hasUnsavedChanges && task && onSave) {
      console.log('Saving changes before closing...')
      const updatedTask = {
        ...task,
        title: editedTitle,
        description: editedDescription,
        status: editedStatus,
        priority: editedPriority,
        storyPoints: editedStoryPoints
      }
      onSave(updatedTask)
    }
    // Анимация закрытия
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300) // Ждем завершения анимации
  }

  if (!isOpen || !task) {
    return null
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'open':
        return '#FF6B6B'
      case 'in_progress':
        return '#4ECDC4'
      case 'done':
        return '#96CEB4'
      default:
        return '#FF6B6B'
    }
  }

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case 'open':
        return 'Open'
      case 'in_progress':
        return 'In Progress'
      case 'done':
        return 'Done'
      default:
        return 'Open'
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'v-low':
        return '#96CEB4'
      case 'low':
        return '#4ECDC4'
      case 'medium':
        return '#FFEAA7'
      case 'high':
        return '#FF6B6B'
      case 'veryhigh':
        return '#FF6B6B'
      default:
        return '#4ECDC4'
    }
  }

  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case 'v-low':
        return 'V-Low'
      case 'low':
        return 'Low'
      case 'medium':
        return 'Medium'
      case 'high':
        return 'High'
      case 'veryhigh':
        return 'Very High'
      default:
        return 'Medium'
    }
  }

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' }
  ]

  const priorityOptions: { value: TaskPriority; label: string }[] = [
    { value: 'v-low', label: 'V-Low' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'veryhigh', label: 'Very High' }
  ]

  const handleStatusChange = (newStatus: TaskStatus) => {
    setEditedStatus(newStatus)
    setHasUnsavedChanges(true)
    setShowStatusDropdown(false)
    console.log('Status changed to:', newStatus)
    if (onSave && task) {
      onSave({
        ...task,
        status: newStatus
      })
      setTimeout(() => setHasUnsavedChanges(false), 100)
    }
  }

  const handlePriorityChange = (newPriority: TaskPriority) => {
    setEditedPriority(newPriority)
    setHasUnsavedChanges(true)
    setShowPriorityDropdown(false)
    console.log('Priority changed to:', newPriority)
    if (onSave && task) {
      onSave({
        ...task,
        priority: newPriority
      })
      setTimeout(() => setHasUnsavedChanges(false), 100)
    }
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      console.log('Adding comment:', newComment)
      setNewComment('')
    }
  }

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      console.log('Adding checklist item:', newChecklistItem)
      setNewChecklistItem('')
    }
  }

  const handleSaveTitle = () => {
    console.log('Saving title:', editedTitle)
    setEditingTitle(false)
    setHasUnsavedChanges(false)
    if (onSave && task) {
      onSave({
        ...task,
        title: editedTitle
      })
    }
  }

  const handleSaveDescription = () => {
    console.log('Saving description:', editedDescription)
    setEditingDescription(false)
    setHasUnsavedChanges(false)
    if (onSave && task) {
      onSave({
        ...task,
        description: editedDescription
      })
    }
  }

  const handleStoryPointsChange = (newStoryPoints: number) => {
    setEditedStoryPoints(newStoryPoints)
    setHasUnsavedChanges(true)
    console.log('Story points changed to:', newStoryPoints)
    if (onSave && task) {
      onSave({
        ...task,
        storyPoints: newStoryPoints
      })
      setTimeout(() => setHasUnsavedChanges(false), 100)
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: '80px', // Отступ под header
      right: '16px',
      bottom: '16px', // Приклеиваем к нижнему краю
      width: '400px',
      zIndex: 2000,
      transition: 'all 0.3s ease-out',
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      opacity: isVisible ? 1 : 0
    }}>
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          marginBottom: '16px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Task Details
            {hasUnsavedChanges && (
              <span style={{
                fontSize: '12px',
                color: '#FF6B6B',
                fontWeight: '500'
              }}>
                (unsaved)
              </span>
            )}
          </h2>
          <button
            onClick={handleCloseWithSave}
            style={{
              background: 'rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              color: '#666',
              padding: '8px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '0 24px 24px 24px'
        }}>
          {/* Status & Priority */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>
                Status
              </h3>
              <div className="status-dropdown" style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: getStatusColor(editedStatus),
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  {getStatusText(editedStatus)}
                  <ChevronDown size={14} />
                </button>
                
                {showStatusDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleStatusChange(option.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: editedStatus === option.value ? getStatusColor(option.value) : 'transparent',
                          color: editedStatus === option.value ? 'white' : '#333',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: editedStatus === option.value ? '600' : '400',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>
                Priority
              </h3>
              <div className="priority-dropdown" style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: getPriorityColor(editedPriority),
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  {getPriorityText(editedPriority)}
                  <ChevronDown size={14} />
                </button>
                
                {showPriorityDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000
                  }}>
                    {priorityOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handlePriorityChange(option.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: editedPriority === option.value ? getPriorityColor(option.value) : 'transparent',
                          color: editedPriority === option.value ? 'white' : '#333',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: editedPriority === option.value ? '600' : '400',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Story Points */}
          <div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#666'
            }}>
              Story Points
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#4ECDC4'
                }}>
                  {editedStoryPoints}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: '#666'
                }}>
                  SP
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '4px'
              }}>
                {[1, 2, 3, 5, 8, 13, 21].map((points) => (
                  <button
                    key={points}
                    onClick={() => handleStoryPointsChange(points)}
                    style={{
                      padding: '6px 10px',
                      background: editedStoryPoints === points ? '#FF6B6B' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: editedStoryPoints === points ? '600' : '400',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {points}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => handleStoryPointsChange(0)}
                style={{
                  padding: '6px 10px',
                  background: editedStoryPoints === 0 ? '#FF6B6B' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: editedStoryPoints === 0 ? '600' : '400',
                  transition: 'all 0.2s ease'
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#666'
            }}>
              Title
            </h3>
            {editingTitle ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => {
                    setEditedTitle(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    color: '#333',
                    fontSize: '16px',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  style={{
                    padding: '8px 12px',
                    background: '#4ECDC4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Save
                </button>
                                  <button
                    onClick={() => {
                      setEditingTitle(false)
                      setEditedTitle(task.title)
                    }}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.05)',
                      color: '#666',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Cancel
                  </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  flex: 1
                }}>
                  {editedTitle || task.title}
                </h4>
                <button
                  onClick={() => {
                    setEditingTitle(true)
                    setEditedTitle(editedTitle || task.title)
                  }}
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    color: '#666',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#666'
            }}>
              Description
            </h3>
            {editingDescription ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  value={editedDescription}
                  onChange={(e) => {
                    setEditedDescription(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    color: '#333',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSaveDescription}
                    style={{
                      padding: '8px 12px',
                      background: '#4ECDC4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingDescription(false)
                      setEditedDescription(task.description)
                    }}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.05)',
                      color: '#666',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  color: '#333',
                  lineHeight: '1.5'
                }}>
                  {editedDescription || task.description}
                </p>
                <button
                  onClick={() => {
                    setEditingDescription(true)
                    setEditedDescription(editedDescription || task.description)
                  }}
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    color: '#666',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckSquare size={14} />
              Checklist
            </h3>
            <div style={{ marginBottom: '12px' }}>
              {task.checklist?.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px'
                }}>
                  {item.completed ? (
                    <CheckSquare size={16} style={{ color: '#4ECDC4' }} />
                  ) : (
                                      <Square size={16} style={{ color: '#999' }} />
                )}
                <span style={{
                  fontSize: '14px',
                  color: item.completed ? '#999' : '#333',
                  textDecoration: item.completed ? 'line-through' : 'none'
                }}>
                  {item.text}
                </span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Add checklist item..."
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  background: 'white',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '6px',
                  color: '#333',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleAddChecklistItem}
                style={{
                  padding: '6px 12px',
                  background: '#4ECDC4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Attachments - отображаем только если есть файлы */}
          {(task.attachments && task.attachments.length > 0) && (
            <div>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Paperclip size={14} />
                Attachments
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {task.attachments?.map((attachment) => (
                  <div key={attachment.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.05)',
                    borderRadius: '6px'
                  }}>
                    <Paperclip size={14} style={{ color: '#999' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#333',
                        fontWeight: '500'
                      }}>
                        {attachment.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        {attachment.type} • {attachment.size}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments - отображаем только если есть комментарии */}
          {(task.comments && task.comments.length > 0) && (
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <MessageCircle size={14} />
                Comments
              </h3>
              <div style={{ marginBottom: '12px', maxHeight: '200px', overflow: 'auto' }}>
                {task.comments?.map((comment) => (
                  <div key={comment.id} style={{
                    marginBottom: '12px',
                    padding: '12px 12px 12px 0',
                    background: 'transparent',
                    borderRadius: '0',
                    border: 'none'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <UserAvatar 
                        userId={comment.author_id || null}
                        userName={comment.author}
                        size={32}
                        showName={false}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '2px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#4ECDC4'
                          }}>
                            {comment.author}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: '#666'
                          }}>
                            {comment.timestamp}
                          </span>
                        </div>
                        <div style={{
                          margin: 0,
                          fontSize: '14px',
                          color: '#333',
                          lineHeight: '1.4'
                        }}>
                          <SmartText text={comment.text} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Input field for new comments - always visible */}
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              style={{
                flex: 1,
                padding: '6px 12px',
                background: 'white',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '6px',
                color: '#333',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleAddComment}
              style={{
                padding: '6px 12px',
                background: '#4ECDC4',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 