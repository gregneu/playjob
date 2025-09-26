import React, { useMemo } from 'react'
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
}

// Функция для преобразования гексагональных координат в мировые
const hexToWorldPosition = (q: number, r: number, hexSize: number): [number, number, number] => {
  // Правильная формула для гексагональной сетки с плотной упаковкой
  // hexSize - это расстояние от центра до вершины (радиус описанной окружности)
  const x = hexSize * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r)
  const z = hexSize * (3/2 * r)
  return [x, 0, z]
}

// Кэшированная геометрия гексагона
let cachedHexGeometry: THREE.CylinderGeometry | null = null
let cachedSize: number | null = null

const getHexGeometry = (size: number, height: number = 0.1) => {
  // Пересоздаем геометрию если размер изменился
  if (!cachedHexGeometry || cachedSize !== size) {
    // Для правильной гексагональной сетки радиус должен быть size
    // (size - это расстояние от центра до вершины)
    const radius = size
    cachedHexGeometry = new THREE.CylinderGeometry(radius, radius, height, 6)
    // НЕ поворачиваем - CylinderGeometry по умолчанию лежит плоской стороной вверх
    cachedSize = size
  }
  return cachedHexGeometry
}

export const SimpleOptimizedHexGrid: React.FC<HexGridProps> = ({
  gridSize,
  hexSize,
  zones
}) => {
  // Создаем геометрию один раз
  const hexGeometry = useMemo(() => getHexGeometry(hexSize), [hexSize])

  // Создаем материалы для разных зон
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

  // Генерируем все ячейки сетки
  const hexCells = useMemo(() => {
    const cells: Array<{
      q: number
      r: number
      position: [number, number, number]
      zoneId: string
    }> = []

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
          zoneId
        })
      }
    }

    return cells
  }, [gridSize, hexSize, zones])

  // Группируем ячейки по зонам для рендеринга
  const cellsByZone = useMemo(() => {
    const grouped = new Map<string, typeof hexCells>()
    
    hexCells.forEach(cell => {
      if (!grouped.has(cell.zoneId)) {
        grouped.set(cell.zoneId, [])
      }
      grouped.get(cell.zoneId)!.push(cell)
    })

    return grouped
  }, [hexCells])

  return (
    <group>
      {Array.from(cellsByZone.entries()).map(([zoneId, cells]) => {
        const material = materials.get(zoneId) || materials.get('default')!
        
        return (
          <group key={zoneId}>
            {cells.map((cell, index) => (
              <mesh
                key={`${cell.q}-${cell.r}`}
                geometry={hexGeometry}
                material={material}
                position={cell.position}
                castShadow
                receiveShadow
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}

export default SimpleOptimizedHexGrid
