import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface LogEntry {
  id: string
  timestamp: Date
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

const DebugLogger: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)

  useEffect(() => {
    if (!isEnabled) return

    // Перехватываем console.log
    const originalLog = console.log
    console.log = (...args) => {
      originalLog(...args)
      
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            // Проверяем на circular references и DOM элементы
            if (arg instanceof HTMLElement || arg instanceof Event || arg.constructor?.name?.includes('Fiber')) {
              return `[${arg.constructor?.name || 'Object'}]`
            }
            return JSON.stringify(arg, null, 2)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      }).join(' ')
      
      // Фильтруем только наши debug сообщения
      if (message.includes('🚀') || message.includes('📝') || message.includes('🎯') || 
          message.includes('🔍') || message.includes('🎭') || message.includes('✅') || 
          message.includes('❌') || message.includes('⚠️') || message.includes('📦')) {
        
        const logEntry: LogEntry = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          message: message,
          type: message.includes('❌') ? 'error' : 
                 message.includes('⚠️') ? 'warning' : 
                 message.includes('✅') ? 'success' : 'info'
        }
        
        setLogs(prev => {
          const newLogs = [logEntry, ...prev].slice(0, 50) // Храним только последние 50 логов
          return newLogs
        })
      }
    }

    return () => {
      console.log = originalLog
    }
  }, [isEnabled])

  const clearLogs = () => {
    setLogs([])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'success': return 'text-green-400'
      default: return 'text-blue-400'
    }
  }

  if (!isEnabled) {
    const enableButton = (
      <div className="fixed bottom-4 right-4 z-[9999]" style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999 }}>
        <button
          onClick={() => setIsEnabled(true)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
        >
          Enable Debug
        </button>
      </div>
    )
    return createPortal(enableButton, document.body)
  }

  const debugLoggerContent = (
    <div className="fixed bottom-4 right-4 z-[9999]" style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999 }}>
      <div className={`bg-black bg-opacity-90 backdrop-blur-sm border border-gray-700 rounded-lg transition-all duration-300 ${
        isExpanded ? 'w-96 h-96' : 'w-64 h-12'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">Debug Logger</span>
            <span className="text-gray-400 text-xs">({logs.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearLogs}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
            >
              {isExpanded ? '−' : '+'}
            </button>
            <button
              onClick={() => setIsEnabled(false)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Logs */}
        {isExpanded && (
          <div className="h-80 overflow-y-auto p-2 space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">
                No debug logs yet...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 text-xs flex-shrink-0 mt-0.5">
                      {formatTime(log.timestamp)}
                    </span>
                    <span className={`${getLogColor(log.type)} break-words whitespace-pre-wrap font-mono text-xs`}>
                      {log.message.length > 200 ? log.message.substring(0, 200) + '...' : log.message}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Collapsed view - show last log */}
        {!isExpanded && logs.length > 0 && (
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-1">
              {formatTime(logs[0].timestamp)}
            </div>
            <div className={`${getLogColor(logs[0].type)} text-xs truncate font-mono`}>
              {logs[0].message.length > 100 ? logs[0].message.substring(0, 100) + '...' : logs[0].message}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(debugLoggerContent, document.body)
}

export default DebugLogger
