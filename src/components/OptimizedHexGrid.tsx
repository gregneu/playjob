import React, { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
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

// Функция для преобразования гексагональных координат в мировые
const hexToWorldPosition = (q: number, r: number, hexSize: number): [number, number, number] => {
  const x = hexSize * (3/2 * q)
  const z = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r)
  return [x, 0, z]
}

// Функция для создания гексагональной геометрии
const createHexGeometry = (size: number, height: number = 0.1) => {
  const geometry = new THREE.CylinderGeometry(size, size, height, 6)
  geometry.rotateX(Math.PI / 2) // Поворачиваем, чтобы гексагон лежал горизонтально
  return geometry
}

export const OptimizedHexGrid: React.FC<HexGridProps> = ({
  gridSize,
  hexSize,
  zones,
  onHexClick,
  onHexHover
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const hoveredHexRef = useRef<[number, number] | null>(null)

  // Создаем геометрию один раз
  const hexGeometry = useMemo(() => createHexGeometry(hexSize), [hexSize])

  // Создаем материалы для разных зон
  const materials = useMemo(() => {
    const materialMap = new Map<string, THREE.MeshStandardMaterial>()
    
    zones.forEach(zone => {
      const material = new THREE.MeshStandardMaterial({
        color: zone.color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      })
      materialMap.set(zone.id, material)
    })

    // Материал по умолчанию
    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: '#f0f0f0',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
    materialMap.set('default', defaultMaterial)

    return materialMap
  }, [zones])

  // Генерируем все ячейки сетки
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

  // Создаем InstancedMesh для каждой зоны
  const instancedMeshes = useMemo(() => {
    const meshes: Array<{
      zoneId: string
      material: THREE.MeshStandardMaterial
      instanceCount: number
      positions: Float32Array
      colors: Float32Array
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
      
      const positions = new Float32Array(instanceCount * 3)
      const colors = new Float32Array(instanceCount * 3)
      
      cells.forEach((cell, index) => {
        const i = index * 3
        positions[i] = cell.position[0]
        positions[i + 1] = cell.position[1]
        positions[i + 2] = cell.position[2]
        
        // Цвет для этой ячейки
        const color = new THREE.Color(material.color)
        colors[i] = color.r
        colors[i + 1] = color.g
        colors[i + 2] = color.b
      })

      meshes.push({
        zoneId,
        material,
        instanceCount,
        positions,
        colors
      })
    })

    return meshes
  }, [hexCells, materials])

  // Обработка клика
  const handleClick = useCallback((event: THREE.Event) => {
    if (!onHexClick) return

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    
    // Получаем координаты мыши
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, event.camera)
    
    // Ищем пересечение с гексагонами
    const intersects = raycaster.intersectObjects(instancedMeshes.map(m => m.material))
    
    if (intersects.length > 0) {
      const intersect = intersects[0]
      const instanceId = intersect.instanceId
      
      // Находим ячейку по instanceId
      const cell = hexCells.find(c => c.instanceId === instanceId)
      if (cell) {
        onHexClick(cell.q, cell.r)
      }
    }
  }, [onHexClick, hexCells, instancedMeshes])

  // Обработка наведения
  const handlePointerMove = useCallback((event: THREE.Event) => {
    if (!onHexHover) return

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    
    const rect = (event.target as HTMLCanvasElement).getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, event.camera)
    
    const intersects = raycaster.intersectObjects(instancedMeshes.map(m => m.material))
    
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
  }, [onHexHover, hexCells, instancedMeshes])

  return (
    <group>
      {instancedMeshes.map(({ zoneId, material, instanceCount, positions, colors }) => (
        <instancedMesh
          key={zoneId}
          ref={meshRef}
          args={[hexGeometry, material, instanceCount]}
          onClick={handleClick}
          onPointerMove={handlePointerMove}
        >
          {/* Устанавливаем позиции для всех экземпляров */}
          {positions.map((pos, index) => {
            const i = Math.floor(index / 3)
            const matrix = new THREE.Matrix4()
            matrix.setPosition(pos, positions[index + 1], positions[index + 2])
            return (
              <primitive
                key={i}
                object={matrix}
                attach={`instanceMatrix-${i}`}
              />
            )
          })}
        </instancedMesh>
      ))}
    </group>
  )
}

export default OptimizedHexGrid
