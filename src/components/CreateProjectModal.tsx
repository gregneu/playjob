import React, { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { createPortal } from 'react-dom'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateProject: (projectData: { name: string; description?: string; color: string; icon: string }) => Promise<void>
}

const projectColors = [
  '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', 
  '#F59E0B', '#EC4899', '#06B6D4', '#84CC16'
]

const projectIcons = [
  '🎮', '🚀', '⚡', '🎯', '💡', '🔧', '📊', '🎨',
  '🏗️', '📱', '🌐', '🔒', '📈', '🎪', '🎭', '🧩'
]

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(projectColors[0])
  const [selectedIcon, setSelectedIcon] = useState(projectIcons[0])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      await onCreateProject({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        icon: selectedIcon
      })
      handleClose()
    } catch (error) {
      console.warn('Failed to create project:', error)
      // Здесь можно добавить toast уведомление об ошибке
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setSelectedColor(projectColors[0])
    setSelectedIcon(projectIcons[0])
    setLoading(false)
    onClose()
  }

  // Обработчик клавиши Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
        onClick={handleClose}
      >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          width: '100%',
          maxWidth: '500px',
          padding: '40px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6'
            e.currentTarget.style.color = '#374151'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#6b7280'
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {/* Logo */}
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#6366f1',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            position: 'relative'
          }}>
            <div style={{
              width: '0',
              height: '0',
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderBottom: '20px solid white',
              transform: 'rotate(90deg)'
            }} />
          </div>
          
          {/* Title */}
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 8px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            Create New Project
          </h2>
          
          {/* Subtitle */}
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            Set up your new project workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Project Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#111827',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                backgroundColor: '#ffffff',
                color: '#111827',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              placeholder="Enter project name"
              required
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1'
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#111827',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                backgroundColor: '#ffffff',
                color: '#111827',
                outline: 'none',
                resize: 'vertical',
                minHeight: '80px',
                transition: 'border-color 0.2s ease'
              }}
              placeholder="Add project description (optional)"
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1'
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Project Color */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#111827',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              Project Color
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '8px'
            }}>
              {projectColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: selectedColor === color ? '2px solid #374151' : '2px solid #e5e7eb',
                    backgroundColor: color,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: selectedColor === color ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedColor !== color) {
                      e.currentTarget.style.borderColor = '#9ca3af'
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedColor !== color) {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Project Icon */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#111827',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              Project Icon
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '8px'
            }}>
              {projectIcons.map((icon, index) => (
                <button
                  key={`${icon}-${index}`}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: selectedIcon === icon ? '2px solid #6366f1' : '2px solid #e5e7eb',
                    backgroundColor: selectedIcon === icon ? '#eef2ff' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: selectedIcon === icon ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: selectedIcon === icon ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedIcon !== icon) {
                      e.currentTarget.style.borderColor = '#9ca3af'
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedIcon !== icon) {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            backgroundColor: '#f9fafb',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              Preview
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: selectedColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                {selectedIcon}
              </div>
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#111827',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  {name || 'Project Name'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  {description || 'Project Description'}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                flex: 1,
                height: '48px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb'
                e.currentTarget.style.borderColor = '#9ca3af'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.borderColor = '#d1d5db'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{
                flex: 1,
                height: '48px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: loading || !name.trim() ? '#9ca3af' : '#6366f1',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading && name.trim()) {
                  e.currentTarget.style.backgroundColor = '#4f46e5'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && name.trim()) {
                  e.currentTarget.style.backgroundColor = '#6366f1'
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>,
    document.body
  )
} 