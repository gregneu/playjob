import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RobotCarProps {
  position?: [number, number, number]
  color?: string
  isMoving?: boolean
  isBlinking?: boolean
  scale?: number
  targetPosition?: [number, number, number]
}

export const RobotCar: React.FC<RobotCarProps> = ({ 
  position = [0, 0, 0], 
  color = '#ffffff',
  isMoving = false,
  isBlinking = true,
  scale = 1,
  targetPosition
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const leftEyeRef = useRef<THREE.Mesh>(null)
  const rightEyeRef = useRef<THREE.Mesh>(null)
  const leftWheelRef = useRef<THREE.Mesh>(null)
  const rightWheelRef = useRef<THREE.Mesh>(null)

  // Создаем геометрию с закругленными углами для кузова
  const roundedBoxGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(0.5, 0.4, 0.4, 8, 6, 8)
    
    // Применяем закругление к вершинам
    const positionAttribute = geometry.getAttribute('position')
    const positions = positionAttribute.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      // Нормализуем координаты к [-1, 1]
      const nx = x / 0.25
      const ny = y / 0.2
      const nz = z / 0.2
      
      // Применяем закругление
      const radius = 0.1
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz)
      
      if (length > 1) {
        const factor = 1 + radius * (1 - 1 / length)
        positions[i] = x * factor
        positions[i + 1] = y * factor
        positions[i + 2] = z * factor
      }
    }
    
    positionAttribute.needsUpdate = true
    geometry.computeVertexNormals()
    
    return geometry
  }, [])

  // Создаем геометрию с закругленными углами для экрана
  const roundedScreenGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(0.38, 0.35, 0.02, 6, 4, 2)
    
    // Применяем закругление к вершинам
    const positionAttribute = geometry.getAttribute('position')
    const positions = positionAttribute.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      // Нормализуем координаты к [-1, 1]
      const nx = x / 0.225
      const ny = y / 0.175
      // const nz = z / 0.01 // nz is calculated but not used in current implementation
      
      // Применяем закругление
      const radius = 0.35
      const length = Math.sqrt(nx * nx + ny * ny)
      
      if (length > 1) {
        const factor = 1 + radius * (1 - 1 / length)
        positions[i] = x * factor
        positions[i + 1] = y * factor
        positions[i + 2] = z
      }
    }
    
    positionAttribute.needsUpdate = true
    geometry.computeVertexNormals()
    
    return geometry
  }, [])
  
  useFrame((state) => {
    if (!groupRef.current) return
    
    const time = state.clock.getElapsedTime()
    
    // Плавное движение к целевой позиции
    if (targetPosition) {
      const currentPos = groupRef.current.position
      const target = new THREE.Vector3(...targetPosition)
      const distance = currentPos.distanceTo(target)
      
      if (distance > 0.01) {
        // Плавная интерполяция к целевой позиции
        currentPos.lerp(target, 0.05)
        
        // Поворот в сторону движения
        const direction = target.clone().sub(currentPos).normalize()
        if (direction.length() > 0.01) {
          const targetRotation = Math.atan2(direction.x, direction.z)
          groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation, 0.1)
        }
        
        // Отладочная информация (только первые несколько кадров)
        if (Math.floor(time * 10) % 60 === 0) {
          console.log(`🚗 Moving: distance=${distance.toFixed(3)}, current=[${currentPos.x.toFixed(2)}, ${currentPos.z.toFixed(2)}], target=[${target.x.toFixed(2)}, ${target.z.toFixed(2)}]`)
        }
      } else {
        // Достигли цели
        if (Math.floor(time * 10) % 60 === 0) {
          console.log(`🚗 Reached target position!`)
        }
      }
    }
    
    // Анимация мигания глаз
    if (isBlinking && leftEyeRef.current && rightEyeRef.current) {
      const blink = Math.sin(time * 3) > 0.8 ? 0 : 1
      leftEyeRef.current.scale.y = blink
      rightEyeRef.current.scale.y = blink
    }
    
    // Анимация вращения колес при движении
    if (isMoving && leftWheelRef.current && rightWheelRef.current) {
      leftWheelRef.current.rotation.x += 0.1
      rightWheelRef.current.rotation.x += 0.1
    }
  })
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Основной кузов с закругленными углами */}
      <mesh position={[0, 0.15, 0]} geometry={roundedBoxGeometry}>
        <meshStandardMaterial 
          color={color}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      
      {/* Черный экран */}
      <mesh position={[0, 0.2, 0.21]} geometry={roundedScreenGeometry}>
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      {/* Левый глаз */}
      <mesh ref={leftEyeRef} position={[-0.1, 0.2, 0.22]}>
        <boxGeometry args={[0.02, 0.08, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Правый глаз */}
      <mesh ref={rightEyeRef} position={[0.1, 0.2, 0.22]}>
        <boxGeometry args={[0.02, 0.08, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Левое колесо */}
      <mesh ref={leftWheelRef} position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 12]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Правое колесо */}
      <mesh ref={rightWheelRef} position={[0.2, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 12]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Центр левого колеса */}
      <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.14, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Центр правого колеса */}
      <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.14, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}
