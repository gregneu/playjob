import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { RoadTileType, getRoadTileModelPath } from '../utils/roadTileUtils'

interface RoadTileProps {
  type: RoadTileType
  position: [number, number, number]
  rotation: number
  scale?: [number, number, number]
}

const RoadTile: React.FC<RoadTileProps> = ({ 
  type, 
  position, 
  rotation, 
  scale = [1, 1, 1] 
}) => {
  const group = useRef<THREE.Group>(null)
  
  try {
    // Загружаем GLB модель дорожной плитки
    const modelPath = getRoadTileModelPath(type)
    const { nodes, materials } = useGLTF(modelPath) as any
    
    console.log(`🛣️ RoadTile (${type}) loaded - nodes:`, Object.keys(nodes))
    console.log(`🛣️ RoadTile (${type}) loaded - materials:`, Object.keys(materials || {}))
    
    // Пытаемся найти основной объект дороги
    const roadObject = nodes.Scene || 
                      nodes.root || 
                      nodes.Road || 
                      nodes.road || 
                      nodes.Cube || 
                      nodes.Mesh ||
                      Object.values(nodes)[0]
    
    if (!roadObject) {
      console.error(`🛣️ RoadTile (${type}): No road object found in GLB model`)
      return null
    }

    console.log(`🛣️ RoadTile (${type}) rendering:`, { 
      position: position.map(p => Math.round(p * 100) / 100), 
      rotation: Math.round(rotation * 180 / Math.PI), 
      scale: scale.map(s => Math.round(s * 100) / 100),
      modelPath
    })

    return (
      <group 
        ref={group} 
        position={position} 
        rotation={[0, rotation, 0]} 
        scale={scale}
      >
        <primitive object={roadObject.clone()} />
      </group>
    )
  } catch (error) {
    console.error(`🛣️ RoadTile (${type}) error loading model:`, error)
    
    // Fallback: простая геометрия если модель не загрузилась
    return (
      <group 
        position={position} 
        rotation={[0, rotation, 0]} 
        scale={scale}
      >
        <mesh>
          <boxGeometry args={[0.8, 0.1, 0.8]} />
          <meshStandardMaterial 
            color="#4a4a4a" 
            roughness={0.8} 
            metalness={0.1} 
          />
        </mesh>
      </group>
    )
  }
}

// Предзагрузка всех моделей дорожных плиток
const roadTileTypes: RoadTileType[] = [
  'straight',
  'turn60_left', 
  'turn60_right',
  'turn120_left',
  'turn120_right'
]

roadTileTypes.forEach(type => {
  useGLTF.preload(getRoadTileModelPath(type))
})

export default RoadTile
