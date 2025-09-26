import React, { useRef, useState, useEffect } from 'react'
import { setDragImage, type DragGhostData } from '../utils/dragGhost'
import { 
  initHybridDragSystem, 
  cleanupHybridDragSystem, 
  addHybridEventListener, 
  removeHybridEventListener
} from '../utils/hybridDragEvents'

interface BottomTapbarProps {
  onSelect?: (id: 'story' | 'task' | 'bug' | 'test') => void
  activeId?: 'story' | 'task' | 'bug' | 'test'
}

const items: Array<{ id: 'story' | 'task' | 'bug' | 'test'; title: string; iconName: string; color: string }> = [
  { id: 'story', title: 'Story', iconName: 'tabler-icon-bookmark-filled', color: '#4CAF50' },
  { id: 'task', title: 'Task', iconName: 'tabler-icon-list-check', color: '#2196F3' },
  { id: 'bug', title: 'Bug', iconName: 'tabler-icon-bug-filled', color: '#f44336' },
  { id: 'test', title: 'Test', iconName: 'tabler-icon-test-pipe', color: '#FF9800' }
]

const BottomTapbar: React.FC<BottomTapbarProps> = ({ onSelect }) => {
  console.log('🎯 BottomTapbar component rendering')
  const panelRef = useRef<HTMLDivElement>(null)
  const [mouseHover, setMouseHover] = useState(false)
  const [draggingItem, setDraggingItem] = useState<string | null>(null)
  
  // Инициализация гибридной системы drag & drop
  useEffect(() => {
    console.log('🔧 BottomTapbar: Initializing hybrid drag system')
    initHybridDragSystem()
    
    // Слушаем гибридные события
    const handleHybridDragStart = (e: any) => {
      console.log('🎯 BottomTapbar: Hybrid dragstart received:', e.detail)
      if (e.detail?.isNewTicket) {
        setDraggingItem(e.detail.type)
      }
    }
    
    const handleHybridDragEnd = () => {
      console.log('🎯 BottomTapbar: Hybrid dragend received')
      setDraggingItem(null)
    }
    
    addHybridEventListener('hybrid-dragstart', handleHybridDragStart)
    addHybridEventListener('hybrid-dragend', handleHybridDragEnd)
    
    return () => {
      console.log('🔧 BottomTapbar: Cleaning up hybrid drag system')
      removeHybridEventListener('hybrid-dragstart', handleHybridDragStart)
      removeHybridEventListener('hybrid-dragend', handleHybridDragEnd)
      cleanupHybridDragSystem()
    }
  }, [])

  const SCALE_X = 6
  const SCALE_Y = 0.5

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseHover || !panelRef.current) return
    
    const rect = panelRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const rotateX = (y - centerY) / centerY * SCALE_Y
    const rotateY = (centerX - x) / centerX * SCALE_X
    
    if (panelRef.current) {
      panelRef.current.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0px)`
    }
  }

  const handleMouseEnter = () => {
    setMouseHover(true)
  }

  const handleMouseLeave = () => {
    setMouseHover(false)
    if (panelRef.current) {
      panelRef.current.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
    }
  }

  return (
    <div
      data-bottom-tapbar="true"
      className="bottom-tapbar"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '16px',
        transform: 'translateX(-50%)',
        zIndex: 3000, // Выше чем canvas (2000)
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <div 
        ref={panelRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          background: 'rgb(0 0 0 / 64%)', // Точно как у кнопки Build
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '4px 4px', // Точно как у кнопки Build
          display: 'flex',
          gap: '0px', // Как у кнопки Build
          alignItems: 'center',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px', // Точно как у кнопки Build
          border: 'none', // Как у кнопки Build
          transition: 'transform 0.1s ease-out, box-shadow 0.2s ease-out',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          color: 'white', // Как у кнопки Build
          width: 'fit-content', // Hug content - по размеру контента
          minWidth: 'auto' // Убираем минимальную ширину
        }}>
        {items.map((item) => {
          console.log('🔧 BottomTapbar: Rendering button for item:', item.id)
          return (
          <div
            key={item.id}
            data-ticket-button="true"
            data-item-id={item.id}
            className={`drag-handle ${draggingItem === item.id ? 'drag-active' : ''}`}
            onClick={() => {
              console.log('🚀 BottomTapbar: onClick called for item:', item.id)
              console.log('🚀 BottomTapbar: onSelect function exists:', !!onSelect)
              onSelect && onSelect(item.id)
            }}
            draggable={true}
            onMouseDown={() => {
              console.log('🚀 BottomTapbar: onMouseDown called for item:', item.id)
            }}
            onDragStart={(e) => {
              console.log('🚀 React onDragStart fired for:', item.id)
              try {
                const button = e.currentTarget
                button.style.cursor = 'grabbing'
                
                // Очищаем dataTransfer от предыдущих данных
                if (e.dataTransfer) {
                  e.dataTransfer.clearData()
                  e.dataTransfer.effectAllowed = 'copy'
                }
                
                // Устанавливаем данные для нативных событий
                e.dataTransfer?.setData('text/plain', item.id)
                e.dataTransfer?.setData('application/x-ticket-type', item.id)

                // Создаем единый drag ghost
                const ghostData: DragGhostData = {
                  title: item.title,
                  type: item.id,
                  isNewTicket: true
                }
                setDragImage(e, ghostData)

                console.log('✅ React onDragStart completed - native events will handle the rest')

              } catch (error) {
                console.error('Error in React onDragStart:', error)
              }
            }}
            onDragEnd={(e) => {
              console.log('🚀 React onDragEnd fired for:', item.id)
              const button = e.currentTarget
              button.style.cursor = 'pointer'
              
              console.log('✅ React onDragEnd completed - native events will handle the rest')
            }}
            onMouseEnter={(e) => {
              const button = e.currentTarget
              button.style.cursor = 'grab'
              button.style.background = 'rgba(255, 255, 255, 0.1)' // Точно как у кнопки Build
              button.style.borderRadius = '12px' // Такой же как у панели
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget
              button.style.cursor = 'grab'
              button.style.background = 'transparent' // Точно как у кнопки Build
              button.style.borderRadius = '0px' // Возвращаем исходный радиус
            }}
            style={{
              display: 'flex',
              flexDirection: 'column', // Точно как у кнопки Build
              alignItems: 'center',
              gap: '4px', // Точно как у кнопки Build
              padding: '8px 12px', // Точно как у кнопки Build
              borderRadius: '0px', // Точно как у кнопки Build
              background: 'transparent', // Точно как у кнопки Build
              border: 'none', // Точно как у кнопки Build
              color: 'white', // Точно как у кнопки Build
              cursor: draggingItem === item.id ? 'grabbing' : 'pointer', // Точно как у кнопки Build
              fontSize: '14px', // Точно как у кнопки Build
              transition: '0.2s', // Точно как у кнопки Build
              minWidth: '70px', // Точно как у кнопки Build
              justifyContent: 'center', // Точно как у кнопки Build
              pointerEvents: 'auto',
              zIndex: 10000,
              transform: draggingItem === item.id ? 'scale(0.95)' : 'scale(1)',
              opacity: draggingItem === item.id ? 0.5 : 1,
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            <img 
              src={`/icons/${item.iconName}.svg`} 
              alt={item.title}
              style={{ 
                width: '20px', // Точно как у кнопки Build
                height: '20px', 
                filter: 'brightness(0) invert(1)', // Точно как у кнопки Build
                pointerEvents: 'none'
              } as any}
            />
            <span style={{ 
              fontSize: '11px', // Точно как у кнопки Build
              fontWeight: '500', // Точно как у кнопки Build
              pointerEvents: 'none'
            }}>{item.title}</span>
          </div>
          )
        })}
      </div>
    </div>
  )
}

export default BottomTapbar