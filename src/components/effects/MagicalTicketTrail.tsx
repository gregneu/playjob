import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export interface MagicalTicketTrailProps {
  start: [number, number, number]
  end: [number, number, number]
  particleColor?: string
  headColor?: string
  duration?: number
  particleCount?: number
  swirlRadius?: number
  flowSpeed?: number
  onComplete?: () => void
}

interface ParticleSeed {
  offset: number
  angle: number
  radius: number
  swirlFactor: number
  lift: number
}

const defaultColor = '#facc15'

export const MagicalTicketTrail: React.FC<MagicalTicketTrailProps> = ({
  start,
  end,
  particleColor = defaultColor,
  headColor,
  duration = 1.3,
  particleCount = 52,
  swirlRadius = 0.32,
  flowSpeed = 1.4,
  onComplete
}) => {
  const geometryRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry())
  const materialRef = useRef<THREE.PointsMaterial>()
  const headMeshRef = useRef<THREE.Mesh>(null)
  const headLightRef = useRef<THREE.PointLight>(null)
  const startTimeRef = useRef<number>(performance.now() / 1000)
  const finishedRef = useRef(false)

  const positions = useMemo(() => new Float32Array(particleCount * 3), [particleCount])
  const seeds = useMemo<ParticleSeed[]>(() => {
    const list: ParticleSeed[] = []
    for (let i = 0; i < particleCount; i++) {
      list.push({
        offset: Math.random(),
        angle: Math.random() * Math.PI * 2,
        radius: swirlRadius * (0.65 + Math.random() * 0.55),
        swirlFactor: 6 + Math.random() * 4,
        lift: Math.random() * 0.1
      })
    }
    return list
  }, [particleCount, swirlRadius])

  const startVec = useMemo(() => new THREE.Vector3(...start), [start])
  const endVec = useMemo(() => new THREE.Vector3(...end), [end])
  const direction = useMemo(() => endVec.clone().sub(startVec), [endVec, startVec])
  const length = useMemo(() => direction.length(), [direction])
  const forward = useMemo(() => {
    const dir = direction.clone()
    if (dir.lengthSq() === 0) return new THREE.Vector3(0, 0, 0)
    return dir.normalize()
  }, [direction])
  const swirlBasis = useMemo(() => {
    if (forward.lengthSq() === 0) {
      return {
        right: new THREE.Vector3(1, 0, 0),
        binormal: new THREE.Vector3(0, 0, 1)
      }
    }
    const up = Math.abs(forward.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(up, forward).normalize()
    if (right.lengthSq() === 0) {
      return {
        right: new THREE.Vector3(1, 0, 0),
        binormal: new THREE.Vector3(0, 0, 1)
      }
    }
    const binormal = new THREE.Vector3().crossVectors(forward, right).normalize()
    return { right, binormal }
  }, [forward])

  const tempVec = useMemo(() => new THREE.Vector3(), [])
  const tempOffset = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const geometry = geometryRef.current
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return () => {
      geometry.dispose()
    }
  }, [positions])

  useEffect(() => {
    startTimeRef.current = performance.now() / 1000
    finishedRef.current = false
  }, [startVec, endVec])

  useFrame(({ clock }) => {
    const geometry = geometryRef.current
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    if (!attr) return

    const now = clock.getElapsedTime()
    const elapsed = now - startTimeRef.current
    const fade = Math.min(1, elapsed / (duration * 0.3))
    const opacity = elapsed >= duration ? Math.max(0, 1 - (elapsed - duration) / 0.3) : 1

    if (materialRef.current) {
      materialRef.current.opacity = opacity
      materialRef.current.color.set(particleColor)
    }

    const headProgress = (elapsed * flowSpeed) % 1
    tempVec.copy(startVec).addScaledVector(forward, headProgress * length)
    if (headMeshRef.current) {
      headMeshRef.current.visible = opacity > 0.05
      headMeshRef.current.position.copy(tempVec)
      headMeshRef.current.scale.setScalar(0.16 + Math.sin(elapsed * 6) * 0.03)
    }
    if (headLightRef.current) {
      headLightRef.current.intensity = 1.1 * opacity
      headLightRef.current.position.copy(tempVec)
    }

    for (let i = 0; i < particleCount; i++) {
      const seed = seeds[i]
      const progress = (seed.offset + elapsed * flowSpeed) % 1
      const base = tempVec.copy(startVec).addScaledVector(forward, progress * length)
      const swirlAngle = elapsed * seed.swirlFactor * 4 + seed.angle + progress * (seed.swirlFactor * 1.6)
      const radial = seed.radius * THREE.MathUtils.lerp(0.25, 1, fade)

      tempOffset.copy(swirlBasis.right).multiplyScalar(Math.cos(swirlAngle) * radial)
      tempOffset.addScaledVector(swirlBasis.binormal, Math.sin(swirlAngle) * radial)
      tempOffset.y += Math.sin(progress * Math.PI * 2 + seed.angle) * seed.lift

      base.add(tempOffset)

      positions[i * 3] = base.x
      positions[i * 3 + 1] = base.y
      positions[i * 3 + 2] = base.z
    }

    attr.needsUpdate = true

    if (!finishedRef.current && elapsed > duration + 0.45) {
      finishedRef.current = true
      onComplete?.()
    }
  })

  useEffect(() => {
    return () => {
      materialRef.current?.dispose()
    }
  }, [])

  const headColorFinal = headColor ?? particleColor

  return (
    <group>
      <points
        geometry={geometryRef.current}
        frustumCulled={false}
        renderOrder={3}
      >
        <pointsMaterial
          ref={(mat) => {
            if (mat) {
              materialRef.current = mat
              mat.color = new THREE.Color(particleColor)
              mat.transparent = true
              mat.opacity = 1
              mat.depthWrite = false
              mat.size = 0.18
              mat.sizeAttenuation = true
              mat.blending = THREE.AdditiveBlending
            }
          }}
        />
      </points>
      <mesh ref={headMeshRef} frustumCulled={false}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(headColorFinal)}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        ref={headLightRef}
        color={new THREE.Color(headColorFinal)}
        intensity={1.1}
        distance={4}
        decay={2.5}
      />
    </group>
  )
}
