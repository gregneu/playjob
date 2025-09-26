import React from 'react'
import RoadTile from './RoadTile'
import { RoadTileType } from '../utils/roadTileUtils'

// Демо компонент для показа всех типов дорожных плиток
const RoadTileDemo: React.FC = () => {
  const tileTypes: Array<{ type: RoadTileType; label: string }> = [
    { type: 'straight', label: 'Прямая дорога' },
    { type: 'turn60_left', label: 'Поворот 60° влево' },
    { type: 'turn60_right', label: 'Поворот 60° вправо' },
    { type: 'turn120_left', label: 'Поворот 120° влево' },
    { type: 'turn120_right', label: 'Поворот 120° вправо' }
  ]

  return (
    <group>
      {tileTypes.map((tile, index) => (
        <group key={tile.type} position={[index * 2 - 4, 0, 0]}>
          <RoadTile
            type={tile.type}
            position={[0, 0, 0]}
            rotation={0}
            scale={[1, 1, 1]}
          />
          {/* Текстовая подпись */}
          <mesh position={[0, 0.5, 0]}>
            <planeGeometry args={[1.8, 0.3]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default RoadTileDemo
