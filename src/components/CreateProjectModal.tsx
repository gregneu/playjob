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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 modal-backdrop"
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-lg w-full max-w-[800px] mx-auto transform transition-all duration-300 ease-out modal-content overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 10000,
          padding: '32px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          height: '750px'
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Create New Project</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
          <div className="flex-1 space-y-4">
            <div className="space-y-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add project description (optional)"
              />
            </div>

            <div className="space-y-5">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Project Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {projectColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                      selectedColor === color ? 'border-gray-400 scale-110 shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Project Icon
              </label>
              <div className="grid grid-cols-8 gap-2">
                {projectIcons.map((icon, index) => (
                  <button
                    key={`${icon}-${index}`}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 ${
                      selectedIcon === icon ? 'border-blue-500 bg-blue-50 scale-110 shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Preview</div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-semibold"
                  style={{ backgroundColor: selectedColor }}
                >
                  {selectedIcon}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {name || 'Project Name'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {description || 'Project Description'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-900 h-12 px-6 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-12 px-6 py-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
} 