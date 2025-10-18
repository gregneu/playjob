import React, { useMemo } from 'react'
import { UnifiedHexCell, HexCellState } from './UnifiedHexCell'
import { ZoneObjectComponent } from './buildings/BuildingComponents'
import * as THREE from 'three'
// import { HexFillComponent } from './buildings/HexFillComponent'
import { hexToWorldPosition } from '../lib/hex-utils'
// import { useZoneHexFilling } from '../hooks/useZoneHexFilling'
import type { BuildingNotifications } from '../types/notifications'

type MeetingParticipantInfo = {
  id: string
  name: string
  avatarUrl?: string
  avatarConfig?: any
  userId?: string
}

interface HexGridProps {
  zones: Array<{
    id: string
    name: string
    color: string
    center: [number, number]
    cells: Array<[number, number]>
  }>
  registerHoverTarget?: (key: string, mesh: THREE.Object3D) => void
  unregisterHoverTarget?: (key: string) => void
  zoneObjects?: Array<{
    id: string
    q: number
    r: number
    object_type: string
    [key: string]: any
  }>
  // Данные зон и ячеек для системы заполнения
  zoneData?: Array<{
    id: string
    name: string
  }>
  zoneCellData?: Array<{
    zone_id: string
    q: number
    r: number
  }>
  ticketsByZoneObject?: Record<string, any[]>
  notificationsByBuilding?: Record<string, BuildingNotifications>
  buildingHasUnreadMentions?: (buildingId: string, ticketsByBuilding: any[]) => boolean
  // Новые пропсы для интерактивности
  isZoneMode?: boolean
  hoveredCell?: [number, number] | null
  hoveredCellType?: string | null
  onCellClick?: (q: number, r: number, mousePosition?: { x: number; y: number }) => void
  onCellHover?: (q: number, r: number) => void
  onCellLeave?: (q: number, r: number) => void
  showZoneNames?: boolean
  // Drag & drop props
  isDraggingTicket?: boolean
  candidateCenterCell?: [number, number] | null
  hoveredCellDuringDrag?: [number, number] | null
  activeSprintObjectId?: string | null
  activeSprintProgress?: { total: number; done: number } | null
  sprintProgressMap?: Record<string, { total: number; done: number }>
  energyPulseMap?: Record<string, { type: 'source' | 'target'; key: string; color: string }>
  badgeAnimationMap?: Record<string, { type: 'gain' | 'lose'; key: string }>
  meetingParticipantsByBuildingId?: Record<string, MeetingParticipantInfo[]>
}

