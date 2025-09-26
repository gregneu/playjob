import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Функция создания фасетированного вулкана с кратером
const createFacetedVolcano = (centerX: number, centerZ: number, radius: number, height: number, craterDepth: number = 0.3) => {
  const geometry = new THREE.BufferGeometry()
  
  const vertices: number[] = []
  const indices: number[] = []
  
  // Количество сегментов для детализации
  const radialSegments = 12
  const heightSegments = 6
  
  // Центральная вершина вулкана (кратер)
  vertices.push(centerX, height - craterDepth, centerZ)
  const topVertexIndex = 0
  
  // Создаем кольца вершин от вершины к основанию
  for (let h = 1; h <= heightSegments; h++) {
    const heightRatio = h / heightSegments
    const currentHeight = height * (1 - heightRatio)
    const currentRadius = radius * heightRatio
    
    for (let r = 0; r < radialSegments; r++) {
      const angle = (r / radialSegments) * Math.PI * 2
      
      // Базовые координаты
      const x = centerX + Math.cos(angle) * currentRadius
      const z = centerZ + Math.sin(angle) * currentRadius
      
      // Добавляем небольшие случайные отклонения для неровности
      const noiseScale = 0.15
      const noiseX = (Math.random() - 0.5) * currentRadius * noiseScale
      const noiseZ = (Math.random() - 0.5) * currentRadius * noiseScale
      const noiseY = (Math.random() - 0.5) * height * noiseScale * 0.3
      
      vertices.push(
        x + noiseX, 
        currentHeight + noiseY, 
        z + noiseZ
      )
    }
  }
  
  // Соединяем вершину с первым кольцом
  for (let r = 0; r < radialSegments; r++) {
    const current = 1 + r
    const next = 1 + ((r + 1) % radialSegments)
    
    indices.push(topVertexIndex, current, next)
  }
  
  // Соединяем кольца между собой
  for (let h = 0; h < heightSegments - 1; h++) {
    for (let r = 0; r < radialSegments; r++) {
      const current = 1 + h * radialSegments + r
      const next = 1 + h * radialSegments + ((r + 1) % radialSegments)
      const currentNext = 1 + (h + 1) * radialSegments + r
      const nextNext = 1 + (h + 1) * radialSegments + ((r + 1) % radialSegments)
      
      // Два треугольника на каждый "квад"
      indices.push(current, currentNext, next)
      indices.push(next, currentNext, nextNext)
    }
  }
  
  // Преобразуем в Float32Array
  const verticesArray = new Float32Array(vertices)
  geometry.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  
  // Разделяем на материалы по высоте
  const rockIndices: number[] = []
  const lavaIndices: number[] = []
  const craterIndices: number[] = []
  
  for (let i = 0; i < indices.length; i += 3) {
    const v1Index = indices[i] * 3
    const v2Index = indices[i + 1] * 3
    const v3Index = indices[i + 2] * 3
    
    const avgHeight = (vertices[v1Index + 1] + vertices[v2Index + 1] + vertices[v3Index + 1]) / 3
    
    if (avgHeight > height * 0.8) {
      // Кратер - темная область на вершине
      craterIndices.push(indices[i], indices[i + 1], indices[i + 2])
    } else if (avgHeight > height * 0.4) {
      // Лава - оранжево-красная область в средней части
      lavaIndices.push(indices[i], indices[i + 1], indices[i + 2])
    } else {
      // Камень - темная порода внизу
      rockIndices.push(indices[i], indices[i + 1], indices[i + 2])
    }
  }
  
  // Материалы
  const materials: THREE.Material[] = []
  
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x4A4A4A, // Темно-серый
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
    side: THREE.DoubleSide
  })
  
  const lavaMaterial = new THREE.MeshStandardMaterial({
    color: 0xFF4500, // Оранжево-красный
    roughness: 0.3,
    metalness: 0.2,
    flatShading: true,
    side: THREE.DoubleSide,
    emissive: 0xFF2200, // Свечение
    emissiveIntensity: 0.3
  })
  
  const craterMaterial = new THREE.MeshStandardMaterial({
    color: 0x2A2A2A, // Очень темный
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
    side: THREE.DoubleSide
  })
  
  // Объединяем индексы и создаем группы
  const allIndices = [...rockIndices, ...lavaIndices, ...craterIndices]
  geometry.setIndex(allIndices)
  
  if (rockIndices.length > 0) {
    geometry.addGroup(0, rockIndices.length, 0)
    materials.push(rockMaterial)
  }
  
  if (lavaIndices.length > 0) {
    geometry.addGroup(rockIndices.length, lavaIndices.length, materials.length)
    materials.push(lavaMaterial)
  }
  
  if (craterIndices.length > 0) {
    geometry.addGroup(rockIndices.length + lavaIndices.length, craterIndices.length, materials.length)
    materials.push(craterMaterial)
  }
  
  return { geometry, materials }
}

export const VolcanoComponent: React.FC = () => {
  const volcanoRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (volcanoRef.current) {
      volcanoRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.01
    }
  })

  // Создаем вулкан с помощью useMemo для оптимизации
  const volcano = useMemo(() => {
    const { geometry, materials } = createFacetedVolcano(
      0, 0, 2.5, 4.0, 0.4 // centerX, centerZ, radius, height, craterDepth
    )
    
    return (
      <mesh 
        geometry={geometry} 
        material={materials}
        castShadow 
        receiveShadow
      />
    )
  }, [])

  return (
    <group ref={volcanoRef} position={[0, 0.1, 0]} scale={[0.15, 0.15, 0.15]}>
      {volcano}
      
      {/* Дополнительные камни и лавовые потоки у подножия */}
      <mesh position={[1.2, 0.3, 1.8]} castShadow receiveShadow>
        <coneGeometry args={[0.4, 0.8, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      
      <mesh position={[-1.5, 0.3, 1.5]} castShadow receiveShadow>
        <coneGeometry args={[0.3, 0.6, 6]} />
        <meshStandardMaterial color="#696969" roughness={0.9} />
      </mesh>
      
      <mesh position={[0.8, 0.3, -1.2]} castShadow receiveShadow>
        <coneGeometry args={[0.5, 1.0, 10]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      
      {/* Лавовые потоки */}
      <mesh position={[0.6, 0.2, 0.8]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.15, 0.4, 8]} />
        <meshStandardMaterial 
          color="#FF4500" 
          roughness={0.3}
          emissive="#FF2200"
          emissiveIntensity={0.4}
        />
      </mesh>
      
      <mesh position={[-0.4, 0.2, 0.6]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.3, 6]} />
        <meshStandardMaterial 
          color="#FF6347" 
          roughness={0.3}
          emissive="#FF2200"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  )
} 