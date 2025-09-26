import React, { useMemo } from 'react'
import * as THREE from 'three'
import { hexToWorldPosition, getNeighbors, hexDistance } from '../lib/hex-utils'

interface RoadSystemProps {
  links: Array<{
    id: string
    from_object_id: string
    to_object_id: string
    link_type: 'primary' | 'secondary'
    created_at: string
  }>
  zoneObjects: Array<{
    id: string
    q: number
    r: number
    object_type?: string
  }>
}

// Направления для гексагональной сетки (0-5, начиная с правого и по часовой стрелке)
const HEX_DIRECTIONS = [
  [1, 0],   // 0: право
  [1, -1],  // 1: верх-право
  [0, -1],  // 2: верх-лево
  [-1, 0],  // 3: лево
  [-1, 1],  // 4: низ-лево
  [0, 1]    // 5: низ-право
]

// Определение стороны входа/выхода для ячейки
const getCellSide = (fromQ: number, fromR: number, toQ: number, toR: number): number => {
  const deltaQ = toQ - fromQ
  const deltaR = toR - fromR
  
  // Определяем направление
  if (deltaQ > 0 && deltaR === 0) return 0      // право
  if (deltaQ > 0 && deltaR < 0) return 1       // верх-право
  if (deltaQ === 0 && deltaR < 0) return 2     // верх-лево
  if (deltaQ < 0 && deltaR === 0) return 3     // лево
  if (deltaQ < 0 && deltaR > 0) return 4       // низ-лево
  if (deltaQ === 0 && deltaR > 0) return 5     // низ-право
  
  return 0 // по умолчанию
}

// Создание дорожного сегмента
const createRoadSegment = (
  cellQ: number, 
  cellR: number, 
  entrySide: number, 
  exitSide: number,
  hexToWorldPosition: (q: number, r: number) => [number, number, number]
) => {
  const [cellX, , cellZ] = hexToWorldPosition(cellQ, cellR)
  
  // Если вход и выход на противоположных сторонах - прямая дорога
  if (Math.abs(entrySide - exitSide) === 3) {
    const angle = (entrySide * Math.PI) / 3
    return {
      type: 'straight',
      position: [cellX, 0.02, cellZ],
      rotation: [0, angle, 0],
      length: 0.8
    }
  }
  
  // Если есть изгиб - создаем два прямых сегмента под углом
  const entryAngle = (entrySide * Math.PI) / 3
  const exitAngle = (exitSide * Math.PI) / 3
  
  return {
    type: 'corner',
    position: [cellX, 0.02, cellZ],
    entryAngle,
    exitAngle,
    length: 0.4
  }
}

// Компонент прямой дороги
const StraightRoad: React.FC<{
  position: [number, number, number]
  rotation: [number, number, number]
  length: number
  linkType: 'primary' | 'secondary'
}> = ({ position, rotation, length, linkType }) => {
  const roadColor = linkType === 'primary' ? '#4a4a4a' : '#6a6a6a'
  const roadWidth = linkType === 'primary' ? 0.4 : 0.3
  
  return (
    <group position={position} rotation={rotation}>
      {/* Основная дорога */}
      <mesh>
        <planeGeometry args={[length, roadWidth]} />
        <meshStandardMaterial 
          color={roadColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Белые полосы */}
      <mesh position={[0, 0.001, 0]}>
        <planeGeometry args={[length, 0.05]} />
        <meshStandardMaterial 
          color="#ffffff"
          roughness={0.3}
          metalness={0.0}
        />
      </mesh>
    </group>
  )
}

