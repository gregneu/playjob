import React, { useState, useEffect, useRef } from 'react'

interface RadialMenuProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (objectType: string) => void
  position: [number, number] | null
  worldPosition?: [number, number, number] | null
  mousePosition?: [number, number] | null
}

interface RadialOption {
  id: string
  label: string
  icon: string // имя файла иконки из папки icons
  color: string
}

const RadialMenu: React.FC<RadialMenuProps> = ({
  isOpen,
  onClose,
  onSelect,
  position,
  worldPosition,
  mousePosition
}) => {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  // 6 типов объектов: hub, sprint, qa, refinement, meet, development
  const options: RadialOption[] = [
    { id: 'hub',         label: 'Hub',         icon: 'bookmark-filled', color: '#8888FF' },
    { id: 'sprint',      label: 'Sprint',      icon: 'list-check', color: '#88C0A9' },
    { id: 'qa',          label: 'QA',          icon: 'bug-filled', color: '#FF9F43' },
    { id: 'refinement',  label: 'Refinement',  icon: 'test-pipe', color: '#7ED957' },
    { id: 'meet',        label: 'Meet',        icon: 'square-plus', color: '#FF6B6B' },
    { id: 'development', label: 'Development', icon: 'circles-relation', color: '#F6C945' }
  ]

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && event.target instanceof Element) {
        const target = event.target as Element
        if (!target.closest('.radial-menu')) {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Обработка выбора опции
  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId)
    onSelect(optionId)
  }

  if (!isOpen || !mousePosition) return null

  const [mouseX, mouseY] = mousePosition

  return (
    <div
      className="radial-menu"
      style={{
        position: 'fixed',
        top: mouseY + 20, // Смещаем вниз от курсора
        left: mouseX + 20, // Смещаем вправо от курсора
        transform: 'none', // Убираем центрирование
        zIndex: 3500, // Выше canvas (2000) и badges (2050), но ниже UI элементов (3000)
        pointerEvents: 'auto'
      }}
    >
      {/* Контейнер меню в стиле модалки */}
      <div style={{
        background: 'rgb(0 0 0 / 64%)',
        border: 'none',
        borderRadius: '12px',
        padding: '2px 2px',
        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px',
        backdropFilter: 'blur(10px)',
        minWidth: '160px',
        maxWidth: '180px'
      }}>
        {/* Заголовок с кнопкой закрытия */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '2px'
        }}>
          <span style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Create new
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: '0.2s'
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
              style={{ width: '14px', height: '14px', filter: 'brightness(0) invert(1)' }}
            />
          </button>
        </div>

        {/* Список опций */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0px'
        }}>
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              onMouseEnter={(e) => {
                setHoveredOption(option.id)
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                setHoveredOption(null)
                e.currentTarget.style.background = 'transparent'
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                transition: '0.2s',
                borderRadius: '0px',
                width: '100%',
                textAlign: 'left'
              }}
            >
              {/* Иконка */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px'
              }}>
                <img 
                  src={`/icons/tabler-icon-${option.icon}.svg`}
                  alt={option.label}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    filter: 'brightness(0) invert(1)',
                    transition: 'filter 0.3s'
                  }}
                />
              </div>
              
              {/* Текст */}
              <span style={{
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RadialMenu 