import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

export interface VegetationProps {
  modelPath: string
  position?: [number, number, number]
  rotationY?: number
  scale?: number
  bottomColor?: string
  topColor?: string
  // Optional seed to vary gradient/scale
  seed?: number
  // Target diameter in world units to auto-fit model footprint
  fitDiameter?: number
  // Strength of gradient blend (0..1)
  gradientStrength?: number
}

// Small shader-based vertical gradient for MeshStandardMaterial
function applyVerticalGradient(
  material: THREE.MeshStandardMaterial,
  minY: number,
  maxY: number,
  bottom: THREE.Color,
  top: THREE.Color,
  strength: number
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMinY = { value: minY }
    shader.uniforms.uMaxY = { value: maxY }
    shader.uniforms.uBottom = { value: bottom }
    shader.uniforms.uTop = { value: top }
    shader.uniforms.uStrength = { value: strength }
    shader.vertexShader = `
varying float vY;
` + shader.vertexShader.replace(
      'void main() {',
      'void main() {\n  vY = position.y;'
    )
    shader.fragmentShader = `
varying float vY;
uniform float uMinY; 
uniform float uMaxY; 
uniform vec3 uBottom; 
uniform vec3 uTop;
uniform float uStrength;
` + shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
  float t = clamp((vY - uMinY) / max(0.0001, (uMaxY - uMinY)), 0.0, 1.0);
  vec3 grad = mix(uBottom, uTop, t);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, grad, clamp(uStrength, 0.0, 1.0));`
    )
  }
  material.needsUpdate = true
}

export const Vegetation: React.FC<VegetationProps> = ({
  modelPath,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  bottomColor,
  topColor,
  seed = 0,
  fitDiameter = 0.8,
  gradientStrength = 0.85,
}) => {
  let gltf: any
  try {
    gltf = useGLTF(modelPath)
  } catch (error) {
    console.error(`❌ Failed to load vegetation model: ${modelPath}`, error)
    // Return a simple fallback tree
    return (
      <group position={[position[0], (position?.[1] ?? 0) + 0.11, position[2]]} rotation={[0, rotationY, 0]} scale={[scale * 0.3, scale * 0.3, scale * 0.3]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.3]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.15, 8, 6]} />
          <meshStandardMaterial color="#228B22" />
        </mesh>
      </group>
    )
  }

  const { scene, scaleFit } = useMemo(() => {
    if (!gltf || !gltf.scene) {
      console.error(`❌ GLTF scene not available for: ${modelPath}`)
      // Return a simple fallback tree
      const fallbackGroup = new THREE.Group()
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.3),
        new THREE.MeshStandardMaterial({ color: '#8B4513' })
      )
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#228B22' })
      )
      leaves.position.y = 0.2
      fallbackGroup.add(trunk)
      fallbackGroup.add(leaves)
      return { scene: fallbackGroup, scaleFit: 0.3 }
    }
    const root: THREE.Object3D = gltf.scene.clone(true)
    // Compute bounds for gradient
    const bbox = new THREE.Box3().setFromObject(root)
    const minY = bbox.min.y
    const maxY = bbox.max.y
    // Choose gradient palette
    const palettes: Array<{ bottom: THREE.Color; top: THREE.Color }> = (() => {
      const make = (b: string, t: string) => ({ bottom: new THREE.Color(b), top: new THREE.Color(t) })
      return [
        make('#1b5e20', '#66bb6a'),
        make('#2e7d32', '#81c784'),
        make('#33691e', '#9ccc65'),
        make('#2f6f3e', '#7fc98a'),
        make('#245a2f', '#6fbf73')
      ]
    })()
    const pick = (n: number) => palettes[Math.abs(n) % palettes.length]
    const chosen = bottomColor && topColor
      ? { bottom: new THREE.Color(bottomColor), top: new THREE.Color(topColor) }
      : pick(seed + Math.floor((bbox.max.x - bbox.min.x) * 10))
    const bottom = chosen.bottom
    const top = chosen.top

    root.traverse((obj: any) => {
      if (obj && obj.isMesh) {
        // Ensure standard material for consistent shading
        if (!(obj.material instanceof THREE.MeshStandardMaterial)) {
          obj.material = new THREE.MeshStandardMaterial({ color: obj.material?.color || 0xffffff })
        }
        applyVerticalGradient(
          obj.material as THREE.MeshStandardMaterial,
          minY,
          maxY,
          bottom,
          top,
          gradientStrength
        )
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
    // Center on ground
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    bbox.getSize(size)
    bbox.getCenter(center)
    const group = new THREE.Group()
    const obj = root.clone(true)
    obj.position.set(-center.x, -(center.y - size.y / 2), -center.z)
    group.add(obj)

    // Auto-fit to tile diameter (~1.6) so trees are visible but not oversized
    const maxXZ = Math.max(size.x, size.z) || 1
    const targetDiameter = fitDiameter
    const scaleFit = targetDiameter / maxXZ

    return { scene: group, scaleFit }
  }, [gltf, bottomColor, topColor, seed, fitDiameter, gradientStrength])

  return (
    <group position={[position[0], (position?.[1] ?? 0) + 0.11, position[2]]} rotation={[0, rotationY, 0]} scale={[scale * scaleFit, scale * scaleFit, scale * scaleFit]}>
      <primitive object={scene} />
    </group>
  )
}

// Preload tree models with error handling
try {
  useGLTF.preload('/models/Tree_1.glb')
  useGLTF.preload('/models/Tree_2.glb')
  useGLTF.preload('/models/Tree_3.glb')
  useGLTF.preload('/models/Tree_4.glb')
  useGLTF.preload('/models/Tree_5.glb')
  useGLTF.preload('/models/Tree_6.glb')
  useGLTF.preload('/models/Tree_7.glb')
} catch (error) {
  console.error('❌ Failed to preload tree models:', error)
}


