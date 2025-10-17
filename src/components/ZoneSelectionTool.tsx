import React, { useEffect, useRef } from 'react'

// Определяем типы локально
interface ZoneMarking {
  id: string
  name: string
  color: string
  cells: Array<[number, number]> // hex coordinates
  createdAt: Date
}

interface ZoneSelectionToolProps {
  isZoneMode: boolean
  onZoneModeToggle: () => void
  onZoneCreate: (zone: ZoneMarking) => void
  zones: ZoneMarking[]
  selectedCells: Set<string>
  onCellSelect: (q: number, r: number) => void
  onSelectionClear: () => void
  // Новые пропсы для формы создания зоны
  showZoneForm: boolean
  pendingZoneCells: Array<[number, number]>
  onCreateZoneFromForm: (name: string, color: string) => void
  onCancelZoneCreation: () => void
  // Новые пропсы для режима флажков
  isFlagMode: boolean
  flagCells: Set<string>
  currentZonePath: Array<[number, number]>
  // Новые пропсы для верхней панели
  showTopPanel: boolean
  zoneName: string
  selectedZoneColor: string
  onZoneNameChange: (name: string) => void
  onZoneColorChange: (color: string) => void
  onCreateZoneFromTopPanel: () => void
  onClearZoneSelection: () => void
  isExtendingZone?: boolean
  zoneSelectionMode?: 'idle' | 'selecting' | 'building' | 'extending'
  onExtendingClick?: () => void
  lastExtendingClick?: number
  // Новые пропсы для редактирования зон
  isZoneEditMode?: boolean
  editingZoneName?: string
  editingZoneColor?: string
  onSaveZoneEdit?: () => void
  onCancelZoneEdit?: () => void
  onZoneNameEditChange?: (name: string) => void
  onZoneColorEditChange?: (color: string) => void
  onDeleteZone?: () => void
}

// Простые цвета для зон
const ZONE_COLORS = [
  '#FF6B6B', // Красный
  '#4ECDC4', // Бирюзовый
  '#45B7D1', // Голубой
  '#96CEB4', // Зеленый
  '#FFEAA7', // Желтый
  '#DDA0DD', // Фиолетовый
  '#98D8C8', // Мятный
  '#F7DC6F', // Золотой
  '#BB8FCE', // Лавандовый
  '#85C1E9', // Светло-голубой
  '#F8C471', // Оранжевый
  '#82E0AA', // Светло-зеленый
]

