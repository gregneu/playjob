import React, { useRef, useState, useEffect } from 'react'

interface PerformanceStats {
  fps: number
  frameTime: number
  memoryUsage: number
  timestamp: number
}

export const PerformanceMonitor: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    timestamp: 0
  })
  
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const fpsHistory = useRef<number[]>([])
  const animationId = useRef<number>()

  useEffect(() => {
    if (!enabled) return

    const updateStats = () => {
      frameCount.current++
      const now = performance.now()
      const deltaTime = now - lastTime.current
      
      // Обновляем статистику каждые 500ms
      if (deltaTime >= 500) {
        const fps = Math.round((frameCount.current * 1000) / deltaTime)
        const frameTime = deltaTime / frameCount.current
        
        // Получаем информацию о памяти (если доступна)
        const memoryUsage = (performance as any).memory 
          ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
          : 0
        
        setStats({
          fps,
          frameTime: Math.round(frameTime * 100) / 100,
          memoryUsage,
          timestamp: now
        })
        
        // Сохраняем историю FPS
        fpsHistory.current.push(fps)
        if (fpsHistory.current.length > 10) {
          fpsHistory.current.shift()
        }
        
        frameCount.current = 0
        lastTime.current = now
      }
      
      animationId.current = requestAnimationFrame(updateStats)
    }

    animationId.current = requestAnimationFrame(updateStats)

    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current)
      }
    }
  }, [enabled])

  const avgFps = fpsHistory.current.length > 0 
    ? Math.round(fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length)
    : stats.fps

  const getPerformanceColor = (fps: number) => {
    if (fps >= 55) return '#22c55e' // Зеленый - отлично
    if (fps >= 40) return '#eab308' // Желтый - хорошо
    if (fps >= 25) return '#f97316' // Оранжевый - плохо
    return '#ef4444' // Красный - очень плохо
  }

  if (!enabled) return null

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '16px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 10000,
      minWidth: '200px',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ 
        color: getPerformanceColor(stats.fps), 
        fontWeight: 'bold', 
        marginBottom: '8px' 
      }}>
        📊 Performance Monitor
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        <div>FPS:</div>
        <div style={{ color: getPerformanceColor(stats.fps), fontWeight: 'bold' }}>
          {stats.fps}
        </div>
        
        <div>Avg FPS:</div>
        <div style={{ color: getPerformanceColor(avgFps) }}>
          {avgFps}
        </div>
        
        <div>Frame Time:</div>
        <div>{stats.frameTime}ms</div>
        
        <div>Memory:</div>
        <div>{stats.memoryUsage}MB</div>
        
        <div>Uptime:</div>
        <div>{Math.round(stats.timestamp / 1000)}s</div>
      </div>
      
      {stats.fps < 30 && (
        <div style={{ 
          marginTop: '8px', 
          padding: '4px', 
          background: 'rgba(239, 68, 68, 0.2)', 
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          ⚠️ Low performance detected
        </div>
      )}
    </div>
  )
}
