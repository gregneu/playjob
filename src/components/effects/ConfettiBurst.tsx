import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export interface ConfettiBurstProps {
  position: [number, number, number]
  duration?: number
  particleCount?: number
  palette?: string[]
  swirlRadius?: number
  liftHeight?: number
  onComplete?: () => void
}

interface ParticleSeed {
  angle: number
  radius: number
  speed: number
  elevation: number
  spin: number
  delay: number
}

const defaultPalette = ['#facc15', '#fde68a', '#fbbf24', '#fb7185', '#38bdf8']

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  position,
  duration = 2,
  particleCount = 46,
  palette = defaultPalette,
  swirlRadius = 0.8,
  liftHeight = 1.6,
  onComplete
}) => {
  const geometryRef = useRef(new THREE.BufferGeometry())
  const materialRef = useRef<THREE.ShaderMaterial>()
  const startTimeRef = useRef<number>(performance.now() / 1000)
  const doneRef = useRef(false)

  const positions = useMemo(() => new Float32Array(particleCount * 3), [particleCount])
  const colors = useMemo(() => new Float32Array(particleCount * 3), [particleCount])

  const seeds = useMemo<ParticleSeed[]>(() => {
    const list: ParticleSeed[] = []
    for (let i = 0; i < particleCount; i++) {
      list.push({
        angle: Math.random() * Math.PI * 2,
        radius: swirlRadius * (0.2 + Math.random() * 0.8),
        speed: 0.6 + Math.random() * 0.9,
        elevation: liftHeight * (0.4 + Math.random() * 0.8),
        spin: 3 + Math.random() * 6,
        delay: Math.random() * 0.25
      })
    }
    return list
  }, [particleCount, swirlRadius, liftHeight])

  useEffect(() => {
    const geometry = geometryRef.current
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return () => {
      geometry.dispose()
    }
  }, [positions, colors])

  const basePosition = useMemo(() => new THREE.Vector3(...position), [position])
  const tempVec = useMemo(() => new THREE.Vector3(), [])

  const vertexShader = useMemo(() => /* glsl */ `
    attribute vec3 color;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      float size = 12.0;
      size *= clamp(1.0 / max(0.1, -mvPosition.z), 0.6, 3.0);
      gl_PointSize = size;
    }
  `, [])

  const fragmentShader = useMemo(() => /* glsl */ `
    uniform float uOpacity;
    varying vec3 vColor;
    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      float dist = dot(uv, uv);
      if (dist > 1.0) discard;
      float soft = smoothstep(1.0, 0.4, dist);
      gl_FragColor = vec4(vColor, soft * uOpacity);
    }
  `, [])

  useEffect(() => {
    const colorsAttr = geometryRef.current.getAttribute('color') as THREE.BufferAttribute | null
    if (!colorsAttr) return
    for (let i = 0; i < particleCount; i++) {
      const colorHex = palette[i % palette.length]
      const color = new THREE.Color(colorHex)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    colorsAttr.needsUpdate = true
  }, [colors, palette, particleCount])

  useEffect(() => {
    startTimeRef.current = performance.now() / 1000
    doneRef.current = false
  }, [basePosition])

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime()
    const elapsed = now - startTimeRef.current
    if (elapsed < 0) return

    const progress = Math.min(1, elapsed / duration)
    const opacity = elapsed > duration ? Math.max(0, 1 - (elapsed - duration) / 0.35) : 1

    materialRef.current?.uniforms.uOpacity && (materialRef.current.uniforms.uOpacity.value = opacity)

    const positionsAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute | null
    if (!positionsAttr) return

    for (let i = 0; i < particleCount; i++) {
      const seed = seeds[i]
      const timeSinceStart = Math.max(0, elapsed - seed.delay)
      const localProgress = Math.min(1, timeSinceStart / duration)
      const swirl = seed.spin * timeSinceStart
      const radial = seed.radius * (0.6 + localProgress * 0.8)
      const fade = 1 - localProgress

      tempVec.copy(basePosition)
      tempVec.x += Math.cos(seed.angle + swirl) * radial * fade
      tempVec.z += Math.sin(seed.angle + swirl) * radial * fade
      tempVec.y += (seed.elevation * localProgress) + Math.sin(swirl * 0.6) * 0.12

      positions[i * 3] = tempVec.x
      positions[i * 3 + 1] = tempVec.y
      positions[i * 3 + 2] = tempVec.z
    }

    positionsAttr.needsUpdate = true

    if (!doneRef.current && elapsed > duration + 0.45) {
      doneRef.current = true
      onComplete?.()
    }
  })

  useEffect(() => {
    return () => {
      materialRef.current?.dispose()
    }
  }, [])

  return (
    <points
      geometry={geometryRef.current}
      frustumCulled={false}
      renderOrder={4}
    >
      <shaderMaterial
        ref={(mat) => {
          if (mat) {
            materialRef.current = mat
            mat.uniforms = { uOpacity: { value: 1 } }
            mat.vertexShader = vertexShader
            mat.fragmentShader = fragmentShader
            mat.transparent = true
            mat.depthWrite = false
            mat.blending = THREE.AdditiveBlending
          }
        }}
      />
    </points>
  )
}
