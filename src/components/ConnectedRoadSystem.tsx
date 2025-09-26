import React, { useMemo } from 'react'
import { useProjectData } from '../hooks/useProjectData'
import { hexToWorldPosition, getNeighbors, hexDistance } from '../lib/hex-utils'

// Создание простых дорожных сегментов для каждой ячейки
const createRoadSegments = (
  path: Array<{ q: number; r: number }>,
  fromObject: { q: number; r: number },
  toObject: { q: number; r: number },
  hexToWorldPosition: (q: number, r: number) => [number, number, number]
) => {
  if (path.length === 0) return []
  
  const segments: Array<{
    position: [number, number, number]
    rotation: [number, number, number]
    length: number
    width: number
    type: 'straight' | 'curved'
  }> = []
  
  // Размер гексагональной ячейки (радиус)
  const HEX_SIZE = 1.0
  
  // Длина сегмента от стены к стене (длинной стороне к длинной стороне)
  const segmentLength = HEX_SIZE * 2 * Math.cos(Math.PI / 6) // примерно 1.732
  
  // Функция для определения стороны ячейки (0-5)
  const getCellSide = (fromQ: number, fromR: number, toQ: number, toR: number): number => {
    const deltaQ = toQ - fromQ
    const deltaR = toR - fromR
    
    if (deltaQ > 0 && deltaR === 0) return 0      // право
    if (deltaQ > 0 && deltaR < 0) return 1       // верх-право
    if (deltaQ === 0 && deltaR < 0) return 2     // верх-лево
    if (deltaQ < 0 && deltaR === 0) return 3     // лево
    if (deltaQ < 0 && deltaR > 0) return 4       // низ-лево
    if (deltaQ === 0 && deltaR > 0) return 5     // низ-право
    
    return 0 // по умолчанию
  }
  
  // Добавляем сегмент от объекта до первой ячейки
  const [firstCellX, , firstCellZ] = hexToWorldPosition(path[0].q, path[0].r)
  
  const entrySide = getCellSide(fromObject.q, fromObject.r, path[0].q, path[0].r)
  const exitSide = getCellSide(path[0].q, path[0].r, path.length > 1 ? path[1].q : toObject.q, path.length > 1 ? path[1].r : toObject.r)
  
  console.log(`🔗 Первая ячейка (${path[0].q},${path[0].r}): Вход ${entrySide} → Выход ${exitSide}`)
  
  // Поворачиваем на 30 градусов (π/6) чтобы дорога шла от стены к стене
  const wallRotation = (entrySide * Math.PI) / 3 + Math.PI / 6
  
  segments.push({
    position: [firstCellX, 0.05, firstCellZ],
    rotation: [0, wallRotation, 0],
    length: segmentLength,
    width: 0.4,
    type: Math.abs(entrySide - exitSide) === 3 ? 'straight' : 'curved'
  })
  
  // Добавляем сегменты для каждой ячейки в пути
  for (let i = 0; i < path.length; i++) {
    const [cellX, , cellZ] = hexToWorldPosition(path[i].q, path[i].r)
    
    if (i < path.length - 1) {
      const currentQ = path[i].q
      const currentR = path[i].r
      const nextQ = path[i + 1].q
      const nextR = path[i + 1].r
      
      const currentSide = getCellSide(currentQ, currentR, nextQ, nextR)
      const nextSide = i < path.length - 2 ? 
        getCellSide(nextQ, nextR, path[i + 2].q, path[i + 2].r) :
        getCellSide(nextQ, nextR, toObject.q, toObject.r)
      
      console.log(`🔗 Ячейка ${i} (${currentQ},${currentR}): Вход ${currentSide} → Выход ${nextSide}`)
      
      // Поворачиваем на 30 градусов (π/6) чтобы дорога шла от стены к стене
      const wallRotation = (currentSide * Math.PI) / 3 + Math.PI / 6
      
      segments.push({
        position: [cellX, 0.05, cellZ],
        rotation: [0, wallRotation, 0],
        length: segmentLength,
        width: 0.4,
        type: Math.abs(currentSide - nextSide) === 3 ? 'straight' : 'curved'
      })
    }
  }
  
  // Добавляем сегмент от последней ячейки до объекта
  const [lastCellX, , lastCellZ] = hexToWorldPosition(path[path.length - 1].q, path[path.length - 1].r)
  
  const lastEntrySide = path.length > 1 ? 
    getCellSide(path[path.length - 2].q, path[path.length - 2].r, path[path.length - 1].q, path[path.length - 1].r) :
    getCellSide(fromObject.q, fromObject.r, path[0].q, path[0].r)
  const lastExitSide = getCellSide(path[path.length - 1].q, path[path.length - 1].r, toObject.q, toObject.r)
  
  console.log(`🔗 Последняя ячейка (${path[path.length - 1].q},${path[path.length - 1].r}): Вход ${lastEntrySide} → Выход ${lastExitSide}`)
  
  // Поворачиваем на 30 градусов (π/6) чтобы дорога шла от стены к стене
  const lastWallRotation = (lastEntrySide * Math.PI) / 3 + Math.PI / 6
  
  segments.push({
    position: [lastCellX, 0.05, lastCellZ],
    rotation: [0, lastWallRotation, 0],
    length: segmentLength,
    width: 0.4,
    type: Math.abs(lastEntrySide - lastExitSide) === 3 ? 'straight' : 'curved'
  })
  
  return segments
}

