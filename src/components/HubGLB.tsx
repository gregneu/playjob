import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

interface HubGLBProps {
  position?: [number, number, number]
  rotationY?: number
  /** extra scale multiplier applied after auto-fit */
  scale?: number
  /** target footprint diameter in world units to fit model into */
  fitDiameter?: number
  /** raise on Y to avoid z-fighting */
  raiseY?: number
}

export const HubGLB: React.FC<HubGLBProps> = ({
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  fitDiameter = 1.8,
  raiseY = 0.11,
}) => {
  let gltf: any
  try {
    gltf = useGLTF('/models/hub.glb')
  } catch (error) {
    console.error(`❌ Failed to load hub GLB model:`, error)
    // Return a simple fallback cube
    return (
      <mesh position={[position[0], position[1] + raiseY, position[2]]} rotation={[0, rotationY, 0]} scale={[scale * 0.4, scale * 0.4, scale * 0.4]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8B5CF6" />
      </mesh>
    )
  }

  const { centered, scaleFit } = useMemo(() => {
    if (!gltf || !gltf.scene) {
      console.error(`❌ GLTF scene not available for hub model`)
      // Return a simple fallback cube
      const fallbackGroup = new THREE.Group()
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: '#8B5CF6' })
      )
      fallbackGroup.add(cube)
      return { centered: fallbackGroup, scaleFit: 0.4 }
    }
    
    const base: THREE.Object3D = gltf.scene.clone(true)
    const bbox = new THREE.Box3().setFromObject(base)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    bbox.getSize(size)
    bbox.getCenter(center)

    const group = new THREE.Group()
    const obj = base.clone(true)
    obj.position.set(-center.x, -(center.y - size.y / 2), -center.z)
    
    // Use original GLB model colors - no tinting applied
    
    // Enable shadows
    obj.traverse((o: any) => {
      if (o?.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    group.add(obj)

    const maxXZ = Math.max(size.x, size.z) || 1
    const fit = fitDiameter / maxXZ
    return { centered: group, scaleFit: fit }
  }, [gltf, fitDiameter])

  return (
    <group position={[position[0], position[1] + raiseY, position[2]]} rotation={[0, rotationY, 0]} scale={[scale * scaleFit, scale * scaleFit, scale * scaleFit]}>
      <primitive object={centered} />
    </group>
  )
}

// Preload the hub model
useGLTF.preload('/models/hub.glb')
