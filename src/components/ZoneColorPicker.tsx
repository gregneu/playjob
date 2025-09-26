import React, { useState, useEffect } from 'react'

interface ZoneColorPickerProps {
  isOpen: boolean
  onClose: () => void
  currentColor: string
  onColorChange: (color: string) => void
  position: { x: number; y: number }
}

// 32 предустановленных цвета
const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
  '#A9DFBF', '#F9E79F', '#D5DBDB', '#AED6F1', '#A3E4D7',
  '#FADBD8', '#D6EAF8', '#D1F2EB', '#FCF3CF', '#E8DAEF',
  '#D5DBDB', '#AEB6BF', '#85929E', '#5D6D7E', '#34495E',
  '#2C3E50', '#1B2631'
]

export const ZoneColorPicker: React.FC<ZoneColorPickerProps> = ({
  isOpen,
  onClose,
  currentColor,
  onColorChange,
  position
}) => {
  const [selectedColor, setSelectedColor] = useState(currentColor)
  const [isVisible, setIsVisible] = useState(false)

  // Обновляем выбранный цвет при изменении currentColor
  useEffect(() => {
    setSelectedColor(currentColor)
  }, [currentColor])

  // Анимация появления/исчезновения
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  // Обработчик выбора цвета
  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    onColorChange(color) // Мгновенно применяем цвет к зоне
  }

  // Обработчик закрытия с анимацией
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300) // Ждем завершения анимации
  }

  if (!isOpen) return null

  return (
    <>
      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: position.y,
        left: position.x - 336, // Открывается слева от позиции гексагона с отступом 16px от sidebar
        width: '300px',
        minHeight: '400px',
        background: 'rgb(0 0 0 / 64%)',
        border: 'none',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        color: 'white',
        overflowY: 'auto',
        pointerEvents: 'auto',
        transform: isVisible ? 'translateX(0)' : 'translateX(10%)',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      } as any}>
        
        {/* Panel header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Pick your favourite color</h3>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClose()
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>


        {/* Color palette */}
        <div style={{
          padding: '16px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px'
          }}>
            {PRESET_COLORS.map((color, index) => (
              <div
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  handleColorSelect(color)
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  background: color,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: selectedColor === color ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: selectedColor === color 
                    ? '0 4px 12px rgba(0,0,0,0.4)' 
                    : '0 2px 6px rgba(0,0,0,0.2)'
                } as any}
                onMouseEnter={(e) => {
                  if (selectedColor !== color) {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedColor !== color) {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'
                  }
                }}
                title={color}
              >
                {/* Checkmark for selected color */}
                {selectedColor === color && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}>
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info text */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            color: 'rgba(255,255,255,0.7)' 
          }}>
            Click any color to apply it to the zone instantly
          </p>
          <p style={{ 
            margin: '4px 0 0 0', 
            fontSize: '11px', 
            color: 'rgba(255,255,255,0.5)' 
          }}>
            Click ✕ to close
          </p>
        </div>
      </div>
    </>
  )
}