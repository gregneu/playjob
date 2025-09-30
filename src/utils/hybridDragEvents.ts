// Гибридная система drag & drop событий
// Совмещает React события с нативными DOM событиями для лучшей совместимости

export interface HybridDragData {
  type: 'story' | 'task' | 'bug' | 'test'
  ticketId: string | null
  fromZoneObjectId: string | null
  isNewTicket?: boolean
  isExistingTicket?: boolean
  isSprintGhostRemoval?: boolean
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
  const isRocketGhost = target.closest('.rocket-ticket-ghost')

  if (!isTicketButton && !isTicketCard && !isRocketGhost) return
  
  console.log('🎯 Valid drag target detected')
  
  // Извлекаем данные из dataTransfer
  const dataTransfer = e.dataTransfer
  if (!dataTransfer) return

  let dragData: HybridDragData | null = null

  // Попытка получить данные удаления из ракеты
  const removePayload = dataTransfer.getData('application/x-remove-from-sprint')
  if (removePayload) {
    try {
      const parsed = JSON.parse(removePayload)
      const ticketId = parsed?.ticketId
      if (ticketId && typeof ticketId === 'string') {
        dragData = {
          type: 'task',
          ticketId,
          fromZoneObjectId: null,
          isNewTicket: false,
          isExistingTicket: false,
          isSprintGhostRemoval: true
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse remove-from-sprint payload:', error)
    }
  }

  // Попытка получить данные существующего тикета
  const existingTicketPayload = dataTransfer.getData('application/x-existing-ticket')
  if (!dragData && existingTicketPayload) {
    try {
      const parsed = JSON.parse(existingTicketPayload)
      const { ticketId, fromZoneObjectId, type: existingType } = parsed || {}

      if (!ticketId || typeof ticketId !== 'string') {
        console.warn('❌ Invalid existing ticket payload (ticketId missing):', parsed)
      } else if (!existingType || !['story', 'task', 'bug', 'test'].includes(existingType)) {
        console.warn('❌ Invalid existing ticket type:', existingType)
      } else {
        const normalizedFromZoneObjectId =
          typeof fromZoneObjectId === 'string'
            ? fromZoneObjectId
            : typeof fromZoneObjectId === 'number'
              ? String(fromZoneObjectId)
              : null

        dragData = {
          type: existingType,
          ticketId,
          fromZoneObjectId: normalizedFromZoneObjectId,
          isExistingTicket: true,
          isNewTicket: false
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse existing ticket payload:', error)
    }
  }

  // Если данные существующего тикета не найдены, обрабатываем как новый тикет
  if (!dragData) {
    const ticketType = dataTransfer.getData('text/plain') ||
                      dataTransfer.getData('application/x-ticket-type')

    if (!ticketType || !['story', 'task', 'bug', 'test'].includes(ticketType)) {
      console.log('❌ Invalid ticket type:', ticketType)
      return
    }

    dragData = {
      type: ticketType as any,
      ticketId: null,
      fromZoneObjectId: null,
      isNewTicket: isTicketButton,
      isExistingTicket: false
    }
  }

  // Обновляем глобальное состояние
  globalDragState = {
    isDragging: true,
    dragData,
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
  if (e.dataTransfer) {
    const { dragData } = globalDragState
    if (dragData?.isSprintGhostRemoval) {
      e.dataTransfer.dropEffect = 'move'
    } else if (dragData?.isExistingTicket) {
      e.dataTransfer.dropEffect = 'move'
    } else {
      e.dataTransfer.dropEffect = 'copy'
    }
  }
  
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