export const ZoneSelectionTool = ({
  isZoneMode,
  onZoneModeToggle,
  onZoneCreate,
  zones,
  selectedCells,
  onCellSelect,
  onSelectionClear,
  showZoneForm,
  pendingZoneCells,
  onCreateZoneFromForm,
  onCancelZoneCreation,
  isFlagMode,
  flagCells,
  currentZonePath,
  showTopPanel,
  zoneName,
  selectedZoneColor,
  onZoneNameChange,
  onZoneColorChange,
  onCreateZoneFromTopPanel,
  onClearZoneSelection,
  isExtendingZone = false,
  zoneSelectionMode = 'idle',
  onExtendingClick,
  lastExtendingClick = 0,
  // Новые пропсы для редактирования зон
  isZoneEditMode = false,
  editingZoneName = '',
  editingZoneColor = '',
  onSaveZoneEdit,
  onCancelZoneEdit,
  onZoneNameEditChange,
  onZoneColorEditChange,
  onDeleteZone
}: ZoneSelectionToolProps) => {
  console.log('🔨 ZoneSelectionTool rendered with props:', {
    isZoneMode,
    hasOnZoneModeToggle: !!onZoneModeToggle,
    showTopPanel,
    zoneSelectionMode,
    isZoneEditMode
  })
  
  // Отслеживание изменений isZoneMode
  useEffect(() => {
    console.log('🔨 ZoneSelectionTool: isZoneMode prop changed to:', isZoneMode)
  }, [isZoneMode])
  
  // Отладочная информация для режима редактирования
  console.log('ZoneSelectionTool props:', {
    isZoneEditMode,
    showTopPanel,
    editingZoneName,
    editingZoneColor,
    hasOnSaveZoneEdit: !!onSaveZoneEdit,
    hasOnCancelZoneEdit: !!onCancelZoneEdit
  })
  // Ref для поля ввода названия зоны
  const zoneNameInputRef = useRef<HTMLInputElement>(null)
  

  
  // Состояния для color picker
  const [showColorPicker, setShowColorPicker] = React.useState(false)
  const [hue, setHue] = React.useState(0)
  const [saturation, setSaturation] = React.useState(100)
  const [lightness, setLightness] = React.useState(50)
  const [alpha, setAlpha] = React.useState(1)
  
  // Автофокус на поле ввода при появлении панели и при каждом клике в режиме extending
  useEffect(() => {
    if (showTopPanel) {
      // Увеличиваем задержку и добавляем дополнительную проверку
      const timer = setTimeout(() => {
        if (zoneNameInputRef.current) {
          zoneNameInputRef.current.focus()
          console.log('Auto-focus applied to zone name input')
        } else {
          console.log('Zone name input ref not found')
        }
      }, 200)
      
      return () => clearTimeout(timer)
    }
  }, [showTopPanel, zoneSelectionMode])
  
  // Дополнительный фокус при изменении zoneName (когда панель уже открыта)
  useEffect(() => {
    if (showTopPanel && zoneNameInputRef.current) {
      zoneNameInputRef.current.focus()
      console.log('Additional focus check on zoneName change')
    }
  }, [zoneName, showTopPanel])
  
  // Специальный фокус при переходе в режим extending
  useEffect(() => {
    if (zoneSelectionMode === 'extending' && showTopPanel && zoneNameInputRef.current) {
      const timer = setTimeout(() => {
        zoneNameInputRef.current?.focus()
        console.log('Focus on extending mode')
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [zoneSelectionMode, showTopPanel])
  
  // Фокус при каждом клике в режиме extending
  useEffect(() => {
    if (zoneSelectionMode === 'extending' && showTopPanel && lastExtendingClick > 0 && zoneNameInputRef.current) {
      const timer = setTimeout(() => {
        zoneNameInputRef.current?.focus()
        console.log('Focus on extending click at:', lastExtendingClick)
      }, 50)
      
      return () => clearTimeout(timer)
    }
  }, [lastExtendingClick, zoneSelectionMode, showTopPanel])

  // Функция для конвертации HSL в HEX
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  // Функция для конвертации HEX в HSL
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  // Обработчик изменения цвета
  const handleColorChange = (newHue: number, newSaturation: number, newLightness: number) => {
    setHue(newHue)
    setSaturation(newSaturation)
    setLightness(newLightness)
    const newColor = hslToHex(newHue, newSaturation, newLightness)
    
    if (isZoneEditMode && onZoneColorEditChange) {
      onZoneColorEditChange(newColor)
    } else {
      onZoneColorChange(newColor)
    }
  }

  // Обработчик клика по кружку с цветом
  const handleColorCircleClick = () => {
    setShowColorPicker(!showColorPicker)
    // Инициализируем HSL из текущего цвета
    const hsl = hexToHsl(selectedZoneColor)
    setHue(hsl.h)
    setSaturation(hsl.s)
    setLightness(hsl.l)
  }

  const handleCreateZone = () => {
    if (zoneName.trim() && selectedCells.size > 0) {
      const cells: Array<[number, number]> = Array.from(selectedCells).map(cell => {
        const [q, r] = cell.split(',').map(Number)
        return [q, r]
      })

      const newZone: ZoneMarking = {
        id: `zone-${Date.now()}`,
        name: zoneName.trim(),
        color: selectedZoneColor,
        cells,
        createdAt: new Date()
      }

      onZoneCreate(newZone)
      onZoneNameChange('')
      onZoneColorChange('#FF6B6B')
      onSelectionClear()
    }
  }

  const handleZoneModeToggle = () => {
    console.log('🔨 ZoneSelectionTool: handleZoneModeToggle called')
    console.log('🔨 ZoneSelectionTool: current isZoneMode prop:', isZoneMode)
    onZoneModeToggle()
    if (!isZoneMode) {
      onSelectionClear()
    }
  }

  return (
    <>
      {/* Узкий toolbar слева внизу */}
      <div 
        className="build-button-container"
        style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        background: 'rgb(0 0 0 / 64%)',
        color: 'white',
        padding: '4px 4px',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        border: 'none',
        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px',
        zIndex: 3000, // Выше чем canvas (2000)
        // Принудительно устанавливаем z-index через style
        '--z-index': '3000',
        display: 'flex',
        flexDirection: 'column',
        gap: '0px',
        width: 'fit-content',
        minWidth: 'auto'
      }}>
        {/* Кнопка создания зон */}
        <button
          onClick={() => {
            console.log('🔨 Build button clicked!')
            handleZoneModeToggle()
          }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 12px',
              borderRadius: '0px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              transition: '0.2s',
              minWidth: '70px',
              justifyContent: 'center'
            }}
          title={isZoneMode ? 'Disable zone creation' : 'Create zones'}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.borderRadius = '12px'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderRadius = '0px'
          }}
        >
          {/* Иконка строительства */}
          <img 
            src="/icons/tabler-icon-build.svg"
            alt="Build zones"
            style={{ width: '20px', height: '20px', filter: 'brightness(0) invert(1)' }}
          />
          <span style={{ fontSize: '11px', fontWeight: '500' }}>Build</span>
        </button>

        {/* Индикатор активного режима */}
        {isZoneMode && (
          <div style={{
            width: '100%',
            height: '2px',
            background: '#4ECDC4',
            borderRadius: '0px',
            marginTop: '0px'
          }} />
        )}
      </div>

      {/* Верхняя панель создания зоны */}
      {showTopPanel && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.95)',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255,255,255,0.3)',
          minWidth: '400px',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Кружок с цветом */}
          <div 
            onClick={handleColorCircleClick}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isZoneEditMode ? editingZoneColor : selectedZoneColor,
              border: '2px solid rgba(255,255,255,0.5)',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            {/* Выпадающая палитра цветов */}
            {showColorPicker && (
              <div style={{
                position: 'absolute',
                top: '40px',
                left: '0',
                background: 'rgba(0,0,0,0.95)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '16px',
                minWidth: '280px',
                zIndex: 3000,
                backdropFilter: 'blur(10px)'
              }}>
                {/* Большой квадрат выбора цвета */}
                <div style={{
                  width: '200px',
                  height: '200px',
                  background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`,
                  borderRadius: '4px',
                  position: 'relative',
                  marginBottom: '12px',
                  cursor: 'crosshair'
                }}
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  const y = e.clientY - rect.top
                  const newSaturation = Math.round((x / rect.width) * 100)
                  const newLightness = Math.round(((rect.height - y) / rect.height) * 100)
                  handleColorChange(hue, newSaturation, newLightness)
                }}
                >
                  {/* Маркер выбранного цвета */}
                  <div style={{
                    position: 'absolute',
                    left: `${saturation}%`,
                    top: `${100 - lightness}%`,
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    border: '2px solid white',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none'
                  }} />
                </div>

                {/* Слайдер оттенка */}
                <div style={{
                  width: '200px',
                  height: '20px',
                  background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  borderRadius: '10px',
                  position: 'relative',
                  marginBottom: '12px',
                  cursor: 'pointer'
                }}
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  const newHue = Math.round((x / rect.width) * 360)
                  handleColorChange(newHue, saturation, lightness)
                }}
                >
                  {/* Маркер оттенка */}
                  <div style={{
                    position: 'absolute',
                    left: `${(hue / 360) * 100}%`,
                    top: '50%',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: '2px solid white',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none'
                  }} />
                </div>

                {/* Слайдер прозрачности */}
                <div style={{
                  width: '200px',
                  height: '20px',
                  background: `linear-gradient(to right, transparent, hsl(${hue}, ${saturation}%, ${lightness}%))`,
                  borderRadius: '10px',
                  position: 'relative',
                  marginBottom: '12px',
                  cursor: 'pointer'
                }}
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  const newAlpha = Math.round((x / rect.width) * 100) / 100
                  setAlpha(newAlpha)
                }}
                >
                  {/* Маркер прозрачности */}
                  <div style={{
                    position: 'absolute',
                    left: `${alpha * 100}%`,
                    top: '50%',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: '2px solid white',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none'
                  }} />
                </div>

                {/* Поле ввода HEX */}
                <input
                  type="text"
                  value={selectedZoneColor.toUpperCase()}
                  onChange={(e) => {
                    const hex = e.target.value
                    if (/^#[0-9A-F]{6}$/i.test(hex)) {
                      const hsl = hexToHsl(hex)
                      setHue(hsl.h)
                      setSaturation(hsl.s)
                      setLightness(hsl.l)
                      onZoneColorChange(hex)
                    }
                  }}
                  style={{
                    width: '80px',
                    padding: '4px 8px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Поле для ввода названия */}
          <input
            ref={zoneNameInputRef}
            type="text"
            placeholder="Area name"
            value={isZoneEditMode ? editingZoneName : zoneName}
            onChange={(e) => {
              if (isZoneEditMode && onZoneNameEditChange) {
                onZoneNameEditChange(e.target.value)
              } else {
                onZoneNameChange(e.target.value)
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                if (isZoneEditMode && onSaveZoneEdit) {
                  onSaveZoneEdit()
                } else {
                  onCreateZoneFromTopPanel()
                }
              }
            }}
            onClick={() => {
              // Дополнительный фокус при клике
              if (zoneNameInputRef.current) {
                zoneNameInputRef.current.focus()
                console.log('Focus on click')
              }
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              cursor: 'text'
            }}
            autoFocus
          />
          
          {/* Кнопка создания/сохранения */}
          <button
            onClick={isZoneEditMode && onSaveZoneEdit ? onSaveZoneEdit : onCreateZoneFromTopPanel}
            disabled={isZoneEditMode ? !editingZoneName?.trim() : !zoneName.trim()}
            style={{
              padding: '8px 16px',
              background: (isZoneEditMode ? editingZoneName?.trim() : zoneName.trim()) ? '#4ECDC4' : '#666',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isZoneEditMode ? editingZoneName?.trim() : zoneName.trim()) ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {isZoneEditMode ? 'Save' : (isExtendingZone ? 'Add to zone' : 'Create')}
          </button>
          
          {/* Кнопка отмены для режима редактирования */}
          {isZoneEditMode && onCancelZoneEdit && (
            <button
              onClick={onCancelZoneEdit}
              style={{
                padding: '8px 16px',
                background: '#FF6B6B',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginLeft: '8px'
              }}
            >
              Cancel
            </button>
          )}
          
          {/* Кнопка удаления для режима редактирования */}
          {isZoneEditMode && onDeleteZone && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this zone?')) {
                  onDeleteZone()
                }
              }}
              style={{
                padding: '8px 12px',
                background: '#DC3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginLeft: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Delete zone"
            >
              {/* Иконка корзины */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          )}
          
          {/* Подсказки */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            fontSize: '10px',
            opacity: 0.7,
            color: 'white',
            textAlign: 'center',
            whiteSpace: 'nowrap'
          }}>
            <div>❌ Escape or right-click to cancel</div>
          </div>
        </div>
      )}
    </>
  )
} 