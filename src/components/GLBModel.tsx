import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

interface GLBModelProps {
  path: string
  position?: [number, number, number]
  rotationY?: number
  /** extra scale multiplier applied after auto-fit */
  scale?: number
  /** target footprint diameter in world units to fit model into */
  fitDiameter?: number
  /** raise on Y to avoid z-fighting */
  raiseY?: number
}

export const GLBModel: React.FC<GLBModelProps> = ({
  path,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  fitDiameter = 1.0,
  raiseY = 0.11,
}) => {
  // Temporarily disable GLB loading due to errors
  console.warn(`⚠️ GLB model loading disabled: ${path}`)
  
  // Return a simple fallback cube
  return (
    <mesh position={[position[0], position[1] + raiseY, position[2]]} rotation={[0, rotationY, 0]} scale={[scale * 0.3, scale * 0.3, scale * 0.3]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#666666" />
    </mesh>
  )

  let gltf: any
  try {
    gltf = useGLTF(path)
  } catch (error) {
    console.error(`❌ Failed to load GLB model: ${path}`, error)
    // Return a simple fallback cube
    return (
      <mesh position={[position[0], position[1] + raiseY, position[2]]} rotation={[0, rotationY, 0]} scale={[scale * 0.3, scale * 0.3, scale * 0.3]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
    )
  }

  const { centered, scaleFit } = useMemo(() => {
    if (!gltf || !gltf.scene) {
      console.error(`❌ GLTF scene not available for: ${path}`)
      // Return a simple fallback cube
      const fallbackGroup = new THREE.Group()
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: '#666666' })
      )
      fallbackGroup.add(cube)
      return { centered: fallbackGroup, scaleFit: 0.3 }
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
    // enable shadows
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

useGLTF.preload('/models/tent.glb?v=2')
useGLTF.preload('/models/core-hub1.glb')


