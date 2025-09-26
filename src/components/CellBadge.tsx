import React from 'react'
import { Html } from '@react-three/drei'

interface CellBadgeProps {
  position: [number, number, number]
  title: string
  progress: number
  priority: number
  category: string
  zoneColor?: string // Добавляем цвет зоны
  onClick?: () => void // Добавляем обработчик клика
  isHidden?: boolean // Добавляем пропс для скрытия бейджа
  showTitleOnly?: boolean // Показывать только название (без прогресса)
}

export const CellBadge: React.FC<CellBadgeProps> = ({
  position,
  title,
  progress,
  priority,
  category,
  zoneColor,
  onClick,
  isHidden = false,
  showTitleOnly = false
}) => {
  // Специальный стиль для зон
  const isZone = category === 'zone'
  
  // Функция для обрезки длинных названий зон
  const truncateZoneTitle = (title: string, maxLength: number = 15) => {
    if (title.length <= maxLength) {
      return title
    }
    return title.substring(0, maxLength) + '...'
  }

  // Обработчик клика с отладочной информацией
  const handleClick = (event: React.MouseEvent) => {
    console.log('CellBadge clicked:', { title, category, isZone, onClick: !!onClick })
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    
    if (onClick) {
      console.log('Calling onClick function')
      onClick()
    } else {
      console.log('No onClick function provided')
    }
  }

  // Дополнительные обработчики для надежности
  const handleMouseDown = (event: React.MouseEvent) => {
    console.log('CellBadge mouse down:', { title, category })
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  const handleMouseUp = (event: React.MouseEvent) => {
    console.log('CellBadge mouse up:', { title, category })
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }
  
  // Если бейдж скрыт, не рендерим его
  if (isHidden) {
    return null
  }

  return (
    <Html
      position={position}
      billboard
      occlude={false}
      className="cell-badge"
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
        // Делаем бейдж плоским 2D UI
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        cursor: 'pointer'
      }}
    >
      <span 
        className={`badge badge-${category} ${isZone ? 'zone-badge' : ''}`} 
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => {
          if (isZone) {
            console.log('Zone badge hover')
          }
        }}
        style={{
          // Новый стиль для зон - белый фон, черный текст
          background: isZone ? 'rgba(255,255,255,0.98)' : 'rgba(0,0,0,0.8)',
          color: isZone ? '#000000' : 'white',
          padding: isZone ? '6px 12px' : '4px 8px',
          borderRadius: '6px',
          fontSize: isZone ? '12px' : '10px',
          fontWeight: isZone ? '600' : '400',
          backdropFilter: 'blur(10px)',
          border: isZone ? '2px solid rgba(0,0,0,0.3)' : '1px solid rgba(255,255,255,0.2)',
          minWidth: isZone ? '80px' : '60px',
          width: isZone ? 'fit-content' : 'auto',
          boxShadow: isZone ? '0 4px 16px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          // Добавляем hover эффект для зон
          transition: 'all 0.2s ease',
          userSelect: 'none',
          // Делаем более заметным для клика
          outline: 'none'
        }}
      >
        <span className="badge-header" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {isZone ? (
            // Стиль для зон - цветной кружок + название
            <>
              <span className="zone-color-bubble" style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: zoneColor || '#FF6B6B',
                flexShrink: 0,
                border: '1px solid rgba(0,0,0,0.2)'
              }} />
              <span className="zone-title" style={{
                flex: 1,
                fontWeight: '600',
                color: '#000000',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '10px',
                textAlign: 'left'
              }}>
                {truncateZoneTitle(title)}
              </span>
            </>
          ) : showTitleOnly ? (
            // Только название для объектов (без прогресса)
            <span className="object-title" style={{
              flex: 1,
              fontWeight: 600,
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '10px',
              textAlign: 'left'
            }}>
              {title}
            </span>
          ) : (
            // Стиль для задач - только прогресс-бар
            <span style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Пустой контейнер для прогресс-бара */}
            </span>
          )}
        </span>
        {/* Минималистичный прогресс-бар только для задач, не для зон, и не при showTitleOnly */}
        {!isZone && !showTitleOnly && (
          <span className="progress-bar" style={{
            height: '3px',
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '2px',
            overflow: 'hidden',
            width: '100%'
          }}>
            <span 
              className="progress-fill" 
              style={{ 
                width: `${progress}%`,
                height: '100%',
                background: progress === 100 ? '#4CAF50' : progress > 50 ? '#8BC34A' : '#FFC107',
                transition: 'width 0.3s ease'
              }}
            />
          </span>
        )}
      </span>
    </Html>
  )
} 