// Компонент угловой дороги (два прямых сегмента)
const CornerRoad: React.FC<{
  position: [number, number, number]
  entryAngle: number
  exitAngle: number
  length: number
  linkType: 'primary' | 'secondary'
}> = ({ position, entryAngle, exitAngle, length, linkType }) => {
  const roadColor = linkType === 'primary' ? '#4a4a4a' : '#6a6a6a'
  const roadWidth = linkType === 'primary' ? 0.4 : 0.3
  
  return (
    <group position={position}>
      {/* Первый сегмент (вход) */}
      <group rotation={[0, entryAngle, 0]}>
        <mesh>
          <planeGeometry args={[length, roadWidth]} />
          <meshStandardMaterial 
            color={roadColor}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        <mesh position={[0, 0.001, 0]}>
          <planeGeometry args={[length, 0.05]} />
          <meshStandardMaterial 
            color="#ffffff"
            roughness={0.3}
            metalness={0.0}
          />
        </mesh>
      </group>
      
      {/* Второй сегмент (выход) */}
      <group rotation={[0, exitAngle, 0]}>
        <mesh>
          <planeGeometry args={[length, roadWidth]} />
          <meshStandardMaterial 
            color={roadColor}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        <mesh position={[0, 0.001, 0]}>
          <planeGeometry args={[length, 0.05]} />
          <meshStandardMaterial 
            color="#ffffff"
            roughness={0.3}
            metalness={0.0}
          />
        </mesh>
      </group>
    </group>
  )
}

// Основной компонент дорожной системы
const RoadSystem: React.FC<RoadSystemProps> = ({ links, zoneObjects }) => {
  const roadSegments = useMemo(() => {
    const segments: Array<{
      id: string
      cellQ: number
      cellR: number
      entrySide: number
      exitSide: number
      linkType: 'primary' | 'secondary'
      segmentData: any
    }> = []
    
    links.forEach(link => {
      const fromObject = zoneObjects.find(obj => obj.id === link.from_object_id)
      const toObject = zoneObjects.find(obj => obj.id === link.to_object_id)
      
      if (!fromObject || !toObject) {
        console.log('🔗 RoadSystem: Objects not found for link:', link.id, { fromObject, toObject })
        return
      }
      
      console.log('🔗 RoadSystem: Creating road between objects:', {
        from: { id: fromObject.id, q: fromObject.q, r: fromObject.r },
        to: { id: toObject.id, q: toObject.q, r: toObject.r }
      })
      
      // Находим путь между объектами согласно требованиям
      const path = findPathBetweenObjects(fromObject, toObject, zoneObjects)
      
      console.log('🔗 RoadSystem: Path found:', path)
      
      if (path.length === 0) {
        console.log('🔗 RoadSystem: No path found between objects')
        return
      }
      
      // Создаем дорожные сегменты для каждой ячейки в пути
      for (let i = 0; i < path.length; i++) {
        const cell = path[i]
        const prevCell = i > 0 ? path[i - 1] : null
        const nextCell = i < path.length - 1 ? path[i + 1] : null
        
        let entrySide = -1
        let exitSide = -1
        
        // Определяем сторону входа
        if (prevCell) {
          entrySide = getCellSide(prevCell.q, prevCell.r, cell.q, cell.r)
        } else {
          // Первая ячейка - вход со стороны объекта
          entrySide = getCellSide(fromObject.q, fromObject.r, cell.q, cell.r)
        }
        
        // Определяем сторону выхода
        if (nextCell) {
          exitSide = getCellSide(cell.q, cell.r, nextCell.q, nextCell.r)
        } else {
          // Последняя ячейка - выход в сторону объекта
          exitSide = getCellSide(cell.q, cell.r, toObject.q, toObject.r)
        }
        
        console.log('🔗 RoadSystem: Cell segment:', {
          cell: { q: cell.q, r: cell.r },
          entrySide,
          exitSide,
          isStraight: Math.abs(entrySide - exitSide) === 3
        })
        
        // Создаем сегмент дороги
        const segmentData = createRoadSegment(cell.q, cell.r, entrySide, exitSide, hexToWorldPosition)
        
        segments.push({
          id: `${link.id}-${cell.q}-${cell.r}`,
          cellQ: cell.q,
          cellR: cell.r,
          entrySide,
          exitSide,
          linkType: link.link_type,
          segmentData
        })
      }
    })
    
    console.log('🔗 RoadSystem: Total segments created:', segments.length)
    return segments
  }, [links, zoneObjects])
  
  return (
    <group>
      {roadSegments.map(segment => (
        <group key={segment.id}>
          {segment.segmentData.type === 'straight' ? (
            <StraightRoad
              position={segment.segmentData.position}
              rotation={segment.segmentData.rotation}
              length={segment.segmentData.length}
              linkType={segment.linkType}
            />
          ) : (
            <CornerRoad
              position={segment.segmentData.position}
              entryAngle={segment.segmentData.entryAngle}
              exitAngle={segment.segmentData.exitAngle}
              length={segment.segmentData.length}
              linkType={segment.linkType}
            />
          )}
        </group>
      ))}
    </group>
  )
}

