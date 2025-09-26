import React, { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { HexCell } from './HexCell'
import { hexToWorldPosition } from '../lib/hex-utils'
import { useProjectData } from '../hooks/useProjectData'
import { BuildingType } from '../types/building'

interface MapSnapshotProps {
  projectId: string
  width?: number | string
  height?: number | string
}

export const MapSnapshot: React.FC<MapSnapshotProps> = ({ 
  projectId, 
  width = '100%', 
  height = '100%'
}) => {
  // Don't render 3D Canvas if we're already in a 3D scene
  if ((window as any).isIn3DScene) {
    return (
      <div style={{ 
        width, 
        height, 
        background: 'linear-gradient(135deg, #87CEEB 0%, #98FB98 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        3D Map Preview
      </div>
    )
  }
  const {
    zones,
    zoneCells,
    hexCells,
    buildings,
    loading,
    error
  } = useProjectData(projectId)

  // Генерация гексагональной сетки для снапшота
  const generateHexGrid = (radius: number) => {
    const cells: Array<{ q: number; r: number; s: number }> = []
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius)
      const r2 = Math.min(radius, -q + radius)
      for (let r = r1; r <= r2; r++) {
        cells.push({ q, r, s: -q - r })
      }
    }
    return cells
  }

  // Функция для определения цвета ячейки
  const getCellColor = (q: number, r: number) => {
    // Проверяем, есть ли здание на этой ячейке
    const building = buildings.find(b => b.q === q && b.r === r)
    if (building) {
      return '#87CEEB' // Светло-голубой для зданий
    }

    // Проверяем, есть ли зона на этой ячейке
    const zoneCell = zoneCells.find(zc => zc.q === q && zc.r === r)
    if (zoneCell) {
      const zone = zones.find(z => z.id === zoneCell.zone_id)
      return zone?.color || '#E8E8E8'
    }

    return '#FFFFFF' // Белый по умолчанию
  }

  // Функция для определения типа здания
  const getBuildingType = (q: number, r: number): BuildingType | null => {
    const building = buildings.find(b => b.q === q && b.r === r)
    return building?.building_type as BuildingType || null
  }

  // Функция для определения информации о зоне
  const getZoneInfo = (q: number, r: number) => {
    const zoneCell = zoneCells.find(zc => zc.q === q && zc.r === r)
    if (zoneCell) {
      const zone = zones.find(z => z.id === zoneCell.zone_id)
      return zone
    }
    return null
  }

  // Функция для определения центра зоны
  const getZoneCenter = (zoneId: string): [number, number] | null => {
    const zoneCellsForZone = zoneCells.filter(zc => zc.zone_id === zoneId)
    if (zoneCellsForZone.length === 0) return null

    const avgQ = zoneCellsForZone.reduce((sum, cell) => sum + cell.q, 0) / zoneCellsForZone.length
    const avgR = zoneCellsForZone.reduce((sum, cell) => sum + cell.r, 0) / zoneCellsForZone.length

    // Находим ближайшую ячейку к центру
    let closestCell = zoneCellsForZone[0]
    let minDistance = Infinity

    zoneCellsForZone.forEach(cell => {
      const distance = Math.sqrt((cell.q - avgQ) ** 2 + (cell.r - avgR) ** 2)
      if (distance < minDistance) {
        minDistance = distance
        closestCell = cell
      }
    })

    return [closestCell.q, closestCell.r]
  }

  // Функция для определения, является ли ячейка центром зоны
  const isZoneCenter = (q: number, r: number) => {
    const zoneCell = zoneCells.find(zc => zc.q === q && zc.r === r)
    if (!zoneCell) return false

    const zoneCenter = getZoneCenter(zoneCell.zone_id)
    return zoneCenter && zoneCenter[0] === q && zoneCenter[1] === r
  }

  if (loading) {
    return (
      <div style={{ 
        width, 
        height, 
        background: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#666'
      }}>
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        width, 
        height, 
        background: '#fee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#c00'
      }}>
        Loading Error
      </div>
    )
  }

  const gridCells = generateHexGrid(8) // Меньший радиус для снапшота

  return (
    <div style={{ width, height, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 15, 15], fov: 45 }}
        style={{ background: 'linear-gradient(135deg, #87CEEB 0%, #98FB98 100%)' }}
      >
        {/* Освещение */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

        {/* Земля */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#90EE90" />
        </mesh>

        {/* Гексагональная сетка */}
        {gridCells.map(({ q, r }) => {
          const [x, y, z] = hexToWorldPosition(q, r)
          const buildingType = getBuildingType(q, r)
          const zoneInfo = getZoneInfo(q, r)
          const isCenter = isZoneCenter(q, r)

          return (
            <HexCell
              key={`${q},${r}`}
              q={q}
              r={r}
              type="building-slot"
              state={buildingType ? 'occupied' : 'empty'}
              buildingType={buildingType}
              isVisible={true}
              onClick={() => {}} // Пустая функция для снапшота
              onPointerEnter={() => {}}
              onPointerLeave={() => {}}
              isZoneMode={false}
              isSelected={false}
              zoneColor={zoneInfo?.color}
              zoneInfo={zoneInfo ? {
                id: zoneInfo.id,
                name: zoneInfo.name,
                color: zoneInfo.color,
                cells: [],
                createdAt: new Date(zoneInfo.created_at)
              } : undefined}
              isZoneCenter={isCenter}
              isHovered={false}
            />
          )
        })}
      </Canvas>
    </div>
  )
} 