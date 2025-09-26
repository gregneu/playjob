import React, { useRef, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface HexGridProps {
  gridSize: number
  hexSize: number
  zones: Array<{
    id: string
    name: string
    color: string
    center: [number, number]
    cells: Array<[number, number]>
  }>
  onHexClick?: (q: number, r: number) => void
  onHexHover?: (q: number, r: number | null) => void
}

// Кэшированная геометрия гексагона
let cachedHexGeometry: THREE.CylinderGeometry | null = null

const getHexGeometry = (size: number, height: number = 0.1) => {
  if (!cachedHexGeometry) {
    cachedHexGeometry = new THREE.CylinderGeometry(size, size, height, 6)
    cachedHexGeometry.rotateX(Math.PI / 2)
  }
  return cachedHexGeometry
}

// Функция для преобразования гексагональных координат в мировые
const hexToWorldPosition = (q: number, r: number, hexSize: number): [number, number, number] => {
  const x = hexSize * (3/2 * q)
  const z = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r)
  return [x, 0, z]
}

export const UltraOptimizedHexGrid: React.FC<HexGridProps> = ({
  gridSize,
  hexSize,
  zones,
  onHexClick,
  onHexHover
}) => {
  const { camera, gl } = useThree()
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredHexRef = useRef<[number, number] | null>(null)

  // Создаем геометрию один раз
  const hexGeometry = useMemo(() => getHexGeometry(hexSize), [hexSize])

  // Создаем материалы для разных зон (кэшированные)
  const materials = useMemo(() => {
    const materialMap = new Map<string, THREE.MeshStandardMaterial>()
    
    zones.forEach(zone => {
      const material = new THREE.MeshStandardMaterial({
        color: zone.color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        flatShading: true // Упрощенное затенение для производительности
      })
      materialMap.set(zone.id, material)
    })

    // Материал по умолчанию
    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: '#f0f0f0',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      flatShading: true
    })
    materialMap.set('default', defaultMaterial)

    return materialMap
  }, [zones])

  // Генерируем все ячейки сетки (кэшировано)
  const hexCells = useMemo(() => {
    const cells: Array<{
      q: number
      r: number
      position: [number, number, number]
      zoneId: string
      instanceId: number
    }> = []

    let instanceId = 0

    // Генерируем гексагональную сетку
    for (let q = -gridSize; q <= gridSize; q++) {
      const r1 = Math.max(-gridSize, -q - gridSize)
      const r2 = Math.min(gridSize, -q + gridSize)
      
      for (let r = r1; r <= r2; r++) {
        const position = hexToWorldPosition(q, r, hexSize)
        
        // Определяем зону для этой ячейки
        let zoneId = 'default'
        for (const zone of zones) {
          if (zone.cells.some(([zq, zr]) => zq === q && zr === r)) {
            zoneId = zone.id
            break
          }
        }

        cells.push({
          q,
          r,
          position,
          zoneId,
          instanceId: instanceId++
        })
      }
    }

    return cells
  }, [gridSize, hexSize, zones])

  // Создаем InstancedMesh для каждой зоны (кэшировано)
  const instancedMeshes = useMemo(() => {
    const meshes: Array<{
      zoneId: string
      material: THREE.MeshStandardMaterial
      instanceCount: number
      matrixArray: Float32Array
      colorArray: Float32Array
    }> = []

    // Группируем ячейки по зонам
    const cellsByZone = new Map<string, typeof hexCells>()
    hexCells.forEach(cell => {
      if (!cellsByZone.has(cell.zoneId)) {
        cellsByZone.set(cell.zoneId, [])
      }
      cellsByZone.get(cell.zoneId)!.push(cell)
    })

    // Создаем InstancedMesh для каждой зоны
    cellsByZone.forEach((cells, zoneId) => {
      const material = materials.get(zoneId) || materials.get('default')!
      const instanceCount = cells.length
      
      // Создаем массивы для матриц и цветов
      const matrixArray = new Float32Array(instanceCount * 16) // 4x4 матрица
      const colorArray = new Float32Array(instanceCount * 3) // RGB
      
      cells.forEach((cell, index) => {
        const matrix = new THREE.Matrix4()
        matrix.setPosition(cell.position[0], cell.position[1], cell.position[2])
        
        // Копируем матрицу в массив
        matrix.toArray(matrixArray, index * 16)
        
        // Устанавливаем цвет
        const color = new THREE.Color(material.color)
        colorArray[index * 3] = color.r
        colorArray[index * 3 + 1] = color.g
        colorArray[index * 3 + 2] = color.b
      })

      meshes.push({
        zoneId,
        material,
        instanceCount,
        matrixArray,
        colorArray
      })
    })

    return meshes
  }, [hexCells, materials])

  // Оптимизированная обработка клика
  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!onHexClick) return

    const rect = gl.domElement.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(mouseRef.current, camera)
    
    // Ищем пересечение с гексагонами
    const intersects = raycasterRef.current.intersectObjects(
      instancedMeshes.map(m => m.material),
      false
    )
    
    if (intersects.length > 0) {
      const intersect = intersects[0]
      const instanceId = intersect.instanceId
      
      // Находим ячейку по instanceId
      const cell = hexCells.find(c => c.instanceId === instanceId)
      if (cell) {
        onHexClick(cell.q, cell.r)
      }
    }
  }, [onHexClick, hexCells, instancedMeshes, camera, gl])

  // Оптимизированная обработка наведения
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!onHexHover) return

    const rect = gl.domElement.getBoundingClientRect()
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(mouseRef.current, camera)
    
    const intersects = raycasterRef.current.intersectObjects(
      instancedMeshes.map(m => m.material),
      false
    )
    
    if (intersects.length > 0) {
      const intersect = intersects[0]
      const instanceId = intersect.instanceId
      
      const cell = hexCells.find(c => c.instanceId === instanceId)
      if (cell && (!hoveredHexRef.current || hoveredHexRef.current[0] !== cell.q || hoveredHexRef.current[1] !== cell.r)) {
        hoveredHexRef.current = [cell.q, cell.r]
        onHexHover(cell.q, cell.r)
      }
    } else if (hoveredHexRef.current) {
      hoveredHexRef.current = null
      onHexHover(null, null)
    }
  }, [onHexHover, hexCells, instancedMeshes, camera, gl])

  return (
    <group>
      {instancedMeshes.map(({ zoneId, material, instanceCount, matrixArray, colorArray }) => (
        <instancedMesh
          key={zoneId}
          ref={meshRef}
          args={[hexGeometry, material, instanceCount]}
          onClick={handleClick}
          onPointerMove={handlePointerMove}
        >
          {/* Устанавливаем матрицы для всех экземпляров */}
          <primitive
            object={matrixArray}
            attach="instanceMatrix"
          />
          {/* Устанавливаем цвета для всех экземпляров */}
          <primitive
            object={colorArray}
            attach="instanceColor"
          />
        </instancedMesh>
      ))}
    </group>
  )
}

export default UltraOptimizedHexGrid
