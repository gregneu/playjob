import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Функция создания фасетированной горы
const createFacetedMountain = (centerX: number, centerZ: number, radius: number, height: number, snowLevel: number = 0.7) => {
  const geometry = new THREE.BufferGeometry()
  
  const vertices: number[] = []
  const indices: number[] = []
  
  // Количество сегментов для детализации
  const radialSegments = 12
  const heightSegments = 6
  
  // Центральная вершина горы
  vertices.push(centerX, height, centerZ)
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
  const snowIndices: number[] = []
  
  for (let i = 0; i < indices.length; i += 3) {
    const v1Index = indices[i] * 3
    const v2Index = indices[i + 1] * 3
    const v3Index = indices[i + 2] * 3
    
    const avgHeight = (vertices[v1Index + 1] + vertices[v2Index + 1] + vertices[v3Index + 1]) / 3
    
    if (avgHeight > height * snowLevel) {
      snowIndices.push(indices[i], indices[i + 1], indices[i + 2])
    } else {
      rockIndices.push(indices[i], indices[i + 1], indices[i + 2])
    }
  }
  
  // Материалы
  const materials: THREE.Material[] = []
  
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B6F47,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true, // Для четких граней
    side: THREE.DoubleSide // Рендерим обе стороны
  })
  
  const snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.0,
    flatShading: true,
    side: THREE.DoubleSide // Рендерим обе стороны
  })
  
  // Объединяем индексы и создаем группы
  const allIndices = [...rockIndices, ...snowIndices]
  geometry.setIndex(allIndices)
  
  if (rockIndices.length > 0) {
    geometry.addGroup(0, rockIndices.length, 0)
    materials.push(rockMaterial)
  }
  
  if (snowIndices.length > 0) {
    geometry.addGroup(rockIndices.length, snowIndices.length, materials.length)
    materials.push(snowMaterial)
  }
  
  return { geometry, materials }
}

export const MountainComponent: React.FC = () => {
  const mountainRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (mountainRef.current) {
      mountainRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.01
    }
  })

  // Создаем горы с помощью useMemo для оптимизации
  const mountains = useMemo(() => {
    const mountainData = [
      { centerX: 0, centerZ: 0, radius: 2.8, height: 4.5, snowLevel: 0.6 }, // Центральная
      { centerX: 2.2, centerZ: 0.5, radius: 2.0, height: 3.5, snowLevel: 0.65 }, // Правая
      { centerX: -2, centerZ: 0.3, radius: 1.8, height: 3.2, snowLevel: 0.7 }, // Левая
    ]

    return mountainData.map((data, index) => {
      const { geometry, materials } = createFacetedMountain(
        data.centerX, 
        data.centerZ, 
        data.radius, 
        data.height, 
        data.snowLevel
      )
      
      return (
        <mesh 
          key={index}
          geometry={geometry} 
          material={materials}
          castShadow 
          receiveShadow
        />
      )
    })
  }, [])

  return (
    <group ref={mountainRef} position={[0, 0.1, 0]} scale={[0.15, 0.15, 0.15]}>
      {mountains}
      
      {/* Дополнительные камни у подножия */}
      <mesh position={[1.6, 0.3, 2.4]} castShadow receiveShadow>
        <coneGeometry args={[0.6, 1.0, 8]} />
        <meshStandardMaterial color="#696969" roughness={0.9} />
      </mesh>
      
      <mesh position={[-1.8, 0.3, 2]} castShadow receiveShadow>
        <coneGeometry args={[0.4, 0.8, 6]} />
        <meshStandardMaterial color="#696969" roughness={0.9} />
      </mesh>
      
      <mesh position={[0.6, 0.3, -1.6]} castShadow receiveShadow>
        <coneGeometry args={[0.8, 1.2, 10]} />
        <meshStandardMaterial color="#696969" roughness={0.9} />
      </mesh>
    </group>
  )
} 