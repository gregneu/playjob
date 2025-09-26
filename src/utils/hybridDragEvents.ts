// Гибридная система drag & drop событий
// Совмещает React события с нативными DOM событиями для лучшей совместимости

export interface HybridDragData {
  type: 'story' | 'task' | 'bug' | 'test'
  ticketId?: string
  fromZoneObjectId?: string
  isNewTicket?: boolean
}

export interface HybridDragState {
  isDragging: boolean
  dragData: HybridDragData | null
  dragElement: HTMLElement | null
}

// Глобальное состояние для drag & drop
let globalDragState: HybridDragState = {
  isDragging: false,
  dragData: null,
  dragElement: null
}

// Слушатели событий
const eventListeners = new Map<string, Set<Function>>()

/**
 * Добавляет слушатель для гибридного события
 */
export const addHybridEventListener = (eventType: string, listener: Function) => {
  if (!eventListeners.has(eventType)) {
    eventListeners.set(eventType, new Set())
  }
  eventListeners.get(eventType)!.add(listener)
}

/**
 * Удаляет слушатель для гибридного события
 */
export const removeHybridEventListener = (eventType: string, listener: Function) => {
  const listeners = eventListeners.get(eventType)
  if (listeners) {
    listeners.delete(listener)
  }
}

/**
 * Диспатчит гибридное событие
 */
export const dispatchHybridEvent = (eventType: string, detail: any) => {
  const listeners = eventListeners.get(eventType)
  if (listeners) {
    listeners.forEach(listener => {
      try {
        listener({ detail })
      } catch (error) {
        console.error(`Error in hybrid event listener for ${eventType}:`, error)
      }
    })
  }
}

/**
 * Инициализирует гибридную систему drag & drop
 */
export const initHybridDragSystem = () => {
  console.log('🔧 Initializing hybrid drag & drop system')
  
  // Нативные DOM события
  document.addEventListener('dragstart', handleNativeDragStart)
  document.addEventListener('dragover', handleNativeDragOver)
  document.addEventListener('drop', handleNativeDrop)
  document.addEventListener('dragend', handleNativeDragEnd)
  
  console.log('✅ Hybrid drag & drop system initialized')
}

/**
 * Очищает гибридную систему drag & drop
 */
export const cleanupHybridDragSystem = () => {
  console.log('🔧 Cleaning up hybrid drag & drop system')
  
  document.removeEventListener('dragstart', handleNativeDragStart)
  document.removeEventListener('dragover', handleNativeDragOver)
  document.removeEventListener('drop', handleNativeDrop)
  document.removeEventListener('dragend', handleNativeDragEnd)
  
  eventListeners.clear()
  globalDragState = {
    isDragging: false,
    dragData: null,
    dragElement: null
  }
  
  console.log('✅ Hybrid drag & drop system cleaned up')
}

/**
 * Обработчик нативного dragstart
 */
const handleNativeDragStart = (e: DragEvent) => {
  console.log('🎯 Native dragstart:', e.target)
  
  const target = e.target as HTMLElement
  if (!target) return
  
  // Проверяем, что это наш draggable элемент
  const isTicketButton = target.hasAttribute('data-ticket-button')
  const isTicketCard = target.closest('.ticket-card')
  
  if (!isTicketButton && !isTicketCard) return
  
  console.log('🎯 Valid drag target detected')
  
  // Извлекаем данные из dataTransfer
  const ticketType = e.dataTransfer?.getData('text/plain') || 
                    e.dataTransfer?.getData('application/x-ticket-type')
  
  if (!ticketType || !['story', 'task', 'bug', 'test'].includes(ticketType)) {
    console.log('❌ Invalid ticket type:', ticketType)
    return
  }
  
  // Обновляем глобальное состояние
  globalDragState = {
    isDragging: true,
    dragData: {
      type: ticketType as any,
      isNewTicket: isTicketButton
    },
    dragElement: target
  }
  
  console.log('🎯 Global drag state updated:', globalDragState)
  
  // Диспатчим гибридное событие
  dispatchHybridEvent('hybrid-dragstart', globalDragState.dragData)
  
  // Также диспатчим существующее custom событие для совместимости
  try {
    window.dispatchEvent(new CustomEvent('ticket-dragstart', { 
      detail: globalDragState.dragData 
    }))
  } catch (error) {
    console.error('Error dispatching ticket-dragstart:', error)
  }
}

/**
 * Обработчик нативного dragover
 */
const handleNativeDragOver = (e: DragEvent) => {
  if (!globalDragState.isDragging) return
  
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  
  // Диспатчим гибридное событие
  dispatchHybridEvent('hybrid-dragover', {
    clientX: e.clientX,
    clientY: e.clientY,
    dragData: globalDragState.dragData
  })
}

/**
 * Обработчик нативного drop
 */
const handleNativeDrop = (e: DragEvent) => {
  if (!globalDragState.isDragging) return
  
  console.log('🎯 Native drop event')
  e.preventDefault()
  e.stopPropagation()
  
  // Диспатчим гибридное событие
  dispatchHybridEvent('hybrid-drop', {
    clientX: e.clientX,
    clientY: e.clientY,
    dragData: globalDragState.dragData,
    target: e.target
  })
}

/**
 * Обработчик нативного dragend
 */
const handleNativeDragEnd = (e: DragEvent) => {
  console.log('🎯 Native dragend')
  
  // Сбрасываем глобальное состояние
  globalDragState = {
    isDragging: false,
    dragData: null,
    dragElement: null
  }
  
  // Диспатчим гибридное событие
  dispatchHybridEvent('hybrid-dragend', {})
  
  // Также диспатчим существующее custom событие для совместимости
  try {
    window.dispatchEvent(new CustomEvent('ticket-dragend', {}))
  } catch (error) {
    console.error('Error dispatching ticket-dragend:', error)
  }
}

/**
 * Получает текущее состояние drag & drop
 */
export const getDragState = (): HybridDragState => {
  return { ...globalDragState }
}

/**
 * Проверяет, активен ли drag & drop
 */
export const isDragging = (): boolean => {
  return globalDragState.isDragging
}

/**
 * Получает данные текущего drag
 */
export const getDragData = (): HybridDragData | null => {
  return globalDragState.dragData
}