// Функция для поиска пути между объектами согласно требованиям
const findPathBetweenObjects = (
  fromObject: { q: number; r: number },
  toObject: { q: number; r: number },
  zoneObjects: Array<{ q: number; r: number }>
): Array<{ q: number; r: number }> => {
  const path: Array<{ q: number; r: number }> = []
  
  // Начинаем с первой соседней ячейки от объекта
  const fromNeighbors = getNeighbors(fromObject.q, fromObject.r)
  const toNeighbors = getNeighbors(toObject.q, toObject.r)
  
  // Находим ближайшие соседние ячейки к цели
  const fromNeighbor = fromNeighbors.reduce((closest, neighbor) => {
    const distance = hexDistance(neighbor[0], neighbor[1], toObject.q, toObject.r)
    const closestDistance = hexDistance(closest[0], closest[1], toObject.q, toObject.r)
    return distance < closestDistance ? neighbor : closest
  })
  
  const toNeighbor = toNeighbors.reduce((closest, neighbor) => {
    const distance = hexDistance(neighbor[0], neighbor[1], fromObject.q, fromObject.r)
    const closestDistance = hexDistance(closest[0], closest[1], fromObject.q, fromObject.r)
    return distance < closestDistance ? neighbor : closest
  })
  
  console.log('🔗 findPathBetweenObjects: Neighbors found:', {
    fromNeighbor,
    toNeighbor,
    fromObject: { q: fromObject.q, r: fromObject.r },
    toObject: { q: toObject.q, r: toObject.r }
  })
  
  // Если объекты соседние, создаем прямой путь через две соседние ячейки
  if (hexDistance(fromObject.q, fromObject.r, toObject.q, toObject.r) === 1) {
    path.push({ q: fromNeighbor[0], r: fromNeighbor[1] })
    path.push({ q: toNeighbor[0], r: toNeighbor[1] })
    return path
  }
  
  // Иначе используем алгоритм поиска пути через промежуточные ячейки
  const cellsBetween = getCellsBetween([fromNeighbor[0], fromNeighbor[1]], [toNeighbor[0], toNeighbor[1]])
  
  cellsBetween.forEach(([q, r]) => {
    // Проверяем, что ячейка не занята объектом
    const isOccupied = zoneObjects.some(obj => obj.q === q && obj.r === r)
    if (!isOccupied) {
      path.push({ q, r })
    }
  })
  
  return path
}

// Вспомогательная функция для получения ячеек между двумя точками
const getCellsBetween = (start: [number, number], end: [number, number]): Array<[number, number]> => {
  const [startQ, startR] = start
  const [endQ, endR] = end
  
  const cells: Array<[number, number]> = []
  const deltaQ = endQ - startQ
  const deltaR = endR - startR
  const steps = Math.max(Math.abs(deltaQ), Math.abs(deltaR))
  
  if (steps === 0) {
    return [[startQ, startR]]
  }
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const q = Math.round(startQ + deltaQ * t)
    const r = Math.round(startR + deltaR * t)
    cells.push([q, r])
  }
  
  return cells
}

export default RoadSystem
