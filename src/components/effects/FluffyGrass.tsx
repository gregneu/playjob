import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface FluffyGrassProps {
  center?: [number, number, number]
  radius?: number
  density?: number
  height?: number
}

function createBladeAlphaTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1)
      const v = y / (size - 1)
      const dx = Math.abs(u - 0.5)
      const base = 0.16
      const tip = 0.035
      const thickness = base + (tip - base) * v
      // edge0 must be <= edge1, otherwise the result collapses to 0
      const val = THREE.MathUtils.smoothstep(thickness - 0.03, thickness, dx)
      const i = (y * size + x) * 4
      const g = Math.max(0, Math.min(1, val)) * 255
      data[i] = g; data[i + 1] = g; data[i + 2] = g; data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size)
  tex.needsUpdate = true
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipMapLinearFilter
  return tex
}

function createNoiseTexture(size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(Math.random() * 255)
    data[i * 4] = v
    data[i * 4 + 1] = v
    data[i * 4 + 2] = v
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, size, size)
  tex.needsUpdate = true
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipMapLinearFilter
  return tex
}

export const FluffyGrass: React.FC<FluffyGrassProps> = ({
  center = [0, 0.06, 0],
  radius = 0.85,
  density = 700,
  height = 0.18,
}) => {
  const instRefA = useRef<THREE.InstancedMesh>(null)
  const instRefB = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const bladeAlpha = useMemo(() => createBladeAlphaTexture(128), [])
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8fcf8f'),
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
      alphaMap: bladeAlpha
    }) as THREE.MeshStandardMaterial & { vertexColors?: boolean }
    mat.vertexColors = true
    return mat
  }, [bladeAlpha])

  const points = useMemo(() => {
    const pts: { x: number; z: number; rot: number; h: number; color: THREE.Color }[] = []
    const total = Math.max(2000, density * 3)
    const base = new THREE.Color('#79c87a')
    const c1 = new THREE.Color('#a6e3a1')
    for (let i = 0; i < total; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * radius
      const h = THREE.MathUtils.lerp(0.85, 1.5, Math.random())
      const mix = Math.random()
      const color = base.clone().lerp(c1, mix * 0.5)
      pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, rot: Math.random() * Math.PI * 2, h, color })
    }
    return pts
  }, [radius, density])

  React.useEffect(() => {
    if (!instRefA.current || !instRefB.current) return
    const color = new THREE.Color()
    points.forEach((p, i) => {
      // A: original orientation
      dummy.position.set(center[0] + p.x, center[1] + (height * p.h) / 2, center[2] + p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.set(0.06, height * p.h, 1)
      dummy.updateMatrix()
      instRefA.current!.setMatrixAt(i, dummy.matrix)
      instRefA.current!.setColorAt(i, color.copy(p.color))
      // B: crossed at 90 degrees
      dummy.rotation.set(0, p.rot + Math.PI / 2, 0)
      dummy.updateMatrix()
      instRefB.current!.setMatrixAt(i, dummy.matrix)
      instRefB.current!.setColorAt(i, color.copy(p.color))
    })
    instRefA.current.instanceMatrix.needsUpdate = true
    instRefB.current.instanceMatrix.needsUpdate = true
    if (instRefA.current.instanceColor) instRefA.current.instanceColor.needsUpdate = true
    if (instRefB.current.instanceColor) instRefB.current.instanceColor.needsUpdate = true
  }, [points, dummy, center, height])

  const clock = useRef({ t: 0 })
  useFrame((_s, d) => { clock.current.t += d })

  return (
    <group position={[0, 0.001, 0]}>
      <instancedMesh ref={instRefA} args={[undefined as any, undefined as any, points.length]} castShadow={false} receiveShadow={false} renderOrder={10} frustumCulled={false}>
        <planeGeometry args={[0.12, 1, 1, 1]} />
        <primitive object={material} attach="material" />
      </instancedMesh>
      <instancedMesh ref={instRefB} args={[undefined as any, undefined as any, points.length]} castShadow={false} receiveShadow={false} renderOrder={10} frustumCulled={false}>
        <planeGeometry args={[0.12, 1, 1, 1]} />
        <primitive object={material.clone()} attach="material" />
      </instancedMesh>
    </group>
  )
}


