import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface TicketTravelOrbProps {
  start: [number, number, number]
  end: [number, number, number]
  duration?: number
  color?: string
  onComplete?: () => void
}

export const TicketTravelOrb: React.FC<TicketTravelOrbProps> = ({
  start,
  end,
  duration = 0.9,
  color = '#ffd54f',
  onComplete
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const startTimeRef = useRef<number>(0)

  const control = useMemo(() => {
    // Поднимаем траекторию дугой
    const cx = (start[0] + end[0]) / 2
    const cz = (start[2] + end[2]) / 2
    const height = 1.6 + Math.min(3.5, new THREE.Vector3(start[0]-end[0], 0, start[2]-end[2]).length() * 0.15)
    return new THREE.Vector3(cx, Math.max(start[1], end[1]) + height, cz)
  }, [start, end])

  const p0 = useMemo(() => new THREE.Vector3(...start), [start])
  const p1 = control
  const p2 = useMemo(() => new THREE.Vector3(...end), [end])

  const easeInOut = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t))

  React.useEffect(() => {
    startTimeRef.current = performance.now() / 1000
    if (meshRef.current) {
      meshRef.current.position.set(start[0], start[1], start[2])
    }
    if (lightRef.current) {
      lightRef.current.position.set(start[0], start[1] + 0.2, start[2])
    }
  }, [start])

  useFrame(() => {
    const now = performance.now() / 1000
    const t = (now - startTimeRef.current) / duration
    if (!meshRef.current || !matRef.current || !lightRef.current) return

    if (t >= 1) {
      meshRef.current.position.set(end[0], end[1], end[2])
      lightRef.current.position.set(end[0], end[1] + 0.2, end[2])
      onComplete?.()
      return
    }

    const k = easeInOut(Math.max(0, Math.min(1, t)))
    // Квадратичная Безье: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const oneMinus = 1 - k
    const bx = oneMinus * oneMinus * p0.x + 2 * oneMinus * k * p1.x + k * k * p2.x
    const by = oneMinus * oneMinus * p0.y + 2 * oneMinus * k * p1.y + k * k * p2.y
    const bz = oneMinus * oneMinus * p0.z + 2 * oneMinus * k * p1.z + k * k * p2.z

    meshRef.current.position.set(bx, by, bz)
    lightRef.current.position.set(bx, by + 0.2, bz)

    const s = THREE.MathUtils.lerp(0.14, 0.22, Math.sin(k * Math.PI))
    meshRef.current.scale.setScalar(s)
    const em = THREE.MathUtils.lerp(0.3, 1.2, Math.sin(k * Math.PI))
    matRef.current.emissiveIntensity = em
  })

  return (
    <group>
      <mesh ref={meshRef} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial ref={matRef} color={new THREE.Color(color)} emissive={new THREE.Color(color)} emissiveIntensity={0.8} roughness={0.2} metalness={0.0} />
      </mesh>
      <pointLight ref={lightRef} color={new THREE.Color(color)} intensity={1.2} distance={4} decay={2} />
    </group>
  )
}


