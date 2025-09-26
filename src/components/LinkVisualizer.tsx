import React, { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface LinkVisualizerProps {
  links: Array<{
    id: string
    from_object_id: string
    to_object_id: string
    link_type: 'primary' | 'secondary'
    created_at: string
    from_object?: { id: string; q: number; r: number }
    to_object?: { id: string; q: number; r: number }
  }>
  hexToWorldPosition: (q: number, r: number) => [number, number, number]
  zoneObjects: Array<{
    id: string
    q: number
    r: number
  }>
}

const LinkVisualizer: React.FC<LinkVisualizerProps> = ({ links, hexToWorldPosition, zoneObjects }) => {
  return (
    <group>
      {links.map((link) => (
        <GlassTube 
          key={link.id} 
          link={link} 
          hexToWorldPosition={hexToWorldPosition} 
          zoneObjects={zoneObjects}
        />
      ))}
    </group>
  )
}

// Компонент стеклянной трубы с анимированными стрелками
const GlassTube: React.FC<{ 
  link: { 
    id: string; 
    from_object_id: string; 
    to_object_id: string; 
    link_type: 'primary' | 'secondary';
    from_object?: { id: string; q: number; r: number };
    to_object?: { id: string; q: number; r: number };
  }
  hexToWorldPosition: (q: number, r: number) => [number, number, number]
  zoneObjects: Array<{ id: string; q: number; r: number }>
}> = ({ link, hexToWorldPosition, zoneObjects }) => {
  const tubeRef = useRef<THREE.Group>(null)
  const arrowRef = useRef<THREE.Mesh>(null)
  
  // Находим координаты объектов
  const fromObject = zoneObjects.find(obj => obj.id === link.from_object_id)
  const toObject = zoneObjects.find(obj => obj.id === link.to_object_id)
  
  if (!fromObject || !toObject) {
    console.warn('Link objects not found:', link.from_object_id, link.to_object_id)
    return null
  }
  
  const [fromX, , fromZ] = hexToWorldPosition(fromObject.q, fromObject.r)
  const [toX, , toZ] = hexToWorldPosition(toObject.q, toObject.r)
  
  // Создаем изогнутый путь для трубы
  const tubePath = useMemo(() => createCurvedPath([fromX, 0.15, fromZ], [toX, 0.15, toZ]), [fromX, fromZ, toX, toZ])
  
  // Анимация стрелки
  useFrame((state) => {
    if (arrowRef.current) {
      const time = state.clock.elapsedTime
      const progress = (time * 0.5) % 1 // Скорость движения стрелки
      
      const pointIndex = Math.floor(progress * (tubePath.length - 1))
      const nextIndex = Math.min(pointIndex + 1, tubePath.length - 1)
      const localProgress = (progress * (tubePath.length - 1)) % 1
      
      const current = tubePath[pointIndex]
      const next = tubePath[nextIndex]
      
      // Интерполируем позицию
      const x = current[0] + (next[0] - current[0]) * localProgress
      const y = current[1] + (next[1] - current[1]) * localProgress
      const z = current[2] + (next[2] - current[2]) * localProgress
      
      arrowRef.current.position.set(x, y, z)
      
      // Вычисляем направление для поворота стрелки
      const dx = next[0] - current[0]
      const dz = next[2] - current[2]
      const angle = Math.atan2(dz, dx)
      arrowRef.current.rotation.set(0, angle, 0)
    }
  })
  
  return (
    <group ref={tubeRef}>
      {/* Стеклянная труба */}
      <mesh>
        <tubeGeometry args={[new THREE.CatmullRomCurve3(tubePath.map(p => new THREE.Vector3(...p))), 64, 0.08, 8, false]} />
        <meshPhysicalMaterial 
          color="#ffffff"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.9}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </mesh>
      
      {/* Анимированная стрелка */}
      <mesh ref={arrowRef}>
        <coneGeometry args={[0.06, 0.12, 8]} />
        <meshPhysicalMaterial 
          color="#22c55e" // Зеленый цвет для стрелки
          emissive="#22c55e"
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}

// Функция для создания изогнутого пути между двумя точками
function createCurvedPath(from: [number, number, number], to: [number, number, number]): [number, number, number][] {
  const points: [number, number, number][] = []
  const segments = 20
  
  // Вычисляем контрольную точку для изгиба
  const midX = (from[0] + to[0]) / 2
  const midZ = (from[2] + to[2]) / 2
  const distance = Math.sqrt((to[0] - from[0]) ** 2 + (to[2] - from[2]) ** 2)
  const curveHeight = Math.min(distance * 0.3, 1.5) // Ограничиваем высоту изгиба
  
  // Создаем точки вдоль кривой Безье
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = from[0] + (to[0] - from[0]) * t
    const z = from[2] + (to[2] - from[2]) * t
    const y = from[1] + curveHeight * Math.sin(Math.PI * t)
    
    points.push([x, y, z])
  }
  
  return points
}



export default LinkVisualizer
