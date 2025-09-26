import React from 'react'
import * as THREE from 'three'
import { hexToWorldPosition } from '../lib/hex-utils'

interface SimpleRoadSystemProps {
  links: Array<{
    id: string
    from_object_id: string
    to_object_id: string
    link_type: 'primary' | 'secondary'
    created_at: string
  }>
  zoneObjects: Array<{
    id: string
    q: number
    r: number
    object_type?: string
  }>
}

// Упрощенная система дорог для отладки
const SimpleRoadSystem: React.FC<SimpleRoadSystemProps> = ({ links, zoneObjects }) => {
  console.log('🔗 SimpleRoadSystem: Starting render')
  console.log('🔗 SimpleRoadSystem: Links count:', links.length)
  console.log('🔗 SimpleRoadSystem: Zone objects count:', zoneObjects.length)
  console.log('🔗 SimpleRoadSystem: Links:', links)
  console.log('🔗 SimpleRoadSystem: Zone objects:', zoneObjects)

  if (links.length === 0) {
    console.log('🔗 SimpleRoadSystem: No links to render')
    return null
  }

  if (zoneObjects.length === 0) {
    console.log('🔗 SimpleRoadSystem: No zone objects to connect')
    return null
  }

  return (
    <group>
      {links.map(link => {
        const fromObject = zoneObjects.find(obj => obj.id === link.from_object_id)
        const toObject = zoneObjects.find(obj => obj.id === link.to_object_id)
        
        if (!fromObject || !toObject) {
          console.log('🔗 SimpleRoadSystem: Objects not found for link:', link.id)
          return null
        }

        console.log('🔗 SimpleRoadSystem: Creating road between:', {
          from: { id: fromObject.id, q: fromObject.q, r: fromObject.r },
          to: { id: toObject.id, q: toObject.q, r: toObject.r }
        })

        // Получаем позиции объектов
        const [fromX, , fromZ] = hexToWorldPosition(fromObject.q, fromObject.r)
        const [toX, , toZ] = hexToWorldPosition(toObject.q, toObject.r)
        
        // Вычисляем центр дороги
        const centerX = (fromX + toX) / 2
        const centerZ = (fromZ + toZ) / 2
        const distance = Math.sqrt((toX - fromX) ** 2 + (toZ - fromZ) ** 2)
        const angle = Math.atan2(toZ - fromZ, toX - fromX)
        
        // Цвет дороги в зависимости от типа
        const roadColor = link.link_type === 'primary' ? '#4a4a4a' : '#6a6a6a'
        
        return (
          <group key={link.id} position={[centerX, 0.05, centerZ]} rotation={[-Math.PI / 2, 0, angle]}>
            {/* Основная дорога */}
            <mesh>
              <planeGeometry args={[distance + 0.2, 0.4]} />
              <meshStandardMaterial 
                color={roadColor}
                roughness={0.8}
                metalness={0.1}
              />
            </mesh>
            
            {/* Белые полосы на дороге */}
            <mesh position={[0, 0.001, 0]}>
              <planeGeometry args={[distance + 0.2, 0.05]} />
              <meshStandardMaterial 
                color="#ffffff"
                roughness={0.3}
                metalness={0.0}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export default SimpleRoadSystem
