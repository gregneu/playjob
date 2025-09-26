import React, { useMemo } from 'react'
import * as THREE from 'three'
import { hexToWorldPosition, getNeighbors, hexDistance } from '../lib/hex-utils'

interface AdvancedRoadSystemProps {
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

// Определение типа сегмента (прямой или изогнутый)
const getSegmentType = (entrySide: number, exitSide: number): 'straight' | 'curved' => {
  // Если вход и выход на противоположных сторонах - прямой сегмент
  if (Math.abs(entrySide - exitSide) === 3) {
    return 'straight'
  }
  return 'curved'
}

// Создание дорожного сегмента с правильной ориентацией
const createRoadSegment = (
  cellQ: number, 
  cellR: number, 
  entrySide: number, 
  exitSide: number,
  hexToWorldPosition: (q: number, r: number) => [number, number, number]
) => {
  const [cellX, , cellZ] = hexToWorldPosition(cellQ, cellR)
  const segmentType = getSegmentType(entrySide, exitSide)
  
  if (segmentType === 'straight') {
    // Прямой сегмент - идет от края до края ячейки
    const angle = (entrySide * Math.PI) / 3
    return {
      type: 'straight',
      position: [cellX, 0.02, cellZ],
      rotation: [0, angle, 0],
      length: 1.0, // Полная длина ячейки
      width: 0.4
    }
  } else {
    // Изогнутый сегмент - соединяет две стороны ячейки
    const entryAngle = (entrySide * Math.PI) / 3
    const exitAngle = (exitSide * Math.PI) / 3
    
    // Определяем направление изгиба на основе геометрии
    const isClockwise = (exitSide - entrySide + 6) % 6 <= 3
    
    return {
      type: 'curved',
      position: [cellX, 0.02, cellZ],
      entryAngle,
      exitAngle,
      isClockwise,
      radius: 0.4
    }
  }
}

// Компонент прямого дорожного сегмента
const StraightRoadSegment: React.FC<{
  position: [number, number, number]
  rotation: [number, number, number]
  length: number
  width: number
  linkType: 'primary' | 'secondary'
}> = ({ position, rotation, length, width, linkType }) => {
  const roadColor = linkType === 'primary' ? '#4a4a4a' : '#6a6a6a'
  
  return (
    <group position={position} rotation={rotation}>
      {/* Основная дорога */}
      <mesh>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial 
          color={roadColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Белые пунктирные линии */}
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

// Компонент изогнутого дорожного сегмента
const CurvedRoadSegment: React.FC<{
  position: [number, number, number]
  entryAngle: number
  exitAngle: number
  isClockwise: boolean
  radius: number
  linkType: 'primary' | 'secondary'
}> = ({ position, entryAngle, exitAngle, isClockwise, radius, linkType }) => {
  const roadColor = linkType === 'primary' ? '#4a4a4a' : '#6a6a6a'
  const roadWidth = 0.4
  
  // Создаем изогнутую дорогу с помощью TubeGeometry
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-radius, 0, 0),
    new THREE.Vector3(-radius, 0, isClockwise ? -radius : radius),
    new THREE.Vector3(isClockwise ? radius : -radius, 0, isClockwise ? -radius : radius),
    new THREE.Vector3(isClockwise ? radius : -radius, 0, 0)
  )
  
  return (
    <group position={position} rotation={[0, entryAngle, 0]}>
      {/* Изогнутая дорога */}
      <mesh>
        <tubeGeometry args={[curve, 16, roadWidth / 2, 8, false]} />
        <meshStandardMaterial 
          color={roadColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Белые пунктирные линии на изгибе */}
      <mesh>
        <tubeGeometry args={[curve, 16, 0.025, 8, false]} />
        <meshStandardMaterial 
          color="#ffffff"
          roughness={0.3}
          metalness={0.0}
        />
      </mesh>
    </group>
  )
}

// Функция для поиска кратчайшего пути между объектами
const findShortestPath = (
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
  
  // Если объекты соседние, создаем прямой путь через две соседние ячейки
  if (hexDistance(fromObject.q, fromObject.r, toObject.q, toObject.r) === 1) {
    path.push({ q: fromNeighbor[0], r: fromNeighbor[1] })
    path.push({ q: toNeighbor[0], r: toNeighbor[1] })
    return path
  }
  
  // Иначе используем алгоритм поиска кратчайшего пути
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

// Основной компонент продвинутой дорожной системы
const AdvancedRoadSystem: React.FC<AdvancedRoadSystemProps> = ({ links, zoneObjects }) => {
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
        console.log('🔗 AdvancedRoadSystem: Objects not found for link:', link.id)
        return
      }
      
      console.log('🔗 AdvancedRoadSystem: Creating road between objects:', {
        from: { id: fromObject.id, q: fromObject.q, r: fromObject.r },
        to: { id: toObject.id, q: toObject.q, r: toObject.r }
      })
      
      // Находим кратчайший путь между объектами
      const path = findShortestPath(fromObject, toObject, zoneObjects)
      
      console.log('🔗 AdvancedRoadSystem: Path found:', path)
      
      if (path.length === 0) {
        console.log('🔗 AdvancedRoadSystem: No path found between objects')
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
        
        console.log('🔗 AdvancedRoadSystem: Cell segment:', {
          cell: { q: cell.q, r: cell.r },
          entrySide,
          exitSide,
          type: getSegmentType(entrySide, exitSide)
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
    
    console.log('🔗 AdvancedRoadSystem: Total segments created:', segments.length)
    return segments
  }, [links, zoneObjects])
  
  return (
    <group>
      {roadSegments.map(segment => (
        <group key={segment.id}>
          {segment.segmentData.type === 'straight' ? (
            <StraightRoadSegment
              position={segment.segmentData.position}
              rotation={segment.segmentData.rotation}
              length={segment.segmentData.length}
              width={segment.segmentData.width}
              linkType={segment.linkType}
            />
          ) : (
            <CurvedRoadSegment
              position={segment.segmentData.position}
              entryAngle={segment.segmentData.entryAngle}
              exitAngle={segment.segmentData.exitAngle}
              isClockwise={segment.segmentData.isClockwise}
              radius={segment.segmentData.radius}
              linkType={segment.linkType}
            />
          )}
        </group>
      ))}
    </group>
  )
}

export default AdvancedRoadSystem
