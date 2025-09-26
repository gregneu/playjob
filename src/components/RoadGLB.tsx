import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface RoadGLBProps {
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: [number, number, number]
}

const RoadGLB: React.FC<RoadGLBProps> = ({ position, rotation, scale = [1, 1, 1] }) => {
  const group = useRef<THREE.Group>(null)
  
  try {
    // Загружаем GLB модель дороги
    const { nodes, materials } = useGLTF('/models/roud.glb') as any
    
    console.log('🛣️ RoadGLB loaded - nodes:', Object.keys(nodes))
    console.log('🛣️ RoadGLB loaded - materials:', Object.keys(materials || {}))
    
    const roadObject = nodes.Scene || nodes.root || nodes.Road || nodes.road || nodes.Cube || Object.values(nodes)[0]
    
    if (!roadObject) {
      console.error('🛣️ RoadGLB: No road object found in GLB model')
      return null
    }

    console.log('🛣️ RoadGLB rendering with:', { 
      position: position.map(p => Math.round(p * 100) / 100), 
      rotation: rotation.map(r => Math.round(r * 100) / 100), 
      scale: scale.map(s => Math.round(s * 100) / 100) 
    })
    console.log('🛣️ RoadGLB object:', roadObject)

    return (
      <group ref={group} position={position} rotation={rotation} scale={scale}>
        <primitive object={roadObject} />
      </group>
    )
  } catch (error) {
    console.error('🛣️ RoadGLB error loading model:', error)
    return null
  }
}

export default RoadGLB