export const SmartHexGrid: React.FC<HexGridProps> = ({ 
  zones, 
  zoneObjects = [],
  zoneData = [],
  zoneCellData = [],
  ticketsByZoneObject = {},
  notificationsByBuilding = {},
  buildingHasUnreadMentions,
  isZoneMode = false, 
  hoveredCell, 
  hoveredCellType, 
  onCellClick, 
  onCellHover, 
  onCellLeave,
  showZoneNames = true,
  isDraggingTicket = false,
  candidateCenterCell = null,
  hoveredCellDuringDrag = null,
  registerHoverTarget,
  unregisterHoverTarget,
  activeSprintObjectId = null,
  activeSprintProgress = null,
  sprintProgressMap = {},
  energyPulseMap,
  badgeAnimationMap,
  meetingParticipantsByBuildingId
}) => {
  const hexSize = 2.0

  // Детерминированная функция для генерации псевдо-случайных чисел
  const deterministicRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Используем систему заполнения гексов - ОТКЛЮЧЕНО
  // const { zoneFillings, getHexFillType, isHexFilled, generateJSON } = useZoneHexFilling({
  //   zones: zoneData.length > 0 ? zoneData : zones.map(z => ({ id: z.id, name: z.name })),
  //   zoneCells: zoneCellData.length > 0 ? zoneCellData : zones.flatMap(z => 
  //     z.cells.map(([q, r]) => ({ zone_id: z.id, q, r }))
  //   ),
  //   seed: 42
  // })

  // Выводим JSON результат в консоль для демонстрации - ОТКЛЮЧЕНО
  // React.useEffect(() => {
  //   if (zoneFillings.length > 0) {
  //     console.log('🌲 Zone Hex Filling Result:')
  //     console.log(generateJSON())
  //   }
  // }, [zoneFillings, generateJSON])




  // Собираем все ячейки из всех зон
  const zoneCells = useMemo(() => {
    const cells: Array<{ q: number; r: number; zoneId: string; zoneColor: string; isCenter: boolean }> = []
    
    zones.forEach(zone => {
      zone.cells.forEach(([q, r]) => {
        const isCenter = q === zone.center[0] && r === zone.center[1]
        cells.push({ q, r, zoneId: zone.id, zoneColor: zone.color, isCenter })
      })
    })
    
    return cells
  }, [zones])

  // Создаем сетку для интерактивности (только видимые ячейки)
  const interactiveCells = useMemo(() => {
    const cells: Array<{ q: number; r: number; state: HexCellState; cellType: string }> = []
    const addedCells = new Set<string>() // Для избежания дубликатов
    
    // Добавляем центральную ячейку проекта
    const centerKey = '0,0'
    if (!addedCells.has(centerKey)) {
      cells.push({ q: 0, r: 0, state: HexCellState.DEFAULT, cellType: 'project-center' })
      addedCells.add(centerKey)
    }
    
    // Добавляем ячейки зон
    zoneCells.forEach(cell => {
      const key = `${cell.q},${cell.r}`
      if (!addedCells.has(key)) {
        cells.push({ 
          q: cell.q, 
          r: cell.r, 
          state: HexCellState.ZONE, 
          cellType: cell.isCenter ? 'project-center' : 'building-slot' 
        })
        addedCells.add(key)
      }
    })
    
    // Добавляем соседние ячейки для создания зон (только в режиме зон)
    if (isZoneMode) {
      zoneCells.forEach(cell => {
        // Добавляем соседей каждой ячейки зоны
        const neighbors = [
          [cell.q + 1, cell.r], [cell.q + 1, cell.r - 1], [cell.q, cell.r - 1],
          [cell.q - 1, cell.r], [cell.q - 1, cell.r + 1], [cell.q, cell.r + 1]
        ]
        neighbors.forEach(([nq, nr]) => {
          const key = `${nq},${nr}`
          if (!addedCells.has(key)) {
            cells.push({ q: nq, r: nr, state: HexCellState.EMPTY, cellType: 'building-slot' })
            addedCells.add(key)
          }
        })
      })
    }
    
    return cells
  }, [zoneCells, isZoneMode])

  // Removed excessive logging - this was called on every render

  return (
    <group>
      {interactiveCells.map((cell) => {
        const isHovered = (hoveredCell && hoveredCell[0] === cell.q && hoveredCell[1] === cell.r) || 
                         (hoveredCellDuringDrag && hoveredCellDuringDrag[0] === cell.q && hoveredCellDuringDrag[1] === cell.r)
        const showPlusIcon = Boolean(isZoneMode && isHovered && hoveredCellType === 'empty')
        
        // Определяем финальное состояние с учетом hover
        const finalState = isHovered ? HexCellState.HOVER : cell.state
        
        // Отладка для центральной ячейки
        if (cell.q === 0 && cell.r === 0) {
          // Removed excessive logging - this was called on every render for central cell
        }
        
        // Отладка обработчиков
        if (cell.q === 0 && cell.r === 0) {
          // Removed excessive logging - this was called on every render for central cell
        }

        // Проверяем, является ли эта ячейка центром зоны
        const zoneCell = zoneCells.find(zc => zc.q === cell.q && zc.r === cell.r)
        const isCenter = zoneCell?.isCenter || false
        
        // Находим зону для этой ячейки
        const zone = zones.find(z => z.id === zoneCell?.zoneId)
        
        // Находим здание для этой ячейки
        // Здание рендерится только в центре зоны
        const building = isCenter && zone ? zoneObjects.find(obj => obj.zone_id === zone.id) : null

        // Определяем, показывать ли камень на этой ячейке
        const shouldShowStone = Boolean(
          cell.state === 'zone' && // Ячейка принадлежит зоне
          !isCenter && // Не центральная ячейка зоны
          !building && // Нет здания на ячейке
          zone // Есть зона
        )
        
        // Генерируем seed для камня на основе координат и зоны
        const stoneSeed = shouldShowStone ? 
          Math.abs((cell.q * 2654435761) ^ (cell.r * 1597334677) ^ (zone?.id?.charCodeAt(0) || 0)) : 0

        // Дополнительная логика: показываем камень с вероятностью 30% для ячеек зоны
        const stoneProbability = shouldShowStone ? (stoneSeed % 100) / 100 : 0
        
        // Гарантируем минимум один камень в зоне: выбираем ячейку с наименьшим seed
        let finalShouldShowStone = shouldShowStone && stoneProbability < 0.3
        let stoneCount = 1
        
        // Логика для деревьев (аналогично камням, но с другими параметрами)
        const shouldShowTrees = Boolean(
          cell.state === 'zone' && // Ячейка принадлежит зоне
          !isCenter && // Не центральная ячейка зоны
          !building && // Нет здания на ячейке
          zone // Есть зона
        )
        
        const treeSeed = shouldShowTrees ? 
          Math.abs((cell.q * 2654435761) ^ (cell.r * 1597334677) ^ (zone?.id?.charCodeAt(0) || 0)) + 10000 : 0
        
        const treeProbability = shouldShowTrees ? (treeSeed % 100) / 100 : 0
        let finalShouldShowTrees = shouldShowTrees && treeProbability < 0.25 // 25% вероятность для деревьев
        let treeCount = 1
        
        if (zone && shouldShowStone) {
          // Находим все ячейки зоны для определения минимального seed
          const zoneCellsForZone = zone.cells
          const zoneCellSeeds = zoneCellsForZone.map(([q, r]) => 
            Math.abs((q * 2654435761) ^ (r * 1597334677) ^ (zone.id.charCodeAt(0) || 0))
          )
          const minSeed = Math.min(...zoneCellSeeds)
          const currentCellSeed = Math.abs((cell.q * 2654435761) ^ (cell.r * 1597334677) ^ (zone.id.charCodeAt(0) || 0))
          
          // Если это ячейка с минимальным seed, гарантируем камень
          if (currentCellSeed === minSeed) {
            finalShouldShowStone = true
            // Для гарантированной ячейки делаем больше камней (2-5)
            stoneCount = 2 + Math.floor(stoneSeed % 4)
          } else if (finalShouldShowStone) {
            // Для обычных ячеек 1-3 камня
            stoneCount = 1 + Math.floor(stoneSeed % 3)
          }
        }
        
        // Аналогичная логика для деревьев
        if (zone && shouldShowTrees) {
          const zoneCellsForZone = zone.cells
          const zoneCellSeeds = zoneCellsForZone.map(([q, r]) => 
            Math.abs((q * 2654435761) ^ (r * 1597334677) ^ (zone.id.charCodeAt(0) || 0)) + 10000
          )
          const minSeed = Math.min(...zoneCellSeeds)
          const currentCellSeed = Math.abs((cell.q * 2654435761) ^ (cell.r * 1597334677) ^ (zone.id.charCodeAt(0) || 0)) + 10000
          
          // Если это ячейка с минимальным seed для деревьев, гарантируем деревья
          if (currentCellSeed === minSeed) {
            finalShouldShowTrees = true
            // Для гарантированной ячейки делаем 2-3 дерева (согласно новым правилам)
            treeCount = 2 + Math.floor(treeSeed % 2) // 2-3 дерева
          } else if (finalShouldShowTrees) {
            // Для обычных ячеек 1-2 дерева
            treeCount = 1 + Math.floor(treeSeed % 2) // 1-2 дерева
          }
        }

        // Вычисляем количество тикетов в зоне
        // Тикеты хранятся по ID здания (zoneObject), а не по ID зоны
        const zoneTicketCount = building ? (ticketsByZoneObject[building.id] || []).length : 0

        const isSprintBuilding = Boolean(building && typeof building.object_type === 'string' && ['sprint', 'mountain'].includes(building.object_type.toLowerCase()))
        const progressEntry = isSprintBuilding && building ? (sprintProgressMap[building.id] ?? { total: 0, done: 0 }) : null
        const sprintProgressForCell = isSprintBuilding
          ? (building?.id && building.id === activeSprintObjectId && activeSprintProgress
              ? activeSprintProgress
              : progressEntry)
          : null
        
        // Отладка: проверяем данные тикетов
        if (isCenter && zone) {
          console.log('🔍 SmartHexGrid ticket debug:', {
            zoneId: zone.id,
            zoneName: zone.name,
            buildingId: building?.id,
            buildingTitle: building?.title,
            ticketsByZone: ticketsByZoneObject[zone.id] || [],
            ticketsByBuilding: building ? (ticketsByZoneObject[building.id] || []) : [],
            zoneTicketCount,
            allTicketKeys: Object.keys(ticketsByZoneObject)
          })
        }

        // Отладка для камней и деревьев
        if (finalShouldShowStone) {
          console.log(`🪨 SmartHexGrid: ${stoneCount} камней размещены на ячейке [${cell.q}, ${cell.r}] в зоне "${zone?.name}"`)
        }
        if (finalShouldShowTrees) {
          console.log(`🌳 SmartHexGrid: ${treeCount} деревьев размещены на ячейке [${cell.q}, ${cell.r}] в зоне "${zone?.name}"`)
        }

        const buildingId = building?.id ?? null
        const pulse = buildingId && energyPulseMap ? energyPulseMap[buildingId] : undefined
        const badgeAnim = buildingId && badgeAnimationMap ? badgeAnimationMap[buildingId] : undefined
        const buildingNotifications = buildingId ? notificationsByBuilding[buildingId] ?? null : null
        const buildingTickets = buildingId ? (ticketsByZoneObject[buildingId] || []) : []
        const mentionNotificationCount = Array.isArray(buildingNotifications?.notifications)
          ? buildingNotifications.notifications.filter((notification) => notification.type === 'comment_mention').length
          : 0
        const commentCountFromNotifications = typeof buildingNotifications?.commentCount === 'number'
          ? buildingNotifications.commentCount
          : 0
        const totalCommentCount = commentCountFromNotifications > 0
          ? commentCountFromNotifications
          : mentionNotificationCount
        const hasUnreadMentions = buildingId && buildingTickets.length > 0 && buildingHasUnreadMentions
          ? buildingHasUnreadMentions(buildingId, buildingTickets)
          : false
        const hasMentions = Boolean(
          typeof buildingNotifications?.hasCommentMentions === 'boolean'
            ? buildingNotifications.hasCommentMentions
            : mentionNotificationCount > 0
        ) || hasUnreadMentions || totalCommentCount > 0
        const assignmentCount = buildingNotifications?.assignmentCount ??
          (Array.isArray(buildingNotifications?.notifications)
            ? buildingNotifications.notifications.filter((notification) => notification.type === 'assignment').length
            : 0)
        const meetingParticipantsForBuilding =
          building && meetingParticipantsByBuildingId
            ? meetingParticipantsByBuildingId[building.id] || []
            : []

        return (
          <group key={`smart-${cell.q}-${cell.r}-${cell.state}-${cell.cellType}`}>
            <UnifiedHexCell
              q={cell.q}
              r={cell.r}
              state={finalState}
              zoneColor={cell.state === 'zone' ? zoneCells.find(zc => zc.q === cell.q && zc.r === cell.r)?.zoneColor : undefined}
              isZoneCenter={isCenter}
              cellType={cell.cellType as any}
              onClick={(q, r, mousePosition) => {
                // Removed excessive logging - this was called on every cell click
                if (onCellClick) {
                  onCellClick(q, r, mousePosition)
                }
              }}
              onPointerEnter={(q, r) => {
                // Removed excessive logging - this was called on every cell hover
                if (onCellHover) {
                  onCellHover(q, r)
                }
              }}
              onPointerLeave={(q, r) => {
                // Removed excessive logging - this was called on every cell leave
                if (onCellLeave) {
                  onCellLeave(q, r)
                }
              }}
              showPlusIcon={showPlusIcon}
              hexSize={hexSize}
              zoneObject={building ? {
                ...building,
                type: building.object_type as any,
                title: building.object_type,
                status: 'open',
                priority: 'medium'
              } : null}
              zoneName={showZoneNames ? (building?.title || zone?.name) : undefined}
              ticketCount={zoneTicketCount}
              commentCount={totalCommentCount}
              hasMentions={hasMentions}
              assignmentCount={assignmentCount}
              showStone={finalShouldShowStone}
              stoneSeed={stoneSeed}
              stoneCount={stoneCount}
              showTrees={finalShouldShowTrees}
              treeSeed={treeSeed}
              treeCount={treeCount}
              registerHoverTarget={registerHoverTarget}
              unregisterHoverTarget={unregisterHoverTarget}
              energyPulse={pulse ? pulse.type : null}
              energyPulseKey={pulse?.key}
              energyPulseColor={pulse?.color ?? null}
              ticketBadgeAnimation={badgeAnim?.type ?? null}
              ticketBadgeAnimationKey={badgeAnim?.key}
              isDragTarget={(() => {
                // Drag target только если ячейка под курсором И является центром зоны И идет drag операция
                const isHovered = hoveredCellDuringDrag && 
                  hoveredCellDuringDrag[0] === cell.q && 
                  hoveredCellDuringDrag[1] === cell.r
                const result = Boolean(isDraggingTicket && isHovered && isCenter)
                if (result) {
                  console.log('🟢 SmartHexGrid: isDragTarget = true for cell [', cell.q, ',', cell.r, ']', {
                    isDraggingTicket,
                    isHovered,
                    isCenter,
                    currentCell: [cell.q, cell.r],
                    hoveredCellDuringDrag
                  })
                }
                return result
              })()}
              meetingParticipants={meetingParticipantsForBuilding}
              onMeetingClick={
                meetingParticipantsForBuilding.length > 0 && onCellClick
                  ? () => onCellClick(cell.q, cell.r)
                  : undefined
              }
              sprintProgress={sprintProgressForCell || undefined}
            />
            
            {/* Отладочный бейдж для центральных ячеек убран */}
          </group>
        )
      })}

      {/* Новая система заполнения гексов объектами - ОТКЛЮЧЕНА */}
      {/* {zones.map((zone) => {
        return zone.cells.map(([q, r]) => {
          // Проверяем, является ли эта ячейка центром зоны (центр не заполняется)
          const isCenter = q === zone.center[0] && r === zone.center[1]
          if (isCenter) return null

          // Получаем тип заполнения для этого гекса
          const fillType = getHexFillType(zone.id, q, r)
          if (!fillType) return null

          // Получаем мировые координаты гекса
          const [x, , z] = hexToWorldPosition(q, r, hexSize)
          
          // Создаем seed на основе координат для детерминированности
          const hexSeed = q * 1000 + r * 100 + zone.id.length

          return (
            <group key={`hex-fill-${zone.id}-${q}-${r}`} position={[x, 0, z]}>
              <HexFillComponent 
                fillType={fillType}
                seed={hexSeed}
              />
            </group>
          )
        })
      }).flat().filter(Boolean)} */}

      {/* Zone Objects теперь рендерятся в UnifiedHexCell */}
    </group>
  )
}

export default SmartHexGrid
