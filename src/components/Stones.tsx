import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

export interface StonesProps {
  modelPath?: string // Теперь опциональный, так как можем рендерить несколько камней
  position?: [number, number, number]
  rotationY?: number
  scale?: number
  // Optional seed to vary scale and rotation
  seed?: number
  // Target diameter in world units to auto-fit model footprint
  fitDiameter?: number
  // Color tint for the stone
  colorTint?: string
  // Strength of color tint (0..1)
  tintStrength?: number
  // Количество камней в кластере (1-5)
  stoneCount?: number
}

// Apply color tint to stone material
function applyColorTint(
  material: THREE.MeshStandardMaterial,
  tintColor: THREE.Color,
  strength: number
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTintColor = { value: tintColor }
    shader.uniforms.uTintStrength = { value: strength }
    shader.fragmentShader = `
uniform vec3 uTintColor;
uniform float uTintStrength;
` + shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
  gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * uTintColor, clamp(uTintStrength, 0.0, 1.0));`
    )
  }
  material.needsUpdate = true
}

// Компонент для отдельного камня
const SingleStone: React.FC<{
  modelPath: string
  position: [number, number, number]
  rotationY: number
  scale: number
  seed: number
  fitDiameter: number
  colorTint?: string
  tintStrength: number
}> = ({ modelPath, position, rotationY, scale, seed, fitDiameter, colorTint, tintStrength }) => {
  let gltf: any
  try {
    gltf = useGLTF(modelPath)
  } catch (error) {
    console.error(`❌ Failed to load stone model: ${modelPath}`, error)
    // Return a simple fallback stone (rounded voxel style)
    return (
      <group position={position} rotation={[0, rotationY, 0]} scale={[scale * 0.3, scale * 0.3, scale * 0.3]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.4, 0.6]} />
          <meshStandardMaterial 
            color="#8B7D6B" 
            metalness={0.1}
            roughness={0.8}
          />
        </mesh>
      </group>
    )
  }

  const { scene, scaleFit, finalRotation } = useMemo(() => {
    if (!gltf || !gltf.scene) {
      console.error(`❌ GLTF scene not available for: ${modelPath}`)
      // Return a simple fallback stone
      const fallbackGroup = new THREE.Group()
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.4, 0.6),
        new THREE.MeshStandardMaterial({ 
          color: '#8B7D6B',
          metalness: 0.1,
          roughness: 0.8
        })
      )
      fallbackGroup.add(stone)
      return { scene: fallbackGroup, scaleFit: 0.3, finalRotation: rotationY }
    }

    const root: THREE.Object3D = gltf.scene.clone(true)
    
    // Apply stone-specific styling
    root.traverse((obj: any) => {
      if (obj && obj.isMesh) {
        // Ensure standard material for consistent shading
        if (!(obj.material instanceof THREE.MeshStandardMaterial)) {
          obj.material = new THREE.MeshStandardMaterial({ 
            color: obj.material?.color || '#8B7D6B',
            metalness: 0.1,
            roughness: 0.8
          })
        }
        
        // Apply color tint if specified
        if (colorTint) {
          applyColorTint(
            obj.material as THREE.MeshStandardMaterial,
            new THREE.Color(colorTint),
            tintStrength
          )
        }
        
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })

    // Center on ground
    const bbox = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    bbox.getSize(size)
    bbox.getCenter(center)
    
    const group = new THREE.Group()
    const obj = root.clone(true)
    obj.position.set(-center.x, -(center.y - size.y / 2), -center.z)
    group.add(obj)

    // Auto-fit to tile diameter
    const maxXZ = Math.max(size.x, size.z) || 1
    const targetDiameter = fitDiameter
    const scaleFit = targetDiameter / maxXZ

    // Add random rotation variation based on seed
    const randomRotation = (seed * 137.5) % (Math.PI * 2)
    const finalRotation = rotationY + randomRotation

    return { scene: group, scaleFit, finalRotation }
  }, [gltf, colorTint, tintStrength, fitDiameter, rotationY, seed])

  // Add slight size variation based on seed for natural look
  const sizeVariation = 0.8 + ((seed * 1.618) % 0.4) // 0.8 to 1.2
  const finalScale = scale * scaleFit * sizeVariation

  return (
    <group 
      position={position} 
      rotation={[0, finalRotation, 0]} 
      scale={[finalScale, finalScale, finalScale]}
    >
      <primitive object={scene} />
    </group>
  )
}

// Основной компонент для кластера камней
export const Stones: React.FC<StonesProps> = ({
  modelPath,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  seed = 0,
  fitDiameter = 0.3,
  colorTint,
  tintStrength = 0.2,
  stoneCount = 1,
}) => {
  // Генерируем позиции камней в кластере
  const stonePositions = useMemo(() => {
    const positions: Array<{
      modelPath: string
      position: [number, number, number]
      rotationY: number
      scale: number
      seed: number
    }> = []

    // Детерминированная функция для генерации псевдо-случайных чисел
    const deterministicRandom = (seed: number) => {
      let x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }

    // Генерируем кластер камней
    for (let i = 0; i < stoneCount; i++) {
      const stoneSeed = seed + i * 1000
      
      // Выбираем случайную модель камня
      const modelIndex = Math.floor(deterministicRandom(stoneSeed) * 8)
      const selectedModelPath = `/models/stones/stone_${String(modelIndex + 1).padStart(2, '0')}.glb`
      
      // Генерируем позицию в кластере (компактное пятно)
      const clusterRadius = 0.3 + deterministicRandom(stoneSeed + 1) * 0.2 // 0.3-0.5
      const angle = deterministicRandom(stoneSeed + 2) * Math.PI * 2
      const distance = deterministicRandom(stoneSeed + 3) * clusterRadius
      
      const x = Math.cos(angle) * distance
      const z = Math.sin(angle) * distance
      
      // Случайный поворот
      const rotation = deterministicRandom(stoneSeed + 4) * Math.PI * 2
      
      // Случайный масштаб (0.8-1.3)
      const stoneScale = 0.8 + deterministicRandom(stoneSeed + 5) * 0.5
      
      positions.push({
        modelPath: selectedModelPath,
        position: [x, 0, z],
        rotationY: rotation,
        scale: stoneScale,
        seed: stoneSeed
      })
    }

    return positions
  }, [seed, stoneCount])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {stonePositions.map((stone, index) => (
        <SingleStone
          key={index}
          modelPath={stone.modelPath}
          position={stone.position}
          rotationY={stone.rotationY}
          scale={stone.scale}
          seed={stone.seed}
          fitDiameter={fitDiameter}
          colorTint={colorTint}
          tintStrength={tintStrength}
        />
      ))}
    </group>
  )
}

// Preload stone models with error handling
try {
  useGLTF.preload('/models/stones/stone_01.glb')
  useGLTF.preload('/models/stones/stone_02.glb')
  useGLTF.preload('/models/stones/stone_03.glb')
  useGLTF.preload('/models/stones/stone_04.glb')
  useGLTF.preload('/models/stones/stone_05.glb')
  useGLTF.preload('/models/stones/stone_06.glb')
  useGLTF.preload('/models/stones/stone_07.glb')
  useGLTF.preload('/models/stones/stone_08.glb')
} catch (error) {
  console.error('❌ Failed to preload stone models:', error)
}

// Utility function to get random stone model path
export function getRandomStoneModel(seed: number = 0): string {
  const stoneModels = [
    '/models/stones/stone_01.glb',
    '/models/stones/stone_02.glb',
    '/models/stones/stone_03.glb',
    '/models/stones/stone_04.glb',
    '/models/stones/stone_05.glb',
    '/models/stones/stone_06.glb',
    '/models/stones/stone_07.glb',
    '/models/stones/stone_08.glb',
  ]
  
  const index = Math.abs(seed) % stoneModels.length
  return stoneModels[index]
}

// Utility function to get stone color tint based on zone
export function getStoneColorTint(zoneColor: string): string {
  // Convert zone color to a complementary stone color
  const colorMap: { [key: string]: string } = {
    '#FF6B6B': '#8B7D6B', // Red zone -> Brown stone
    '#4ECDC4': '#6B7D8B', // Teal zone -> Blue-gray stone
    '#45B7D1': '#7D8B6B', // Blue zone -> Green-gray stone
    '#96CEB4': '#8B6B7D', // Green zone -> Purple-gray stone
    '#FFEAA7': '#7D6B8B', // Yellow zone -> Purple stone
    '#DDA0DD': '#6B8B7D', // Plum zone -> Green stone
    '#98D8C8': '#8B7D6B', // Mint zone -> Brown stone
    '#F7DC6F': '#7D8B6B', // Gold zone -> Green stone
  }
  
  return colorMap[zoneColor] || '#8B7D6B' // Default brown stone
}
