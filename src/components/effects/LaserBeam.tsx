import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export interface LaserBeamProps {
  /** beam start position in world coordinates */
  start: [number, number, number]
  /** beam end position in world coordinates */
  end: [number, number, number]
  /** duration of the full animation in seconds */
  duration?: number
  /** time in seconds used to grow the beam from source to destination */
  growDuration?: number
  /** beam width (world units) */
  width?: number
  /** optional color stops for gradient start/mid/end */
  colors?: {
    start: string
    middle: string
    end: string
  }
  /** called once the beam fully faded */
  onComplete?: () => void
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform vec3 uColorStart;
  uniform vec3 uColorMiddle;
  uniform vec3 uColorEnd;
  uniform float uProgress;
  uniform float uOpacity;
  uniform float uTime;

  varying vec2 vUv;

  void main() {
    // Laser visible only up to the animated leading edge
    float visible = step(vUv.y, uProgress);

    // Soft fade in/out along the beam
    float fadeHead = smoothstep(0.0, 0.15, vUv.y);
    float fadeTail = 1.0 - smoothstep(uProgress - 0.12, uProgress, vUv.y);

    // Thin beam core mask (radial falloff)
    float radial = smoothstep(0.0, 0.4, 1.0 - abs(vUv.x - 0.5) * 2.0);

    // Animated energy pulse
    float pulse = 0.6 + 0.4 * sin((vUv.y * 10.0) - uTime * 16.0);

    vec3 color = mix(uColorStart, uColorMiddle, smoothstep(0.0, 0.6, vUv.y));
    color = mix(color, uColorEnd, smoothstep(0.4, 1.0, vUv.y));

    float alpha = visible * fadeHead * fadeTail * radial * pulse * uOpacity;

    if (alpha <= 0.001) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);
  }
`

export const LaserBeam: React.FC<LaserBeamProps> = ({
  start,
  end,
  duration = 1.35,
  growDuration = 0.28,
  width = 0.22,
  colors = {
    start: '#38bdf8',
    middle: '#0ea5e9',
    end: '#22d3ee'
  },
  onComplete
}) => {
  const beamRef = useRef<THREE.Mesh>(null)
  const uniformsRef = useRef<{
    uColorStart: { value: THREE.Color }
    uColorMiddle: { value: THREE.Color }
    uColorEnd: { value: THREE.Color }
    uProgress: { value: number }
    uOpacity: { value: number }
    uTime: { value: number }
  }>()
  const startTimeRef = useRef<number>(performance.now() / 1000)
  const hasCompletedRef = useRef(false)

  const startVec = useMemo(() => new THREE.Vector3(...start), [start])
  const endVec = useMemo(() => new THREE.Vector3(...end), [end])
  const direction = useMemo(() => endVec.clone().sub(startVec), [endVec, startVec])
  const length = useMemo(() => direction.length(), [direction])
  const center = useMemo(() => startVec.clone().add(endVec).multiplyScalar(0.5), [endVec, startVec])
  const orientation = useMemo(() => {
    const dir = direction.clone().normalize()
    if (dir.lengthSq() === 0) {
      return new THREE.Quaternion()
    }
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  }, [direction])

  const material = useMemo(() => {
    const uniforms = {
      uColorStart: { value: new THREE.Color(colors.start) },
      uColorMiddle: { value: new THREE.Color(colors.middle) },
      uColorEnd: { value: new THREE.Color(colors.end) },
      uProgress: { value: 0 },
      uOpacity: { value: 1 },
      uTime: { value: 0 }
    }
    uniformsRef.current = uniforms
    const shader = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
    return shader
  }, [colors.end, colors.middle, colors.start])

  useEffect(() => {
    startTimeRef.current = performance.now() / 1000
    hasCompletedRef.current = false
    if (uniformsRef.current) {
      uniformsRef.current.uProgress.value = 0
      uniformsRef.current.uOpacity.value = 1
    }
  }, [startVec, endVec])

  useFrame(() => {
    const now = performance.now() / 1000
    const elapsed = now - startTimeRef.current
    const uniforms = uniformsRef.current
    if (!beamRef.current || !uniforms) return

    const progress = Math.min(1, elapsed / Math.max(0.01, growDuration))
    uniforms.uProgress.value = progress
    uniforms.uTime.value = elapsed

    const fadeStart = duration - 0.35
    if (elapsed >= fadeStart) {
      const fade = Math.max(0, 1 - (elapsed - fadeStart) / 0.35)
      uniforms.uOpacity.value = fade
    }

    if (!hasCompletedRef.current && elapsed >= duration) {
      hasCompletedRef.current = true
      onComplete?.()
    }
  })

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  useEffect(() => {
    if (!beamRef.current) return
    beamRef.current.scale.set(width, length, width)
    beamRef.current.frustumCulled = false
  }, [length, width])

  const outerMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors.middle),
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
    return mat
  }, [colors.middle])

  useEffect(() => {
    return () => {
      outerMaterial.dispose()
    }
  }, [outerMaterial])

  return (
    <group position={center.toArray()} quaternion={orientation}>
      <mesh ref={beamRef} material={material}>
        <cylinderGeometry args={[0.5, 0.5, 1, 32, 1, true]} />
      </mesh>
      {/* Soft outer glow */}
      <mesh
        scale={[width * 1.6, length, width * 1.6]}
        material={outerMaterial}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.55, 0.55, 1, 24, 1, true]} />
      </mesh>
    </group>
  )
}
