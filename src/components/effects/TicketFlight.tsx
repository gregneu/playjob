import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

export interface TicketFlightProps {
  start: [number, number, number]
  end: [number, number, number]
  duration?: number
  arcHeight?: number
  ticketColor?: string
  ticketBackColor?: string
  ticketSize?: [number, number]
  onArrive?: () => void
  onComplete?: () => void
}

const DEFAULT_SIZE: [number, number] = [0.88, 0.56]

const easeInOut = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t))

export const TicketFlight: React.FC<TicketFlightProps> = ({
  start,
  end,
  duration = 0.85,
  arcHeight,
  ticketColor = '#38bdf8',
  ticketBackColor = '#0f172a',
  ticketSize = DEFAULT_SIZE,
  onArrive,
  onComplete
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const shadowRef = useRef<THREE.Mesh>(null)
  const startTimeRef = useRef<number>(performance.now() / 1000)
  const arrivedRef = useRef(false)
  const finishedRef = useRef(false)
  const { camera } = useThree()

  const startVec = useMemo(() => new THREE.Vector3(...start), [start])
  const endVec = useMemo(() => new THREE.Vector3(...end), [end])
  const distance = useMemo(() => startVec.distanceTo(endVec), [startVec, endVec])
  const controlHeight = useMemo(() => {
    if (typeof arcHeight === 'number') return arcHeight
    return Math.max(0.8, distance * 0.45)
  }, [arcHeight, distance])
  const controlPoint = useMemo(() => {
    const mid = startVec.clone().add(endVec).multiplyScalar(0.5)
    return mid.add(new THREE.Vector3(0, controlHeight, 0))
  }, [startVec, endVec, controlHeight])

  useEffect(() => {
    startTimeRef.current = performance.now() / 1000
    arrivedRef.current = false
    finishedRef.current = false
  }, [startVec, endVec])

  useFrame(() => {
    if (!meshRef.current) return

    const now = performance.now() / 1000
    const elapsed = now - startTimeRef.current
    const progress = Math.min(1, duration <= 0 ? 1 : elapsed / duration)
    const eased = easeInOut(progress)

    const point = new THREE.Vector3()
    point.set(0, 0, 0)

    const p0 = startVec
    const p1 = controlPoint
    const p2 = endVec

    const inv = 1 - eased
    point
      .addScaledVector(p0, inv * inv)
      .addScaledVector(p1, 2 * inv * eased)
      .addScaledVector(p2, eased * eased)

    meshRef.current.position.copy(point)

    if (shadowRef.current) {
      shadowRef.current.position.set(point.x, endVec.y + 0.02, point.z)
      const shadowScale = THREE.MathUtils.lerp(0.3, 0.75, eased)
      shadowRef.current.scale.set(shadowScale, shadowScale, shadowScale)
      const shadowOpacity = THREE.MathUtils.lerp(0.1, 0.22, eased)
      ;(shadowRef.current.material as THREE.MeshBasicMaterial).opacity = shadowOpacity
    }

    meshRef.current.rotation.y = eased * Math.PI * 2.5
    meshRef.current.rotation.x = Math.sin(eased * Math.PI) * 0.35

    if (camera) {
      const lookAt = camera.position.clone()
      lookAt.y = meshRef.current.position.y
      meshRef.current.lookAt(lookAt)
      meshRef.current.rotateY(eased * Math.PI * 0.6)
    }

    if (!arrivedRef.current && progress >= 1) {
      arrivedRef.current = true
      onArrive?.()
    }

    if (!finishedRef.current && progress >= 1) {
      finishedRef.current = true
      onComplete?.()
    }
  })

  return (
    <group>
      <mesh ref={meshRef} castShadow={false} receiveShadow={false}>
        <planeGeometry args={ticketSize} />
        <meshStandardMaterial
          color={ticketColor}
          emissive={new THREE.Color(ticketColor).multiplyScalar(0.1)}
          roughness={0.3}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
        <mesh position={[0, 0, -0.001]}>
          <planeGeometry args={ticketSize} />
          <meshStandardMaterial
            color={ticketBackColor}
            roughness={0.4}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      </mesh>
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.24, 24]} />
        <meshBasicMaterial
          color="#0f172a"
          transparent
          opacity={0.15}
        />
      </mesh>
    </group>
  )
}
