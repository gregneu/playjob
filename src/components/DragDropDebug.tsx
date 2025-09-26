import React, { useState, useEffect } from 'react'

interface DebugEvent {
  id: string
  timestamp: number
  type: 'dragstart' | 'dragover' | 'drop' | 'dragend' | 'building-found' | 'raycasting' | 'raycasting-result' | 'invalid-ticket' | 'valid-ticket' | 'canvas-not-found' | 'canvas-found' | 'r3f-not-found' | 'r3f-found' | 'camera-scene-not-found' | 'camera-scene-found'
  data: any
  target?: string
}

export const DragDropDebug: React.FC = () => {
  const [events, setEvents] = useState<DebugEvent[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const addEvent = (type: DebugEvent['type'], data: any, target?: string) => {
      const event: DebugEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        type,
        data,
        target
      }
      
      setEvents(prev => [event, ...prev.slice(0, 19)]) // Keep last 20 events
    }

    // Global drag&drop event listeners
    const handleDragStart = (e: DragEvent) => {
      const ticketType = e.dataTransfer?.getData('text/plain')
      if (ticketType && ['story', 'task', 'bug', 'test'].includes(ticketType)) {
        addEvent('dragstart', {
          ticketType,
          target: (e.target as HTMLElement)?.tagName || 'unknown'
        }, (e.target as HTMLElement)?.className || 'unknown')
      }
    }

    const handleDragOver = (e: DragEvent) => {
      const ticketType = e.dataTransfer?.getData('text/plain')
      if (ticketType && ['story', 'task', 'bug', 'test'].includes(ticketType)) {
        addEvent('dragover', {
          ticketType,
          clientX: e.clientX,
          clientY: e.clientY,
          target: (e.target as HTMLElement)?.tagName || 'unknown'
        }, (e.target as HTMLElement)?.className || 'unknown')
      }
    }

    const handleDrop = (e: DragEvent) => {
      const ticketType = e.dataTransfer?.getData('text/plain')
      if (ticketType && ['story', 'task', 'bug', 'test'].includes(ticketType)) {
        addEvent('drop', {
          ticketType,
          clientX: e.clientX,
          clientY: e.clientY,
          target: (e.target as HTMLElement)?.tagName || 'unknown'
        }, (e.target as HTMLElement)?.className || 'unknown')
      }
    }

    const handleDragEnd = (e: DragEvent) => {
      const ticketType = e.dataTransfer?.getData('text/plain')
      if (ticketType && ['story', 'task', 'bug', 'test'].includes(ticketType)) {
        addEvent('dragend', {
          ticketType,
          target: (e.target as HTMLElement)?.tagName || 'unknown'
        }, (e.target as HTMLElement)?.className || 'unknown')
      }
    }

    // Custom event handlers
    const handleCustomEvent = (e: CustomEvent) => {
      const eventType = e.detail?.type
      if (['building-found', 'raycasting', 'raycasting-result', 'invalid-ticket', 'valid-ticket', 'canvas-not-found', 'canvas-found', 'r3f-not-found', 'r3f-found', 'camera-scene-not-found', 'camera-scene-found'].includes(eventType)) {
        addEvent(eventType, e.detail, 'custom')
      }
    }

    // Add event listeners
    document.addEventListener('dragstart', handleDragStart, true)
    document.addEventListener('dragover', handleDragOver, true)
    document.addEventListener('drop', handleDrop, true)
    document.addEventListener('dragend', handleDragEnd, true)
    const customEventTypes = [
      'debug-building-found', 'debug-raycasting', 'debug-raycasting-result',
      'debug-invalid-ticket', 'debug-valid-ticket', 'debug-canvas-not-found', 'debug-canvas-found',
      'debug-r3f-not-found', 'debug-r3f-found', 'debug-camera-scene-not-found', 'debug-camera-scene-found'
    ]
    
    customEventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleCustomEvent as EventListener)
    })

    return () => {
      document.removeEventListener('dragstart', handleDragStart, true)
      document.removeEventListener('dragover', handleDragOver, true)
      document.removeEventListener('drop', handleDrop, true)
      document.removeEventListener('dragend', handleDragEnd, true)
      customEventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleCustomEvent as EventListener)
      })
    }
  }, [])

  const getEventColor = (type: DebugEvent['type']) => {
    switch (type) {
      case 'dragstart': return '#4CAF50' // Green
      case 'dragover': return '#2196F3' // Blue
      case 'drop': return '#FF9800' // Orange
      case 'dragend': return '#9C27B0' // Purple
      case 'building-found': return '#00BCD4' // Cyan
      case 'raycasting': return '#E91E63' // Pink
      case 'raycasting-result': return '#FF5722' // Deep Orange
      case 'invalid-ticket': return '#F44336' // Red
      case 'valid-ticket': return '#4CAF50' // Green
      case 'canvas-not-found': return '#F44336' // Red
      case 'canvas-found': return '#4CAF50' // Green
      case 'r3f-not-found': return '#F44336' // Red
      case 'r3f-found': return '#4CAF50' // Green
      case 'camera-scene-not-found': return '#F44336' // Red
      case 'camera-scene-found': return '#4CAF50' // Green
      default: return '#666'
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 9999,
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        🐛 Debug ({events.length})
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        width: '400px',
        maxHeight: '500px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 9999,
        overflow: 'auto',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>🐛 Drag&Drop Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <button
          onClick={() => setEvents([])}
          style={{
            background: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>

      {events.length === 0 ? (
        <div style={{ color: '#888', fontStyle: 'italic' }}>
          No drag&drop events detected yet...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {events.map((event) => (
            <div
              key={event.id}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '8px',
                borderLeft: `4px solid ${getEventColor(event.type)}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: getEventColor(event.type),
                  textTransform: 'uppercase',
                  fontSize: '10px'
                }}>
                  {event.type}
                </span>
                <span style={{ color: '#888', fontSize: '9px' }}>
                  {formatTime(event.timestamp)}
                </span>
              </div>
              
              <div style={{ marginTop: '4px' }}>
                <div><strong>Type:</strong> {event.data.ticketType}</div>
                {event.data.clientX && (
                  <div><strong>Position:</strong> ({event.data.clientX}, {event.data.clientY})</div>
                )}
                {event.data.q !== undefined && (
                  <div><strong>Building:</strong> ({event.data.q}, {event.data.r})</div>
                )}
                {event.data.intersectionsCount !== undefined && (
                  <div><strong>Intersections:</strong> {event.data.intersectionsCount}</div>
                )}
                {event.data.foundBuildings !== undefined && (
                  <div><strong>Found Buildings:</strong> {event.data.foundBuildings}</div>
                )}
                {event.data.mouseX !== undefined && (
                  <div><strong>Mouse 3D:</strong> ({event.data.mouseX.toFixed(2)}, {event.data.mouseY.toFixed(2)})</div>
                )}
                <div><strong>Target:</strong> {event.data.target}</div>
                {event.target && (
                  <div><strong>Class:</strong> {event.target}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DragDropDebug
