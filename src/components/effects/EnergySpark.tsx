import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export interface EnergySparkProps {
  position: [number, number, number]
  duration?: number
  color?: string
  onComplete?: () => void
}

export const EnergySpark: React.FC<EnergySparkProps> = ({
  position,
  duration = 0.55,
  color = '#38bdf8',
  onComplete
}) => {
  const pointsRef = useRef<THREE.Points>(null)
  const velocitiesRef = useRef<Array<{ velocity: THREE.Vector3; lifetime: number }>>([])
  const startTimeRef = useRef<number>(performance.now() / 1000)
  const completedRef = useRef(false)

  const pointMaterial = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: 0.16,
      transparent: true,
      opacity: 1,
      color: new THREE.Color(color),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    return mat
  }, [color])

  useEffect(() => {
    const count = 22
    const velocities: Array<{ velocity: THREE.Vector3; lifetime: number }> = []
    const randRange = (min: number, max: number) => min + Math.random() * (max - min)

    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position[0]
      positions[i * 3 + 1] = position[1]
      positions[i * 3 + 2] = position[2]

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(1))
      const speed = randRange(2.2, 3.4)
      const vx = Math.sin(phi) * Math.cos(theta) * speed
      const vy = Math.cos(phi) * speed * 1.2
      const vz = Math.sin(phi) * Math.sin(theta) * speed
      velocities.push({
        velocity: new THREE.Vector3(vx, vy, vz),
        lifetime: randRange(duration * 0.5, duration * 0.9)
      })
    }

    velocitiesRef.current = velocities

    if (pointsRef.current) {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      pointsRef.current.geometry = geometry
    }

    startTimeRef.current = performance.now() / 1000
  }, [position, duration])

  useEffect(() => {
    return () => {
      pointMaterial.dispose()
      if (pointsRef.current?.geometry) {
        pointsRef.current.geometry.dispose()
      }
    }
  }, [pointMaterial])

  useFrame(() => {
    const now = performance.now() / 1000
    const t = now - startTimeRef.current

    if (!pointsRef.current || !pointsRef.current.geometry) return

    const positions = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const velocities = velocitiesRef.current

    for (let i = 0; i < velocities.length; i++) {
      const velocityInfo = velocities[i]
      const life = Math.min(velocityInfo.lifetime, duration)
      const lifeRatio = Math.min(1, t / Math.max(life, 0.01))
      const drag = Math.pow(0.4, lifeRatio * 1.5)

      const dx = velocityInfo.velocity.x * lifeRatio * drag
      const dy = velocityInfo.velocity.y * lifeRatio * drag - 2.2 * lifeRatio * lifeRatio
      const dz = velocityInfo.velocity.z * lifeRatio * drag

      positions.setXYZ(i, position[0] + dx, position[1] + dy, position[2] + dz)
    }

    positions.needsUpdate = true

    const mat = pointsRef.current.material as THREE.PointsMaterial
    const fade = Math.max(0, 1 - (t / duration))
    mat.opacity = fade

    if (!completedRef.current && t >= duration) {
      completedRef.current = true
      onComplete?.()
    }
  })

  return <points ref={pointsRef} material={pointMaterial} frustumCulled={false} />
}
