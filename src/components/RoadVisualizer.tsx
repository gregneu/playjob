import React, { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { hexToWorldPosition } from '../lib/hex-utils'

interface RoadVisualizerProps {
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

const RoadVisualizer: React.FC<RoadVisualizerProps> = ({ links, hexToWorldPosition, zoneObjects }) => {
  console.log('🛣️ RoadVisualizer render - links count:', links.length)
  console.log('🛣️ RoadVisualizer render - links:', links)
  console.log('🛣️ RoadVisualizer render - zoneObjects count:', zoneObjects.length)
  console.log('🛣️ RoadVisualizer render - zoneObjects:', zoneObjects)
  
  return (
    <group>
      {links.map((link) => (
        <RoadPath 
          key={link.id} 
          link={link} 
          hexToWorldPosition={hexToWorldPosition} 
          zoneObjects={zoneObjects}
        />
      ))}
    </group>
  )
}

// Компонент дороги между двумя объектами
const RoadPath: React.FC<{ 
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
  
  // Находим координаты объектов
  const fromObject = zoneObjects.find(obj => obj.id === link.from_object_id)
  const toObject = zoneObjects.find(obj => obj.id === link.to_object_id)
  
  console.log('🔗 Looking for objects:', { fromId: link.from_object_id, toId: link.to_object_id })
  console.log('🔗 Found objects:', { fromObject, toObject })
  
  if (!fromObject || !toObject) {
    console.warn('Road objects not found:', link.from_object_id, link.to_object_id)
    return null
  }
  
  // Проверяем, что координаты существуют
  if (typeof fromObject.q !== 'number' || typeof fromObject.r !== 'number' ||
      typeof toObject.q !== 'number' || typeof toObject.r !== 'number') {
    console.warn('Invalid coordinates for road:', fromObject, toObject)
    console.log('🔗 Object coordinates:', { 
      from: { q: fromObject.q, r: fromObject.r, type: typeof fromObject.q }, 
      to: { q: toObject.q, r: toObject.r, type: typeof toObject.q } 
    })
    return null
  }
  
  // Получаем координаты объектов в мировых координатах
  const [fromX, fromY, fromZ] = hexToWorldPosition(fromObject.q, fromObject.r)
  const [toX, toY, toZ] = hexToWorldPosition(toObject.q, toObject.r)
  
  console.log('🔗 Creating road between:', { from: [fromX, fromY, fromZ], to: [toX, toY, toZ] })
  
  // Вычисляем центр дороги и её размеры
  const centerX = (fromX + toX) / 2
  const centerZ = (fromZ + toZ) / 2
  const distance = Math.sqrt((toX - fromX) ** 2 + (toZ - fromZ) ** 2)
  const angle = Math.atan2(toZ - fromZ, toX - fromX)
  
  // Размеры дороги
  const roadWidth = 0.4  // Ширина дороги
  const roadLength = distance + 0.2  // Длина дороги с небольшим запасом
  
  return (
    <group position={[centerX, 0.05, centerZ]} rotation={[-Math.PI / 2, 0, angle]}>
      {/* Основная дорога */}
      <mesh>
        <planeGeometry args={[roadLength, roadWidth]} />
        <meshStandardMaterial 
          color="#4a4a4a"  // Серый цвет асфальта
          roughness={0.8}  // Шероховатость для реалистичности
          metalness={0.1}  // Небольшая металличность
        />
      </mesh>
      
      {/* Белые полосы на дороге */}
      <mesh position={[0, 0.001, 0]}>
        <planeGeometry args={[roadLength, 0.05]} />
        <meshStandardMaterial 
          color="#ffffff"  // Белый цвет полос
          roughness={0.3}
          metalness={0.0}
        />
      </mesh>
    </group>
  )
}

export default RoadVisualizer