// Компонент для отображения дорожного сегмента
const RoadSegment: React.FC<{
  segment: {
    position: [number, number, number]
    rotation: [number, number, number]
    length: number
    width: number
    type: 'straight' | 'curved'
  }
  linkType: 'primary' | 'secondary'
}> = ({ segment, linkType }) => {
  const roadColor = linkType === 'primary' ? '#2a2a2a' : '#4a4a4a'
  const roadWidth = linkType === 'primary' ? 0.4 : 0.3
  
  return (
    <group position={segment.position} rotation={segment.rotation}>
      {/* Основная дорога */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[segment.length, roadWidth]} />
        <meshStandardMaterial 
          color={roadColor}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      
      {/* Белая центральная линия */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[segment.length, 0.02]} />
        <meshStandardMaterial 
          color="#ffffff"
          roughness={0.3}
          metalness={0.0}
        />
      </mesh>
      
      {/* Белые линии по краям */}
      <mesh position={[0, 0.001, -roadWidth/2 + 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[segment.length, 0.03]} />
        <meshStandardMaterial 
          color="#ffffff"
          roughness={0.3}
          metalness={0.0}
        />
      </mesh>
      <mesh position={[0, 0.001, roadWidth/2 - 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[segment.length, 0.03]} />
        <meshStandardMaterial 
          color="#ffffff"
          roughness={0.3}
          metalness={0.0}
        />
      </mesh>
    </group>
  )
}

// Основной компонент системы дорог
const ConnectedRoadSystem: React.FC = () => {
  const { links, zoneObjects } = useProjectData()
  
  const roadSegments = useMemo(() => {
    console.log('🛣️ ConnectedRoadSystem: Начало создания дорожных сегментов')
    console.log('🛣️ links:', links)
    console.log('🛣️ zoneObjects:', zoneObjects)
    
    if (!links || !zoneObjects) {
      console.log('🛣️ ConnectedRoadSystem: Данные не загружены')
      return []
    }
    
    const segments: Array<{
      id: string
      segment: {
        position: [number, number, number]
        rotation: [number, number, number]
        length: number
        width: number
        type: 'straight' | 'curved'
      }
      linkType: 'primary' | 'secondary'
    }> = []
    
    console.log('🛣️ Создание дорожных сегментов...')
    console.log(`📊 Найдено связей: ${links.length}`)
    console.log(`📊 Найдено объектов: ${zoneObjects.length}`)
    
    links.forEach((link, index) => {
      console.log(`🔗 Обработка связи ${index + 1}:`, link)
      
      const fromObject = zoneObjects.find(obj => obj.id === link.from_object_id)
      const toObject = zoneObjects.find(obj => obj.id === link.to_object_id)
      
      console.log(`🔗 fromObject:`, fromObject)
      console.log(`🔗 toObject:`, toObject)
      
      if (!fromObject || !toObject) {
        console.log(`⚠️ Не найден объект для связи ${link.id}`)
        console.log(`⚠️ from_object_id: ${link.from_object_id}`)
        console.log(`⚠️ to_object_id: ${link.to_object_id}`)
        console.log(`⚠️ Доступные объекты:`, zoneObjects.map(obj => ({ id: obj.id, name: obj.name })))
        return
      }
      
      console.log(`🔗 Связь ${index + 1}: ${fromObject.name} → ${toObject.name}`)
      console.log(`📍 От: (${fromObject.q}, ${fromObject.r})`)
      console.log(`📍 К: (${toObject.q}, ${toObject.r})`)
      
      // Простой поиск пути - прямая линия между объектами
      const path = findPath(fromObject, toObject, zoneObjects)
      
      console.log(`🛤️ Найденный путь:`, path)
      
      if (path.length === 0) {
        console.log(`⚠️ Путь не найден для связи ${link.id}`)
        return
      }
      
      console.log(`🛤️ Путь найден: ${path.length} ячеек`)
      
      const linkSegments = createRoadSegments(path, fromObject, toObject, hexToWorldPosition)
      
      console.log(`🛤️ Созданные сегменты:`, linkSegments)
      
      linkSegments.forEach((segment, segmentIndex) => {
        segments.push({
          id: `${link.id}-segment-${segmentIndex}`,
          segment,
          linkType: (link.link_type || 'primary') as 'primary' | 'secondary'
        })
      })
    })
    
    console.log(`✅ Создано сегментов дорог: ${segments.length}`)
    console.log(`✅ Финальные сегменты:`, segments)
    return segments
  }, [links, zoneObjects])
  
  return (
    <group>
      {roadSegments.map(roadSegment => (
        <RoadSegment
          key={roadSegment.id}
          segment={roadSegment.segment}
          linkType={roadSegment.linkType}
        />
      ))}
    </group>
  )
}

// Простая функция поиска пути
const findPath = (
  fromObject: { q: number; r: number },
  toObject: { q: number; r: number },
  zoneObjects: Array<{ q: number; r: number }>
): Array<{ q: number; r: number }> => {
  const path: Array<{ q: number; r: number }> = []
  
  // Простой алгоритм - прямая линия между объектами
  const currentQ = fromObject.q
  const currentR = fromObject.r
  const targetQ = toObject.q
  const targetR = toObject.r
  
  let q = currentQ
  let r = currentR
  
  while (q !== targetQ || r !== targetR) {
    // Определяем направление движения
    const deltaQ = targetQ - q
    const deltaR = targetR - r
    
    if (deltaQ > 0) q++
    else if (deltaQ < 0) q--
    
    if (deltaR > 0) r++
    else if (deltaR < 0) r--
    
    // Проверяем, не занята ли ячейка объектом
    const isOccupied = zoneObjects.some(obj => obj.q === q && obj.r === r)
    
    if (!isOccupied) {
      path.push({ q, r })
    }
  }
  
  return path
}

export default ConnectedRoadSystem
