// Единая система создания drag ghost'ов для всех тикетов

export interface DragGhostData {
  title: string
  type: 'story' | 'task' | 'bug' | 'test'
  priority?: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'
  assigneeName?: string | null
  status?: 'open' | 'in_progress' | 'done'
  isNewTicket?: boolean // true для новых тикетов из BottomTapbar
}

export const createDragGhost = (data: DragGhostData): HTMLDivElement => {
  const preview = document.createElement('div')
  const size = 120
  
  // Основной контейнер
  preview.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background: linear-gradient(135deg, ${getTypeColor(data.type)} 0%, ${getTypeColor(data.type)}CC 100%);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.2);
    position: fixed;
    top: -9999px;
    left: -9999px;
    z-index: 9999;
    pointer-events: none;
    opacity: 0.95;
  `

  // Заголовок
  const title = document.createElement('div')
  title.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 8px;
    line-height: 1.2;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `
  title.textContent = data.title

  // Иконка типа
  const icon = document.createElement('div')
  icon.style.cssText = `
    width: 24px;
    height: 24px;
    margin-bottom: 8px;
    background-image: url('/icons/${getTypeIcon(data.type)}.svg');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: brightness(0) invert(1);
  `

  // Футер с дополнительной информацией
  const footer = document.createElement('div')
  footer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    opacity: 0.9;
  `

  // Приоритет
  const priority = document.createElement('div')
  priority.style.cssText = `
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
  `
  priority.textContent = getPriorityLabel(data.priority || 'medium')

  // Статус (только для существующих тикетов)
  if (!data.isNewTicket && data.status) {
    const status = document.createElement('div')
    status.style.cssText = `
      background: ${getStatusColor(data.status)};
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
    `
    status.textContent = getStatusLabel(data.status)
    footer.appendChild(status)
  }

  // Аватар (только для существующих тикетов с assignee)
  if (!data.isNewTicket && data.assigneeName) {
    const avatar = document.createElement('div')
    avatar.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 600;
    `
    avatar.textContent = data.assigneeName.charAt(0).toUpperCase()
    footer.appendChild(avatar)
  }

  footer.appendChild(priority)

  // Собираем ghost
  preview.appendChild(icon)
  preview.appendChild(title)
  preview.appendChild(footer)

  return preview
}

export const setDragImage = (e: any, data: DragGhostData): void => {
  try {
    // Проверяем, что dataTransfer существует и имеет setDragImage
    if (!e.dataTransfer || typeof e.dataTransfer.setDragImage !== 'function') {
      console.warn('⚠️ dataTransfer.setDragImage not available, skipping ghost creation')
      return
    }
    
    const preview = createDragGhost(data)
    document.body.appendChild(preview)
    
    // Устанавливаем drag image
    e.dataTransfer.setDragImage(preview, 60, 60)
    
    // Удаляем preview после установки
    setTimeout(() => {
      try {
        if (document.body.contains(preview)) {
          document.body.removeChild(preview)
        }
      } catch {}
    }, 0)
  } catch (error) {
    console.error('❌ Error creating drag ghost:', error)
  }
}

// Вспомогательные функции
const getTypeColor = (type: string): string => {
  switch (type) {
    case 'story': return '#4CAF50'
    case 'task': return '#2196F3'
    case 'bug': return '#f44336'
    case 'test': return '#FF9800'
    default: return '#9E9E9E'
  }
}

const getTypeIcon = (type: string): string => {
  switch (type) {
    case 'story': return 'tabler-icon-bookmark-filled'
    case 'task': return 'tabler-icon-list-check'
    case 'bug': return 'tabler-icon-bug-filled'
    case 'test': return 'tabler-icon-test-pipe'
    default: return 'tabler-icon-help'
  }
}

const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'veryhigh': return 'VH'
    case 'high': return 'H'
    case 'medium': return 'M'
    case 'low': return 'L'
    case 'v-low': return 'VL'
    default: return 'M'
  }
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'open': return 'rgba(76, 175, 80, 0.8)'
    case 'in_progress': return 'rgba(255, 152, 0, 0.8)'
    case 'done': return 'rgba(33, 150, 243, 0.8)'
    default: return 'rgba(158, 158, 158, 0.8)'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'open': return 'Open'
    case 'in_progress': return 'Progress'
    case 'done': return 'Done'
    default: return 'Open'
  }
}
