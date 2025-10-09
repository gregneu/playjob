import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export interface EnergyPulseProps {
  start: [number, number, number]
  end: [number, number, number]
  duration?: number
  radius?: number
  color?: string
  delay?: number
  onComplete?: () => void
}

export const EnergyPulse: React.FC<EnergyPulseProps> = ({
  start,
  end,
  duration = 0.6,
  radius = 0.26,
  color = '#fdfdff',
  delay = 0,
  onComplete
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const startTimeRef = useRef<number>(performance.now() / 1000)
  const hasCompletedRef = useRef(false)

  const startVec = useMemo(() => new THREE.Vector3(...start), [start])
  const endVec = useMemo(() => new THREE.Vector3(...end), [end])
  const travel = useMemo(() => endVec.clone().sub(startVec), [endVec, startVec])
  const distance = useMemo(() => travel.length(), [travel])

  useEffect(() => {
    startTimeRef.current = performance.now() / 1000 + delay
    hasCompletedRef.current = false
    if (meshRef.current) meshRef.current.visible = false
    if (glowRef.current) glowRef.current.visible = false
  }, [startVec, endVec, delay])

  const glowMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    return mat
  }, [color])

  useEffect(() => {
    return () => {
      glowMaterial.dispose()
    }
  }, [glowMaterial])

  useFrame(() => {
    const now = performance.now() / 1000
    const elapsed = now - startTimeRef.current
    if (elapsed < 0) {
      if (meshRef.current) meshRef.current.visible = false
      if (glowRef.current) glowRef.current.visible = false
      return
    }

    if (meshRef.current && meshRef.current.visible === false) {
      meshRef.current.visible = true
    }
    if (glowRef.current && glowRef.current.visible === false) {
      glowRef.current.visible = true
    }

    const t = Math.min(1, elapsed / Math.max(duration, 0.01))
    const pos = startVec.clone().addScaledVector(travel, t)

    if (meshRef.current) {
      meshRef.current.position.copy(pos)
      const easeOut = t < 0.8 ? t / 0.8 : 1
      const scale = THREE.MathUtils.lerp(radius, radius * 0.55, easeOut)
      meshRef.current.scale.setScalar(scale)
    }

    if (glowRef.current) {
      glowRef.current.position.copy(pos)
      const pulse = 0.65 + Math.sin(elapsed * 12) * 0.15
      glowRef.current.scale.setScalar(radius * 2.4 * pulse)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial | null
      if (mat) {
        mat.opacity = 0.42 * (1 - Math.abs(t - 0.5) * 1.8)
      }
    }

    if (!hasCompletedRef.current && t >= 1) {
      hasCompletedRef.current = true
      onComplete?.()
    }
  })

  return (
    <group>
      <mesh ref={meshRef} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={new THREE.Color(color)}
          emissive={new THREE.Color(color)}
          emissiveIntensity={1.4}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>
      <mesh ref={glowRef} material={glowMaterial} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[1, 16, 16]} />
      </mesh>
    </group>
  )
}
