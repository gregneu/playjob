import React, { createContext, useContext, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface WindState {
  strength: number // 0-1, сила ветра
  direction: number // 0-2π, направление ветра в радианах
  phase: number // 0-2π, фаза для плавных переходов
  isCalm: boolean // true если ветер стих
  calmDuration: number // длительность затишья
}

interface WindContextType {
  windState: WindState
  getWindOffset: (treeId: string, treeType: 'conifer' | 'deciduous' | 'shrub') => number
}

const WindContext = createContext<WindContextType | null>(null)

export const useWind = () => {
  const context = useContext(WindContext)
  if (!context) {
    throw new Error('useWind must be used within WindProvider')
  }
  return context
}

interface WindProviderProps {
  children: React.ReactNode
}

export const WindProvider: React.FC<WindProviderProps> = ({ children }) => {
  const [windState, setWindState] = useState<WindState>({
    strength: 0.8, // Увеличили с 0.3 до 0.8 для тестирования
    direction: 0,
    phase: 0,
    isCalm: false,
    calmDuration: 0
  })

  const lastUpdateTime = useRef(0)
  const windChangeTimer = useRef(0)
  const calmTimer = useRef(0)
  const targetStrength = useRef(0.8)
  const targetDirection = useRef(0)

  useFrame((state, delta) => {
    // Ограничиваем delta для предотвращения скачков при переключении табов
    const clampedDelta = Math.min(delta, 1/30) // Максимум 1/30 секунды (30 FPS)
    
    const currentTime = state.clock.elapsedTime
    const timeDelta = Math.min(currentTime - lastUpdateTime.current, clampedDelta)
    lastUpdateTime.current = currentTime

    // Обновляем фазу для плавных переходов
    setWindState(prev => ({
      ...prev,
      phase: (prev.phase + timeDelta * 0.1) % (Math.PI * 2)
    }))

    // Проверяем затишье
    if (windState.isCalm) {
      calmTimer.current += timeDelta
      if (calmTimer.current >= windState.calmDuration) {
        setWindState(prev => ({
          ...prev,
          isCalm: false,
          calmDuration: 0
        }))
        calmTimer.current = 0
      }
      return
    }

    // Обновляем таймер смены ветра
    windChangeTimer.current += timeDelta

    // Смена ветра каждые 5-10 секунд (ускорили для тестирования)
    if (windChangeTimer.current >= 5 + Math.random() * 5) {
      windChangeTimer.current = 0

      // 25% вероятность затишья (увеличили для тестирования)
      if (Math.random() < 0.25) {
        setWindState(prev => ({
          ...prev,
          isCalm: true,
          calmDuration: 3 + Math.random() * 7 // 3-10 секунд затишья
        }))
        return
      }

      // Плавное изменение силы и направления ветра
      const newStrength = Math.max(0, Math.min(1, windState.strength + (Math.random() - 0.5) * 0.3))
      const newDirection = (windState.direction + (Math.random() - 0.5) * Math.PI) % (Math.PI * 2)

      targetStrength.current = newStrength
      targetDirection.current = newDirection
    }

    // Более плавная интерполация к целевому состоянию ветра
    const lerpSpeed = 0.3 // Уменьшили скорость изменения ветра для более плавных переходов
    const currentStrength = THREE.MathUtils.lerp(windState.strength, targetStrength.current, lerpSpeed * clampedDelta)
    
    // Правильная интерполация углов с учетом кратчайшего пути
    let directionDiff = targetDirection.current - windState.direction
    
    // Нормализуем разность углов к диапазону [-π, π]
    while (directionDiff > Math.PI) directionDiff -= Math.PI * 2
    while (directionDiff < -Math.PI) directionDiff += Math.PI * 2
    
    let currentDirection = windState.direction + directionDiff * lerpSpeed * clampedDelta
    
    // Нормализуем угол к диапазону [0, 2π]
    while (currentDirection < 0) currentDirection += Math.PI * 2
    while (currentDirection >= Math.PI * 2) currentDirection -= Math.PI * 2

    setWindState(prev => ({
      ...prev,
      strength: currentStrength,
      direction: currentDirection
    }))
  })

  // Функция для получения смещения ветра для конкретного дерева
  const getWindOffset = (treeId: string, treeType: 'conifer' | 'deciduous' | 'shrub'): number => {
    if (windState.isCalm || windState.strength === 0) {
      return 0
    }

    // Разная чувствительность видов деревьев
    const sensitivity = {
      conifer: 0.3,    // Ели качаются медленно и чуть-чуть
      deciduous: 0.8,  // Лиственные реагируют сильнее
      shrub: 0.1       // Кустарники почти не качаются
    }

    // Асинхронность - каждое дерево имеет свою фазу
    const treePhase = (treeId.charCodeAt(0) + treeId.charCodeAt(1)) * 0.1
    const totalPhase = windState.phase + treePhase

    // Синусоидальное покачивание с учетом силы ветра и чувствительности
    const windOffset = Math.sin(totalPhase) * windState.strength * sensitivity[treeType]

    return windOffset
  }

  const contextValue: WindContextType = {
    windState,
    getWindOffset
  }

  return (
    <WindContext.Provider value={contextValue}>
      {children}
    </WindContext.Provider>
  )
}

// Компонент для отображения информации о ветре (для отладки)
export const WindDebug: React.FC = () => {
  const { windState } = useWind()

  return (
    <Html
      position={[0, 0, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none'
      }}
      transform
      occlude
    >
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 1000,
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        <div>Ветер: {windState.isCalm ? 'Затишье' : `${(windState.strength * 100).toFixed(0)}%`}</div>
        <div>Направление: {(windState.direction * 180 / Math.PI).toFixed(0)}°</div>
        <div>Фаза: {(windState.phase * 180 / Math.PI).toFixed(0)}°</div>
      </div>
    </Html>
  )
}
