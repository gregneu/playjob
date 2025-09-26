import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BugComponent } from './BugComponent'

export const BugSwarm: React.FC = () => {
  const swarmRef = useRef<THREE.Group>(null)
  const bugsRef = useRef<THREE.Group[]>([])
  const animationRef = useRef({
    time: 0,
    bugCount: 5, // Количество жуков в стае
    bugPositions: [] as Array<{ x: number; z: number; phase: number; speed: number }>
  })

  useEffect(() => {
    // Инициализируем позиции жуков
    const positions = []
    for (let i = 0; i < animationRef.current.bugCount; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 0.8, // Случайная позиция в пределах ячейки
        z: (Math.random() - 0.5) * 0.8,
        phase: Math.random() * Math.PI * 2, // Случайная фаза анимации
        speed: 0.5 + Math.random() * 0.5 // Случайная скорость
      })
    }
    animationRef.current.bugPositions = positions
  }, [])

  useFrame((state, delta) => {
    if (!swarmRef.current) return
    
    // Ограничиваем delta для предотвращения скачков при переключении табов
    const clampedDelta = Math.min(delta, 1/30) // Максимум 1/30 секунды (30 FPS)
    
    animationRef.current.time += clampedDelta
    
    // Обновляем позиции жуков
    animationRef.current.bugPositions.forEach((bug, index) => {
      if (bugsRef.current[index]) {
        const bugGroup = bugsRef.current[index]
        
        // Простая анимация движения по кругу
        const radius = 0.3
        const angle = animationRef.current.time * bug.speed + bug.phase
        
        bugGroup.position.x = Math.cos(angle) * radius
        bugGroup.position.z = Math.sin(angle) * radius
        bugGroup.position.y = 0.05 + Math.sin(animationRef.current.time * 3 + bug.phase) * 0.02
        
        // Поворот жука в направлении движения
        bugGroup.rotation.y = angle + Math.PI / 2
      }
    })
  })

  return (
    <group ref={swarmRef}>
      {Array.from({ length: animationRef.current.bugCount }).map((_, index) => (
        <group
          key={index}
          ref={(el) => {
            if (el) bugsRef.current[index] = el
          }}
          position={[
            animationRef.current.bugPositions[index]?.x || 0,
            0.1,
            animationRef.current.bugPositions[index]?.z || 0
          ]}
        >
          <BugComponent />
        </group>
      ))}
    </group>
  )
} 