import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export interface DustBurstProps {
  position: [number, number, number]
  /** total lifetime in seconds */
  duration?: number
  /** number of dust particles */
  count?: number
  /** base color */
  color?: string
  /** called when the burst finishes */
  onComplete?: () => void
}

export const DustBurst: React.FC<DustBurstProps> = ({
  position,
  duration = 1.1,
  count = 36,
  color = '#a78355',
  onComplete,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const velocities = useMemo(() => {
    const vels: { v: THREE.Vector3; life: number }[] = []
    const rand = (min: number, max: number) => min + Math.random() * (max - min)
    for (let i = 0; i < count; i++) {
      // radial in XZ plus upward
      const ang = Math.random() * Math.PI * 2
      const speed = rand(0.8, 1.3)
      const up = rand(1.4, 2.6)
      const life = rand(0.8, 1.2)
      vels.push({ v: new THREE.Vector3(Math.cos(ang) * speed, up, Math.sin(ang) * speed), life })
    }
    return vels
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const startTimeRef = useRef<number>(0)

  // Initial placement
  React.useEffect(() => {
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      dummy.position.set(position[0], position[1], position[2])
      dummy.scale.setScalar(0.15)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    startTimeRef.current = performance.now() / 1000
  }, [count, dummy, position])

  useFrame((_state, _delta) => {
    const now = performance.now() / 1000
    const t = now - startTimeRef.current
    const k = Math.min(1, t / duration)
    if (!meshRef.current || !materialRef.current) return

    // fade and grow
    const opacity = 1 - k
    materialRef.current.opacity = Math.max(0, opacity)

    for (let i = 0; i < count; i++) {
      const { v, life } = velocities[i]
      // simple ballistic motion with slight gravity
      const gx = 0
      const gy = -3.2 // gravity stronger for heavier dust
      const gz = 0
      const tt = Math.min(t, life)
      const px = position[0] + v.x * tt + 0.5 * gx * tt * tt
      const py = position[1] + v.y * tt + 0.5 * gy * tt * tt
      const pz = position[2] + v.z * tt + 0.5 * gz * tt * tt
      // clamp to ground
      const y = Math.max(position[1] + 0.02, py)
      const s = THREE.MathUtils.lerp(0.22, 0.55, Math.min(1, tt / (duration * 0.6)))
      dummy.position.set(px, y, pz)
      dummy.scale.setScalar(s)
      dummy.rotation.set(0, i * 0.37 + tt * 2.0, 0)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true

    if (t >= duration) {
      onComplete?.()
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]} castShadow={false} receiveShadow>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial ref={materialRef} color={new THREE.Color(color)} transparent opacity={1} roughness={1} metalness={0} />
    </instancedMesh>
  )
}


