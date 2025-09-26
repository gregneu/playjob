import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useWind } from './WindSystem'

export interface TreesProps {
  modelPath?: string // Теперь опциональный, так как можем рендерить несколько деревьев
  position?: [number, number, number]
  rotationY?: number
  scale?: number
  // Optional seed to vary scale and rotation
  seed?: number
  // Target diameter in world units to auto-fit model footprint
  fitDiameter?: number
  // Color tint for the tree
  colorTint?: string
  // Strength of color tint (0..1)
  tintStrength?: number
  // Количество деревьев в кластере (1-5)
  treeCount?: number
}

// Apply color tint to tree material
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

// Компонент для отдельного дерева
const SingleTree: React.FC<{
  modelPath: string
  position: [number, number, number]
  rotationY: number
  scale: number
  seed: number
  fitDiameter: number
  colorTint?: string
  tintStrength: number
  treeId: string
}> = ({ modelPath, position, rotationY, scale, seed, fitDiameter, colorTint, tintStrength, treeId }) => {
  const groupRef = useRef<THREE.Group>(null)
  const { getWindOffset } = useWind()
  
  // Определяем тип дерева по имени модели
  const getTreeType = (modelPath: string): 'conifer' | 'deciduous' | 'shrub' => {
    const modelName = modelPath.toLowerCase()
    if (modelName.includes('conifer') || modelName.includes('pine') || modelName.includes('spruce')) {
      return 'conifer'
    } else if (modelName.includes('shrub') || modelName.includes('bush')) {
      return 'shrub'
    }
    return 'deciduous' // По умолчанию лиственное
  }

  const treeType = getTreeType(modelPath)

  // Анимация ветра с реалистичной физикой
  const targetRotation = useRef(0)
  const currentRotation = useRef(0)
  const velocity = useRef(0) // Скорость изменения поворота
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Ограничиваем delta для предотвращения скачков при переключении табов
      const clampedDelta = Math.min(delta, 1/30) // Максимум 1/30 секунды (30 FPS)
      
      const windOffset = getWindOffset(treeId, treeType)
      const newTargetRotation = windOffset * 0.3
      
      // Обновляем целевую позицию
      targetRotation.current = newTargetRotation
      
      // Физически реалистичная анимация с пружиной
      const springForce = 8.0 // Сила пружины (скорость возврата)
      const damping = 0.8 // Затухание (сопротивление)
      
      // Вычисляем силу пружины
      const spring = (targetRotation.current - currentRotation.current) * springForce
      
      // Применяем затухание к скорости
      velocity.current *= damping
      
      // Добавляем силу пружины к скорости
      velocity.current += spring * clampedDelta
      
      // Обновляем позицию
      currentRotation.current += velocity.current * clampedDelta
      
      // Применяем плавный поворот
      groupRef.current.rotation.z = currentRotation.current
    }
  })

  let gltf: any
  try {
    gltf = useGLTF(modelPath)
  } catch (error) {
    console.error(`❌ Failed to load tree model: ${modelPath}`, error)
    // Return a simple fallback tree
    return (
      <group ref={groupRef} position={position} rotation={[0, rotationY, 0]} scale={[scale * 0.3, scale * 0.3, scale * 0.3]}>
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

  const { scene, scaleFit, finalRotation } = useMemo(() => {
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
      return { scene: fallbackGroup, scaleFit: 0.3, finalRotation: rotationY }
    }

    const root: THREE.Object3D = gltf.scene.clone(true)
    
    // Apply tree-specific styling
    root.traverse((obj: any) => {
      if (obj && obj.isMesh) {
        // Ensure standard material for consistent shading
        if (!(obj.material instanceof THREE.MeshStandardMaterial)) {
          obj.material = new THREE.MeshStandardMaterial({ 
            color: obj.material?.color || '#228B22',
            metalness: 0.0,
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
  const sizeVariation = 1.0 + ((seed * 1.618) % 0.4) // 1.0 to 1.4
  const finalScale = scale * scaleFit * sizeVariation

  return (
    <group 
      ref={groupRef}
      position={position} 
      rotation={[0, finalRotation, 0]} 
      scale={[finalScale, finalScale, finalScale]}
    >
      <primitive object={scene} />
    </group>
  )
}

// Основной компонент для кластера деревьев
export const Trees: React.FC<TreesProps> = ({
  modelPath,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  seed = 0,
  fitDiameter = 1.0,
  colorTint,
  tintStrength = 0.3,
  treeCount = 1,
}) => {
  // Генерируем позиции деревьев с учетом правил размещения
  const treePositions = useMemo(() => {
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

    // Функция для проверки минимальной дистанции
    const isPositionValid = (newPos: [number, number, number], existingPositions: Array<[number, number, number]>, minDistance: number) => {
      for (const existingPos of existingPositions) {
        const distance = Math.sqrt(
          Math.pow(newPos[0] - existingPos[0], 2) + 
          Math.pow(newPos[2] - existingPos[2], 2)
        )
        if (distance < minDistance) {
          return false
        }
      }
      return true
    }

    // Функция для генерации валидной позиции
    const generateValidPosition = (treeSeed: number, existingPositions: Array<[number, number, number]>, treeScale: number) => {
      const minDistance = 0.6 + treeScale * 0.3 // Минимальная дистанция зависит от размера дерева
      const maxAttempts = 20
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Генерируем позицию в пределах гекса (радиус ~0.8)
        const hexRadius = 0.8
        const angle = deterministicRandom(treeSeed + attempt * 10) * Math.PI * 2
        const distance = deterministicRandom(treeSeed + attempt * 10 + 1) * hexRadius
        
        const x = Math.cos(angle) * distance
        const z = Math.sin(angle) * distance
        const newPos: [number, number, number] = [x, 0, z]
        
        if (isPositionValid(newPos, existingPositions, minDistance)) {
          return newPos
        }
      }
      
      // Если не удалось найти валидную позицию, возвращаем случайную
      const hexRadius = 0.8
      const angle = deterministicRandom(treeSeed) * Math.PI * 2
      const distance = deterministicRandom(treeSeed + 1) * hexRadius
      return [Math.cos(angle) * distance, 0, Math.sin(angle) * distance]
    }

    // Определяем, будет ли это плотная группа (10-15% вероятность)
    const isDenseGroup = deterministicRandom(seed + 999) < 0.12 // 12% вероятность
    const adjustedTreeCount = isDenseGroup ? Math.min(treeCount, 3) : treeCount

    // Генерируем деревья с учетом правил
    const existingPositions: Array<[number, number, number]> = []
    
    for (let i = 0; i < adjustedTreeCount; i++) {
      const treeSeed = seed + i * 1000
      
      // Выбираем случайную модель дерева
      const modelIndex = Math.floor(deterministicRandom(treeSeed) * 15)
      const selectedModelPath = `/models/trees/tree_${String(modelIndex + 1).padStart(2, '0')}.glb`
      
      // Случайный масштаб (0.8-1.2)
      const treeScale = 0.8 + deterministicRandom(treeSeed + 5) * 0.4
      
      // Генерируем позицию с учетом правил
      let position: [number, number, number]
      
      if (adjustedTreeCount === 2 && !isDenseGroup) {
        // Для 2 деревьев - размещаем на разных сторонах
        const side = i === 0 ? 0 : Math.PI // Противоположные стороны
        const distance = 0.5 + deterministicRandom(treeSeed + 2) * 0.3
        position = [
          Math.cos(side) * distance,
          0,
          Math.sin(side) * distance
        ]
      } else if (adjustedTreeCount === 3 && !isDenseGroup) {
        // Для 3 деревьев - формируем треугольник
        const angle = (i * 2 * Math.PI) / 3 + deterministicRandom(treeSeed + 2) * 0.5
        const distance = 0.4 + deterministicRandom(treeSeed + 3) * 0.2
        position = [
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ]
      } else {
        // Для остальных случаев или плотных групп - используем алгоритм с минимальной дистанцией
        position = generateValidPosition(treeSeed, existingPositions, treeScale)
      }
      
      existingPositions.push(position)
      
      // Случайный поворот
      const rotation = deterministicRandom(treeSeed + 4) * Math.PI * 2
      
      positions.push({
        modelPath: selectedModelPath,
        position,
        rotationY: rotation,
        scale: treeScale,
        seed: treeSeed
      })
    }

    return positions
  }, [seed, treeCount])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {treePositions.map((tree, index) => (
        <SingleTree
          key={index}
          modelPath={tree.modelPath}
          position={tree.position}
          rotationY={tree.rotationY}
          scale={tree.scale}
          seed={tree.seed}
          fitDiameter={fitDiameter}
          colorTint={colorTint}
          tintStrength={tintStrength}
          treeId={`${seed}-${index}`}
        />
      ))}
    </group>
  )
}

// Preload tree models with error handling
try {
  useGLTF.preload('/models/trees/tree_01.glb')
  useGLTF.preload('/models/trees/tree_02.glb')
  useGLTF.preload('/models/trees/tree_03.glb')
  useGLTF.preload('/models/trees/tree_04.glb')
  useGLTF.preload('/models/trees/tree_05.glb')
  useGLTF.preload('/models/trees/tree_06.glb')
  useGLTF.preload('/models/trees/tree_07.glb')
  useGLTF.preload('/models/trees/tree_08.glb')
  useGLTF.preload('/models/trees/tree_09.glb')
  useGLTF.preload('/models/trees/tree_10.glb')
  useGLTF.preload('/models/trees/tree_11.glb')
  useGLTF.preload('/models/trees/tree_12.glb')
  useGLTF.preload('/models/trees/tree_13.glb')
  useGLTF.preload('/models/trees/tree_14.glb')
  useGLTF.preload('/models/trees/tree_15.glb')
} catch (error) {
  console.error('❌ Failed to preload tree models:', error)
}

// Utility function to get random tree model path
export function getRandomTreeModel(seed: number = 0): string {
  const treeModels = [
    '/models/trees/tree_01.glb',
    '/models/trees/tree_02.glb',
    '/models/trees/tree_03.glb',
    '/models/trees/tree_04.glb',
    '/models/trees/tree_05.glb',
    '/models/trees/tree_06.glb',
    '/models/trees/tree_07.glb',
    '/models/trees/tree_08.glb',
    '/models/trees/tree_09.glb',
    '/models/trees/tree_10.glb',
    '/models/trees/tree_11.glb',
    '/models/trees/tree_12.glb',
    '/models/trees/tree_13.glb',
    '/models/trees/tree_14.glb',
    '/models/trees/tree_15.glb',
  ]
  
  const index = Math.abs(seed) % treeModels.length
  return treeModels[index]
}

// Utility function to get tree color tint based on zone
export function getTreeColorTint(zoneColor: string): string {
  // Convert zone color to a complementary tree color
  const colorMap: { [key: string]: string } = {
    '#FF6B6B': '#4A5D23', // Red zone -> Dark green tree
    '#4ECDC4': '#2D5016', // Teal zone -> Forest green tree
    '#45B7D1': '#3A5F2A', // Blue zone -> Olive green tree
    '#96CEB4': '#2E4A1F', // Green zone -> Dark forest green tree
    '#FFEAA7': '#4A6B2A', // Yellow zone -> Medium green tree
    '#DDA0DD': '#3D5A24', // Plum zone -> Dark olive tree
    '#98D8C8': '#2F4A1F', // Mint zone -> Dark forest green tree
    '#F7DC6F': '#4A6B2A', // Gold zone -> Medium green tree
  }
  
  return colorMap[zoneColor] || '#2D5016' // Default forest green tree
}
