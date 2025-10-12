import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RTSCamera } from './RTSCamera'
import { UnifiedHexCell } from './UnifiedHexCell'
import type { HexCellState } from './UnifiedHexCell'
import { SmartHexGrid } from './SmartHexGrid'
// import { HybridHexGridSystem } from './HybridHexGridSystem' // Отключено
import { ZoneSelectionTool } from './ZoneSelectionTool'
// import { CellBadge } from './CellBadge'
import { ZoneObjectCreator } from './ZoneObjectCreator'
import RadialMenu from './RadialMenu'
import { setDragImage, type DragGhostData } from '../utils/dragGhost'


import { hexToWorldPosition, worldToHexPosition, getNeighbors, calculateHexZoneCenter } from '../lib/hex-utils'

// import { getBuildingCategory, generateTaskName } from '../types/cellCategories'
import { useProjectData } from '../hooks/useProjectData'
// import type { Zone } from '../types/enhanced'
import { BuildingType } from '../types/building'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { GlassPanel } from './GlassPanel'
import { ObjectDetailsPanel } from './ObjectDetailsPanel'
import { ZoneObjectDetailsPanel } from './ZoneObjectDetailsPanel'
import { supabase, checkColorFieldExists } from '../lib/supabase'
import { Vegetation } from './Vegetation'
import { DustBurst } from './effects/DustBurst'
import { TicketBeamEffects, type BeamLifecyclePayload } from './effects/TicketBeamEffects'
import { ZoneColorPicker } from './ZoneColorPicker'
import BottomTapbar from './BottomTapbar'
import ConnectedRoadSystem from './ConnectedRoadSystem'
import TicketDetailsModal from './TicketDetailsModal'
import TicketCard from './TicketCard'
import Sidebar from './Sidebar'
import SprintSidebar, { type SprintSidebarTicket } from './SprintSidebar'
import { RobotCar } from './RobotCar'
import { WindProvider } from './WindSystem'
import { type RocketTicketGhostStatus } from './RocketTicketGhost'
import { 
  addHybridEventListener, 
  removeHybridEventListener,
  type HybridDragData 
} from '../utils/hybridDragEvents'
// import { PerformanceMonitor } from './PerformanceMonitor' // Removed
// import DragTestElement from './DragTestElement' // Removed
import './HexGridSystem.css'

type CellState = 'empty' | 'occupied' | 'highlighted' | 'hidden'

interface EnhancedHexCell {
  coordinates: [number, number]
  type: 'project-center' | 'building-slot' | 'hidden-slot'
  state: CellState
  buildingType?: BuildingType | string | null
  category?: string
  taskName?: string
  progress?: number
  priority?: number
}

interface RocketTicketCopy {
  ticketId: string
  status: RocketTicketGhostStatus
  title: string
  ticketType: 'story' | 'task' | 'bug' | 'test'
  priority?: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh' | null
  assigneeId?: string | null
  assigneeName?: string | null
  originZoneObjectId: string | null
}

interface ZoneMarking {
  id: string
  name: string
  color: string
  cells: Array<[number, number]> // hex coordinates
  createdAt: Date
}

// Helper component to expose the current R3F camera to parent scope
const CameraBridge: React.FC<{ onReady: (camera: THREE.Camera) => void }> = ({ onReady }) => {
  const { camera } = useThree()
  useEffect(() => { onReady(camera) }, [camera, onReady])
  return null
}



// Компонент для отслеживания высоты камеры - ОТКЛЮЧЕН для производительности
// const CameraTracker: React.FC<{ onHeightChange: (height: number) => void }> = ({ onHeightChange }) => {
//   return null
// }

// Глобальный слушатель анимации перемещения тикетов внутри Canvas
// Safe UUID generator: prefers crypto.randomUUID, falls back to RFC4122 v4 via getRandomValues, then Math.random
const generateUUID = (): string => {
  try {
    const c: any = (globalThis as any).crypto
    if (c && typeof c.randomUUID === 'function') {
      return c.randomUUID()
    }
  } catch {}
  try {
    const c: any = (globalThis as any).crypto
    if (c && typeof c.getRandomValues === 'function') {
      const bytes = new Uint8Array(16)
      c.getRandomValues(bytes)
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const toHex = (n: number) => n.toString(16).padStart(2, '0')
      const hex = Array.from(bytes, toHex).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
  } catch {}
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}
interface HexGridSystemProps {
  projectId: string
}

export const HexGridSystem: React.FC<HexGridSystemProps> = ({ projectId }) => {
  console.log('=== HEXGRIDSYSTEM RENDER ===')
  console.log('Project ID:', projectId)
  console.log('Project ID type:', typeof projectId)
  console.log('Project ID length:', projectId?.length)
  console.log('Project ID is valid UUID:', /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(projectId || ''))
  
  // Get current user
  const { user } = useAuth()
  
  // Use hook for working with server data
  const {
    zones,
    zoneCells,
    hexCells,
    // buildings,
    zoneObjects,
    loading,
    error,
    createZone,
    deleteZone,
    // createBuilding,
    // deleteBuilding,
    createZoneObject,
    updateZoneObject,
    updateZoneObjectPosition,
    getZoneForCell,
    getBuildingForCell,
    getZoneObjectForCell,
    reloadData,
    ticketsByZoneObject,
    createTicketForZoneObject,
    updateTicket,
    moveTicket
  } = useProjectData(projectId)

  // Get all tickets for notification tracking
  const allTickets = useMemo(() => {
    return Object.values(ticketsByZoneObject).flat()
  }, [ticketsByZoneObject])

  // Track all notifications (mentions, status changes, etc.)
  const { 
    notificationsByBuilding,
    buildingHasUnreadMentions,
    reload: reloadNotifications 
  } = useNotifications({
    projectId,
    tickets: allTickets,
    userId: user?.id || null,
    userEmail: user?.email || user?.user_metadata?.email || null,
    userDisplayName: (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.display_name as string | undefined) ||
      user?.email || null
  })

  // Current user id for user-scoped counters (теперь не используется, так как имена рендерятся в UnifiedHexCell)
  // const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Проверяем существование поля color в таблице zone_objects при загрузке компонента
  useEffect(() => {
    let cancelled = false
    checkColorFieldExists()
      .then((exists) => {
        if (cancelled) return
        if (exists) {
          console.log('✅ Color field exists in database')
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  const [isSprintOpen, setIsSprintOpen] = useState(false)
  const [sprintObjectId, setSprintObjectId] = useState<string | null>(null)
  const [sprintWeeks, setSprintWeeks] = useState<number>(2)
  const [isSprintStarted, setIsSprintStarted] = useState(false)
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null)
  const [sprintStartedAt, setSprintStartedAt] = useState<Date | null>(null)
  const [isSprintActionLoading, setIsSprintActionLoading] = useState(false)
  const [isSprintStateLoaded, setIsSprintStateLoaded] = useState(false)
  
  // Улучшенные состояния для drag & drop
  const [isDraggingTicket, setIsDraggingTicket] = useState(false)
  const [hoveredCellDuringDrag, setHoveredCellDuringDrag] = useState<[number, number] | null>(null)
  const [candidateCenterCell, setCandidateCenterCell] = useState<[number, number] | null>(null)
  const [pendingTicketType, setPendingTicketType] = useState<'story' | 'task' | 'bug' | 'test' | null>(null)
  
  // Ref для canvas и hover targets
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverTargetsRef = useRef<Map<string, THREE.Object3D>>(new Map())
  const rocketCopiesRef = useRef<RocketTicketCopy[]>([])
  
  // Функции для регистрации hover targets
  const registerHoverTarget = useCallback((key: string, mesh: THREE.Object3D) => {
    console.log('🎯 registerHoverTarget called for key:', key, 'mesh:', mesh)
    hoverTargetsRef.current.set(key, mesh)
    console.log('🎯 hoverTargetsRef size after registration:', hoverTargetsRef.current.size)
  }, [])
  
  const unregisterHoverTarget = useCallback((key: string) => {
    console.log('🎯 unregisterHoverTarget called for key:', key)
    hoverTargetsRef.current.delete(key)
    console.log('🎯 hoverTargetsRef size after unregistration:', hoverTargetsRef.current.size)
  }, [])
  const [rocketTicketCopies, setRocketTicketCopies] = useState<RocketTicketCopy[]>([])
  const [plannedTickets, setPlannedTickets] = useState<Set<string>>(() => new Set()) // IDs of tickets planned for sprint (per-sprint building)
  const [sprintName, setSprintName] = useState<string>('Sprint')
  const [sprintTickets, setSprintTickets] = useState<Array<{ id: string; title: string; priority?: any; assignee_id?: string | null; zone_object_id?: string | null; sprint_id?: string | null; board_column?: string | null }>>([])
  const [activeSprintNames, setActiveSprintNames] = useState<Record<string, string>>({})
  // Global planned info across all sprint buildings, loaded from localStorage (does NOT require sidebar to be open)
  const [globalPlannedTicketIds, setGlobalPlannedTicketIds] = useState<Set<string>>(() => new Set())
  const [plannedTicketNames, setPlannedTicketNames] = useState<Record<string, string>>({})
  const [plannedCountAtStart, setPlannedCountAtStart] = useState<number | null>(null)
  const [sprintProgressByObject, setSprintProgressByObject] = useState<Record<string, { total: number; done: number }>>({})
  // useEffect(() => {
  //   supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null)).catch(() => setCurrentUserId(null))
  // }, [])

  // Save planned tickets to localStorage for the current Sprint building
  useEffect(() => {
    try {
      if (!sprintObjectId) return
      localStorage.setItem(`planned_tickets_${projectId}_${sprintObjectId}`, JSON.stringify(Array.from(plannedTickets)))
    } catch {}
  }, [plannedTickets, projectId, sprintObjectId])

  useEffect(() => {
    try {
      if (!sprintObjectId) return
      localStorage.setItem(`rocket_copies_${projectId}_${sprintObjectId}`, JSON.stringify(rocketTicketCopies))
    } catch {}
  }, [rocketTicketCopies, projectId, sprintObjectId])

  // Save planned tickets to localStorage for the current Sprint building
  useEffect(() => {
    try {
      if (!sprintObjectId) return
      localStorage.setItem(`planned_tickets_${projectId}_${sprintObjectId}`, JSON.stringify(Array.from(plannedTickets)))
    } catch {}
  }, [plannedTickets, projectId, sprintObjectId])

  useEffect(() => {
    try {
      if (!sprintObjectId) return
      localStorage.setItem(`rocket_copies_${projectId}_${sprintObjectId}`, JSON.stringify(rocketTicketCopies))
    } catch {}
  }, [rocketTicketCopies, projectId, sprintObjectId])

  useEffect(() => {
    setPlannedTickets(new Set(rocketTicketCopies.filter(copy => copy.status === 'planned').map(copy => copy.ticketId)))
  }, [rocketTicketCopies])

  useEffect(() => {
    rocketCopiesRef.current = rocketTicketCopies
  }, [rocketTicketCopies])

  useEffect(() => {
    if (!sprintObjectId) return
    const total = rocketTicketCopies.length
    const done = rocketTicketCopies.filter((copy) => copy.status === 'done').length
    setSprintProgressByObject(prev => ({
      ...prev,
      [sprintObjectId]: { total, done }
    }))
  }, [rocketTicketCopies, sprintObjectId])

  useEffect(() => {
    if (!sprintObjectId || !isSprintStateLoaded) return

    const plannedIds = rocketTicketCopies.filter((copy) => copy.status === 'planned').map((copy) => copy.ticketId)
    const doneIds = rocketTicketCopies.filter((copy) => copy.status === 'done').map((copy) => copy.ticketId)
    const nameToPersist = (sprintName || 'Sprint').trim() || 'Sprint'

    setSprintProgressByObject(prev => ({
      ...prev,
      [sprintObjectId]: {
        total: plannedIds.length + doneIds.length,
        done: doneIds.length
      }
    }))

    if (!activeSprintId && !isSprintStarted && plannedIds.length === 0 && doneIds.length === 0 && nameToPersist === 'Sprint') {
      return
    }

    const timer = setTimeout(() => {
      ;(async () => {
        try {
          const { sprintService } = await import('../lib/supabase')
          const result = await sprintService.saveSprintState({
            sprintId: activeSprintId,
            projectId,
            zoneObjectId: sprintObjectId,
            name: nameToPersist,
            weeks: sprintWeeks,
            plannedTicketIds: plannedIds,
            doneTicketIds: doneIds,
            status: isSprintStarted ? 'active' : 'draft',
            startedAt: isSprintStarted ? (sprintStartedAt ? sprintStartedAt.toISOString() : null) : null
          })
          if (!activeSprintId && result && result.id) {
            setActiveSprintId(result.id)
          }
        } catch (error) {
          console.error('Failed to persist sprint state to Supabase', error)
        }
      })()
    }, 350)

    return () => clearTimeout(timer)
  }, [
    sprintObjectId,
    projectId,
    rocketTicketCopies,
    sprintWeeks,
    sprintName,
    isSprintStarted,
    sprintStartedAt,
    activeSprintId,
    isSprintStateLoaded
  ])

  useEffect(() => {
    try {
      if (!sprintObjectId) return
      localStorage.setItem(`sprint_name_${projectId}_${sprintObjectId}`, sprintName)
    } catch {}
  }, [sprintName, projectId, sprintObjectId])

  // Load map of active sprint names to show planned state without opening Sprint
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        console.log('=== LOADING ACTIVE SPRINT NAMES ===')
        console.log('Project ID:', projectId)
        
        const { supabase } = await import('../lib/supabase')
        const { data, error } = await supabase
          .from('sprints')
          .select('id,name,status,zone_object_id,planned_ticket_ids,done_ticket_ids')
          .eq('project_id', projectId)
          .neq('status', 'completed')

        console.log('Active sprints query result:', { data, error })

        if (error) {
          console.error('Active sprints query error:', error)
          return
        }
        
        if (!cancelled) {
          const map: Record<string, string> = {}
          const progress: Record<string, { total: number; done: number }> = {}
          if (Array.isArray(data)) {
            for (const s of data as any[]) { 
              if (s && s.id) {
                map[s.id] = s.name || 'Sprint'
                console.log(`Sprint ${s.id}: ${s.name || 'Sprint'}`)
                const zoneId = s.zone_object_id
                if (zoneId) {
                  const planned = Array.isArray(s.planned_ticket_ids) ? s.planned_ticket_ids.length : 0
                  const done = Array.isArray(s.done_ticket_ids) ? s.done_ticket_ids.length : 0
                  progress[zoneId] = {
                    total: planned + done,
                    done
                  }
                }
              }
            }
          }
          console.log('Active sprint names map:', map)
          setActiveSprintNames(map)
          if (Object.keys(progress).length > 0) {
            setSprintProgressByObject(prev => ({ ...prev, ...progress }))
          }
        }
      } catch (err) {
        console.error('Failed to load active sprint names:', err)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  // Build global set of planned ticket ids and names across ALL sprint buildings for this project
  const recomputeGlobalPlanned = useCallback(() => {
    try {
      const allIds = new Set<string>()
      const idToName: Record<string, string> = {}
      const progressMap: Record<string, { total: number; done: number }> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        if (key.startsWith(`planned_tickets_${projectId}_`)) {
          const objId = key.split(`planned_tickets_${projectId}_`)[1]
          const raw = localStorage.getItem(key)
          if (raw) {
            try {
              const ids = JSON.parse(raw) as string[]
              if (Array.isArray(ids)) {
                const name = localStorage.getItem(`sprint_name_${projectId}_${objId}`) || 'Sprint'
                for (const tid of ids) {
                  allIds.add(tid)
                  if (name) idToName[tid] = name
                }
                if (!progressMap[objId]) {
                  progressMap[objId] = { total: ids.length, done: 0 }
                }
              }
            } catch {}
          }
        }
        if (key.startsWith(`rocket_copies_${projectId}_`)) {
          const objId = key.split(`rocket_copies_${projectId}_`)[1]
          const raw = localStorage.getItem(key)
          if (raw) {
            try {
              const copies = JSON.parse(raw)
              if (Array.isArray(copies)) {
                const total = copies.length
                const done = copies.filter((item: any) => String(item?.status || '').toLowerCase() === 'done').length
                progressMap[objId] = { total, done }
              }
            } catch {}
          }
        }
      }
      setGlobalPlannedTicketIds(allIds)
      setPlannedTicketNames(idToName)
      if (Object.keys(progressMap).length > 0) {
        setSprintProgressByObject(prev => ({ ...prev, ...progressMap }))
      }
    } catch {}
  }, [projectId])

  // Initial compute and on project switch
  useEffect(() => { recomputeGlobalPlanned() }, [recomputeGlobalPlanned])

  // Recompute on storage updates from other tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      if (e.key.startsWith(`planned_tickets_${projectId}_`) || e.key.startsWith(`sprint_name_${projectId}_`)) {
        recomputeGlobalPlanned()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [projectId, recomputeGlobalPlanned])

  // Keep global set in sync when local sprint's plannedTickets change
  useEffect(() => {
    recomputeGlobalPlanned()
  }, [plannedTickets, sprintName, sprintObjectId, recomputeGlobalPlanned])

  // Global listener for opening Sprint modal


  // Set global flag to prevent 3D rendering in UserAvatar components
  useEffect(() => {
    console.log('🎭 HexGridSystem: Setting isIn3DScene = true')
    ;(window as any).isIn3DScene = true
    return () => {
      console.log('🎭 HexGridSystem: Setting isIn3DScene = false')
      ;(window as any).isIn3DScene = false
    }
  }, [])
  
  console.log('=== USE PROJECT DATA RESULT ===')
  console.log('Zones:', zones)
  
  // Используем реальные данные из базы данных
  const effectiveZones = zones
  const effectiveZoneCells = zoneCells
  console.log('Zone cells:', zoneCells)
  console.log('Zone objects:', zoneObjects)
  console.log('Loading:', loading)
  console.log('Error:', error)
  
  // Отладка: показываем все ячейки зон
  useEffect(() => {
    if (zoneCells.length > 0) {
      console.log('=== ZONE CELLS DEBUG ===')
      const cellsByZone = zoneCells.reduce((acc, cell) => {
        if (!acc[cell.zone_id]) acc[cell.zone_id] = []
        acc[cell.zone_id].push(`[${cell.q}, ${cell.r}]`)
        return acc
      }, {} as Record<string, string[]>)
      
      Object.entries(cellsByZone).forEach(([zoneId, cells]) => {
        const z = zones.find(z => z.id === zoneId)
        console.log(`Zone "${z?.name}" (${z?.color}): ${cells.join(', ')}`)
      })
    }
  }, [zoneCells, zones])

  // Local states for UI
  const [gridCells, setGridCells] = useState<EnhancedHexCell[]>([])
  const cameraRef = useRef<THREE.Camera | null>(null)
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [isZoneMode, setIsZoneMode] = useState(false)
  
  const [isFlagMode, setIsFlagMode] = useState(false)
  const [flagCells, setFlagCells] = useState<Set<string>>(new Set())
  const [currentZonePath, setCurrentZonePath] = useState<Array<[number, number]>>([])
  
  // States for zone creation
  const [zoneSelectionMode, setZoneSelectionMode] = useState<'idle' | 'selecting' | 'building' | 'extending'>('idle')
  const [firstClickCell, setFirstClickCell] = useState<[number, number] | null>(null)
  const [selectedZoneCells, setSelectedZoneCells] = useState<Set<string>>(new Set())
  const [showTopPanel, setShowTopPanel] = useState(false)
  
  const [selectedZoneColor, setSelectedZoneColor] = useState<string>('')
  const [hoveredCellType, setHoveredCellType] = useState<'empty' | 'adjacent-zone' | 'new-zone' | 'zone-cell' | null>(null)
  const [extendingZoneId, setExtendingZoneId] = useState<string | null>(null)
  const [fixedZoneCells, setFixedZoneCells] = useState<Set<string>>(new Set())
  const [lastExtendingClick, setLastExtendingClick] = useState(0)
  const [localZones, setLocalZones] = useState<ZoneMarking[]>([])
  const [localBuildings] = useState<Array<{
    q: number
    r: number
    buildingType: BuildingType
    category: string
    taskName: string
    progress: number
    priority: number
  }>>([])
  
  // State for hiding zone names
  const [showZoneNames, setShowZoneNames] = useState(true)
  
  // Состояние для color picker
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [colorPickerColor, setColorPickerColor] = useState('#ef4444')
  const [colorPickerZoneId, setColorPickerZoneId] = useState<string | null>(null)
  
  
  
  
  // Обработчик событий для color picker
  useEffect(() => {
    const handleOpenColorPicker = (event: CustomEvent) => {
      console.log('🎨 HexGridSystem: Opening color picker event received:', event.detail)
      console.log('🎨 HexGridSystem: Event detail type:', typeof event.detail)
      console.log('🎨 HexGridSystem: Event detail keys:', Object.keys(event.detail || {}))
      
      const { position, currentColor, zoneId } = event.detail
      console.log('🎨 HexGridSystem: Extracted values:', { position, currentColor, zoneId })
      
      setColorPickerPosition(position)
      setColorPickerColor(currentColor)
      setColorPickerZoneId(zoneId)
      setColorPickerOpen(true)
      
      console.log('🎨 HexGridSystem: Color picker states set:', {
        position,
        currentColor,
        zoneId,
        open: true
      })
    }

    window.addEventListener('open-zone-color-picker', handleOpenColorPicker as EventListener)
    
    return () => {
      window.removeEventListener('open-zone-color-picker', handleOpenColorPicker as EventListener)
    }
  }, [])

  // Функция для сохранения цвета зоны в базу данных
  const saveZoneColor = async (zoneObjectId: string, color: string) => {
    try {
      console.log('🎨 saveZoneColor called with:', { zoneObjectId, color })
      console.log('🎨 Available zoneObjects:', zoneObjects.length)
      
      // Находим зону, к которой принадлежит этот объект
      const zoneObject = zoneObjects.find(obj => obj.id === zoneObjectId)
      if (!zoneObject) {
        console.error('❌ Zone object not found:', zoneObjectId)
        return
      }
      
      const zoneId = (zoneObject as any).zone_id
      if (!zoneId) {
        console.error('❌ Zone ID not found for zone object:', zoneObjectId)
        return
      }
      
      console.log('🎨 Found zone ID:', zoneId, 'for zone object:', zoneObjectId)
      
      // Сохраняем цвет в таблицу zones (единственное место хранения цвета зоны)
      const { error } = await supabase
        .from('zones')
        .update({ color: color })
        .eq('id', zoneId)
      
      if (error) {
        console.error('❌ Failed to save zone color:', error)
      } else {
        console.log('✅ Zone color saved successfully in zones table:', color)
        
        // Обновляем локальное состояние зон для немедленного отображения на карте
        setLocalZones(prev => prev.map(zone => 
          zone.id === zoneId ? { ...zone, color } : zone
        ))
        
        // Серверные зоны обновляются через useProjectData
        
        // Принудительно обновляем gridCells для немедленного отображения на карте
        setGridCells(prev => prev.map(cell => {
          const [q, r] = cell.coordinates
          const cellZone = getZoneForCell(q, r)
          if (cellZone && cellZone.id === zoneId) {
            return { ...cell, zoneColor: color }
          }
          return cell
        }))
        
        // Принудительно обновляем selectedZoneObject для обновления sidebar
        if (selectedZoneObject) {
          const selectedZone = getZoneForCell(selectedZoneObject.cellPosition[0], selectedZoneObject.cellPosition[1])
          if (selectedZone && selectedZone.id === zoneId) {
            // Создаем новый объект с обновленным цветом для принудительного ререндера
            setSelectedZoneObject((prev: any) => prev ? { ...prev } : null)
          }
        }
        
        // Обновляем colorPickerColor для отображения нового цвета в picker
        setColorPickerColor(color)
        
        console.log('🔄 Updated all zone states with new color:', color)
      }
    } catch (error) {
      console.error('❌ Error saving zone color:', error)
    }
  }

  // Синхронизируем localZones с серверными зонами
  useEffect(() => {
    if (zones.length > 0 && localZones.length === 0) {
      console.log('🔄 Syncing localZones with server zones:', zones.length)
      setLocalZones(zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        color: zone.color,
        cells: [], // Будет заполнено из zoneCells
        createdAt: new Date(zone.created_at)
      })))
    }
  }, [zones, localZones.length])

  // Синхронизируем ячейки зон
  useEffect(() => {
    if (zoneCells.length > 0 && localZones.length > 0) {
      console.log('🔄 Syncing zone cells:', zoneCells.length)
      setLocalZones(prev => prev.map(zone => {
        const cells = zoneCells
          .filter(cell => cell.zone_id === zone.id)
          .map(cell => [cell.q, cell.r] as [number, number])
        return { ...zone, cells }
      }))
    }
  }, [zoneCells, localZones.length])

  // Effect для автоматического скрытия лейблов при масштабировании
  useEffect(() => {
    const checkLabelsVisibility = () => {
      // Проверяем размер элементов на экране
      const badges = document.querySelectorAll('[data-zone-badge]')
      if (badges.length === 0) return
      
      const firstBadge = badges[0] as HTMLElement
      const rect = firstBadge.getBoundingClientRect()
      
      // Если размер элемента меньше 8px, скрываем все лейблы (более мягкий порог)
      const shouldHide = rect.width < 8 || rect.height < 8
      console.log('Badge size:', rect.width, 'x', rect.height, 'shouldHide:', shouldHide)
      // setLabelsVisible(!shouldHide) // Removed unused function
    }
    
    // Проверяем каждые 500ms (не каждый кадр!)
    const interval = setInterval(checkLabelsVisibility, 500)
    
    return () => clearInterval(interval)
  }, [])
  
  // State for camera height-based visibility - ОТКЛЮЧЕНО для производительности
  // const [cameraHeight, setCameraHeight] = useState(18)
  // const [showLabelsAtCurrentHeight, setShowLabelsAtCurrentHeight] = useState(true)
  
  // Removed: states for building construction
  
  // State for details panel
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
  
  // Единое состояние для модалки - БЕЗ множественных setState!
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    ticketType: string | null
    cell: [number, number] | null
  }>({ isOpen: false, ticketType: null, cell: null })
  
  // REFACTORED: Removed problematic useEffect - modal opens directly in onDrop

  // Debug: Log zone centers
  useEffect(() => {
    console.log('🏢 Zone centers:', zones.map(z => ({ name: z.name, center: getZoneCenter(z.id) })))
    console.log('🎯 Available drop targets (zone centers):', zones.map(z => getZoneCenter(z.id)))
  }, [zones])
  const [dragTicketId, setDragTicketId] = useState<string | null>(null)
  const [sourcePulses, setSourcePulses] = useState<Record<string, { key: string; color: string }>>({})
  const [targetPulses, setTargetPulses] = useState<Record<string, { key: string; color: string }>>({})
  const [badgeAnimations, setBadgeAnimations] = useState<Record<string, { type: 'gain' | 'lose'; key: string }>>({})
  const pulseTimeoutsRef = useRef<number[]>([])
  const badgeTimeoutsRef = useRef<number[]>([])

  const schedulePulse = useCallback((
    zoneObjectId: string | null | undefined,
    type: 'source' | 'target',
    color: string,
    duration = 1400
  ) => {
    if (!zoneObjectId || typeof window === 'undefined') return null
    const key = generateUUID()
    const setter = type === 'source' ? setSourcePulses : setTargetPulses
    setter((prev) => ({
      ...prev,
      [zoneObjectId]: { key, color }
    }))
    const timeoutId = window.setTimeout(() => {
      setter((prev) => {
        const entry = prev[zoneObjectId]
        if (!entry || entry.key !== key) return prev
        const next = { ...prev }
        delete next[zoneObjectId]
        return next
      })
      pulseTimeoutsRef.current = pulseTimeoutsRef.current.filter((id) => id !== timeoutId)
    }, duration)
    pulseTimeoutsRef.current.push(timeoutId)
    return key
  }, [])

  const scheduleBadgeAnimation = useCallback((
    zoneObjectId: string | null | undefined,
    type: 'gain' | 'lose',
    duration = type === 'gain' ? 680 : 520
  ) => {
    if (!zoneObjectId || typeof window === 'undefined') return null
    const key = generateUUID()
    setBadgeAnimations((prev) => ({
      ...prev,
      [zoneObjectId]: { type, key }
    }))
    const timeoutId = window.setTimeout(() => {
      setBadgeAnimations((prev) => {
        const entry = prev[zoneObjectId]
        if (!entry || entry.key !== key) return prev
        const next = { ...prev }
        delete next[zoneObjectId]
        return next
      })
      badgeTimeoutsRef.current = badgeTimeoutsRef.current.filter((id) => id !== timeoutId)
    }, duration)
    badgeTimeoutsRef.current.push(timeoutId)
    return key
  }, [])

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return
      pulseTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
      badgeTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
      pulseTimeoutsRef.current = []
      badgeTimeoutsRef.current = []
    }
  }, [])

  const handleBeamStart = useCallback((payload: BeamLifecyclePayload) => {
    if (!payload?.fromId) return
    if (payload.fromId === payload.toId) return
    schedulePulse(payload.fromId, 'source', payload.colorScheme.start, 1250)
    scheduleBadgeAnimation(payload.fromId, 'lose', 540)
  }, [scheduleBadgeAnimation, schedulePulse])

  const handleBeamImpact = useCallback((payload: BeamLifecyclePayload) => {
    if (!payload?.toId) return
    const impactColor = payload.colorScheme.spark || payload.colorScheme.middle
    schedulePulse(payload.toId, 'target', impactColor, 1550)
    scheduleBadgeAnimation(payload.toId, 'gain', 720)
  }, [scheduleBadgeAnimation, schedulePulse])

  const handleBeamFinish = useCallback((_payload: BeamLifecyclePayload) => {
    // Reserved for future cleanup hooks if necessary
  }, [])

  const energyPulseMap = useMemo(() => {
    const map: Record<string, { type: 'source' | 'target'; key: string; color: string }> = {}
    Object.entries(sourcePulses).forEach(([zoneObjectId, entry]) => {
      map[zoneObjectId] = { type: 'source', key: entry.key, color: entry.color }
    })
    Object.entries(targetPulses).forEach(([zoneObjectId, entry]) => {
      map[zoneObjectId] = { type: 'target', key: entry.key, color: entry.color }
    })
    return map
  }, [sourcePulses, targetPulses])
  
  // Ref для отслеживания состояния перетаскивания в обработчиках событий
  const isDraggingRef = useRef<boolean>(false)
  
  // Исправленный обработчик ticket-dragstart
  useEffect(() => {
    console.log('🔧 HexGridSystem: Setting up ticket-dragstart event listeners')
    
    const handleTicketDragStart = (e: CustomEvent) => {
      console.log('🚀 ticket-dragstart received:', e.detail)
      
      // ВАЖНО: Обновляем и ref, и state
      isDraggingRef.current = true
      setIsDraggingTicket(true)
      console.log('🔧 isDraggingRef.current set to:', isDraggingRef.current)
      
      // Сохраняем информацию о тикете для использования в onDrop
      const ticketDetail = e.detail
      console.log('🔍 ticket-dragstart detail analysis:', {
        hasTicketId: Boolean(ticketDetail?.ticketId),
        hasFromZoneObjectId: Boolean(ticketDetail?.fromZoneObjectId),
        hasType: Boolean(ticketDetail?.type),
        type: ticketDetail?.type
      })
      
      if (ticketDetail) {
        if (ticketDetail.ticketId && ticketDetail.fromZoneObjectId) {
          // Это существующий тикет - сохраняем полную информацию
          console.log('📝 Setting pendingTicketType for existing ticket:', ticketDetail)
          setPendingTicketType(ticketDetail)
          schedulePulse(ticketDetail.fromZoneObjectId, 'source', '#38bdf8', 950)
        } else if (ticketDetail.type) {
          // Это новый тикет - сохраняем только тип
          console.log('📝 Setting pendingTicketType for new ticket:', ticketDetail.type)
          setPendingTicketType(ticketDetail.type)
        } else {
          console.log('⚠️ No valid ticket info found in drag start event')
        }
      }
      
      console.log('✅ isDraggingRef.current set to true')
    }
    
    const handleTicketDragEnd = () => {
      console.log('🎯 ticket-dragend received')
      
      // Сбрасываем и ref, и state
      isDraggingRef.current = false
      setIsDraggingTicket(false)
      setCandidateCenterCell(null)
      
      // НЕ сбрасываем pendingTicketType здесь - он должен остаться для открытия модалки
      // setPendingTicketType будет сброшен в handleZoneObjectCreatorClose
      
      console.log('✅ isDraggingRef.current reset to false')
    }
    
    console.log('🔧 HexGridSystem: Adding event listeners for ticket-dragstart and ticket-dragend')
    
    // Глобальный обработчик для отладки
    const globalDebugHandler = (e: any) => {
      console.log('🔍 GLOBAL DEBUG: ticket-dragstart event received:', e.detail)
    }
    window.addEventListener('ticket-dragstart', globalDebugHandler)
    
    window.addEventListener('ticket-dragstart', handleTicketDragStart as any)
    window.addEventListener('ticket-dragend', handleTicketDragEnd as any)
    console.log('🔧 HexGridSystem: Event listeners added successfully')
    
    return () => {
      window.removeEventListener('ticket-dragstart', globalDebugHandler)
      window.removeEventListener('ticket-dragstart', handleTicketDragStart as any)
      window.removeEventListener('ticket-dragend', handleTicketDragEnd as any)
    }
  }, [])
  
  // Функция для поиска ячейки под курсором (для гибридных событий)
  const findCellUnderCursor = useCallback((clientX: number, clientY: number) => {
    if (!cameraRef.current) return null
    
    // Получаем canvas элемент
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    
    const rect = canvas.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, cameraRef.current)
    
    // Получаем все объекты для проверки
    const targets = Array.from(hoverTargetsRef.current.values())
    const intersects = raycaster.intersectObjects(targets, false)
    
    if (intersects.length > 0) {
      const hit = intersects[0]
      const userData = hit.object.userData
      
      if (userData && userData.isBuilding) {
        console.log('✅ Found building cell:', { q: userData.q, r: userData.r })
        return { q: userData.q, r: userData.r }
      }
    }
    
    console.log('❌ No building cell found under cursor')
    return null
  }, [])
  

  
  const [hoverCellWhileDragging, setHoverCellWhileDragging] = useState<[number, number] | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [selectedTicketPosition, setSelectedTicketPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  
  // Sync selectedTicket with realtime updates from ticketsByZoneObject
  useEffect(() => {
    if (!selectedTicket || !isTicketModalOpen) return
    
    // Find updated ticket data in ticketsByZoneObject
    const zoneObjectId = selectedTicket.zone_object_id
    if (!zoneObjectId) return
    
    const ticketList = ticketsByZoneObject[zoneObjectId] || []
    const updatedTicket = ticketList.find(t => t.id === selectedTicket.id)
    
    if (updatedTicket) {
      console.log('🔄 Syncing selectedTicket with realtime update:', {
        ticketId: updatedTicket.id,
        oldCommentCount: selectedTicket.comments?.length || 0,
        newCommentCount: updatedTicket.comments?.length || 0
      })
      setSelectedTicket({ ...updatedTicket, zone_object_id: zoneObjectId })
    }
  }, [ticketsByZoneObject, selectedTicket?.id, selectedTicket?.zone_object_id, isTicketModalOpen])
  
  // Helper: play drop sound (declare before any conditional returns)
  const playDropSound = useCallback(() => {
    // Sound disabled - no audio playback
    return
  }, [])

  // Dynamic scale for zone badges depending on camera proximity
  const [badgeScale, setBadgeScale] = useState(0.5)
  useEffect(() => {
    let raf: number
    const tick = () => {
      try {
        const cam = cameraRef.current
        if (cam) {
          const camY = cam.position.y
          const next = camY < 10 ? 0.7 : 0.5
          if (next !== badgeScale) setBadgeScale(next)
        }
      } catch {}
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [badgeScale])

  // Track whether mouse is over the sidebar to block canvas interactions
  const [isSidebarHover, setIsSidebarHover] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      const hover = Boolean(e?.detail?.hover)
      setIsSidebarHover(hover)
    }
    window.addEventListener('sidebar-hover', handler as any)
    // Safety: reset on unmount
    return () => {
      setIsSidebarHover(false)
      window.removeEventListener('sidebar-hover', handler as any)
    }
  }, [])
  
  // States for radial menu
  const [showRadialMenu, setShowRadialMenu] = useState(false)
  const [radialMenuPosition, setRadialMenuPosition] = useState<[number, number] | null>(null)
  const [radialMenuWorldPosition, setRadialMenuWorldPosition] = useState<[number, number, number] | null>(null)
  const [radialMenuMousePosition, setRadialMenuMousePosition] = useState<[number, number] | null>(null)
  const setSelectedRadialOption = (_: string | null) => {}
  
  const [selectedTask, setSelectedTask] = useState<any>(null)
  
  // State for camera hints
  

  // Ephemeral dust effects queue
  const [dustBursts, setDustBursts] = useState<Array<{ id: string; pos: [number, number, number] }>>([])
  const dustPlayedRef = useRef<Set<string>>(new Set())

  // Trigger dust once for newly appeared story objects
  useEffect(() => {
    const stories = (zoneObjects || []).filter((o) => o.object_type === 'story')
    for (const obj of stories) {
      const effectId = `story-${obj.id}`
      if (!dustPlayedRef.current.has(effectId)) {
        const [x, , z] = hexToWorldPosition(obj.q, obj.r)
        setDustBursts((prev) => [...prev, { id: effectId, pos: [x, 0, z] }])
        dustPlayedRef.current.add(effectId)
      }
    }
  }, [zoneObjects])

  // Function for saving task changes
  const handleTaskSave = async (updatedTask: any) => {
    console.log('=== SAVING TASK CHANGES ===')
    console.log('Updated task object:', updatedTask)
    console.log('Task ID:', updatedTask?.id)
    console.log('Title:', updatedTask?.title)
    console.log('Description:', updatedTask?.description)
    console.log('Status:', updatedTask?.status)
    console.log('Priority:', updatedTask?.priority)
    console.log('Story Points:', updatedTask?.storyPoints)
    
    // Automatic saving to database
    try {
      if (updatedTask && updatedTask.id) {
        // Ensure status is valid
        const validStatuses = ['open', 'in_progress', 'done']
        const status = validStatuses.includes(updatedTask.status) ? updatedTask.status : 'open'
        
        // Ensure priority is valid
        const validPriorities = ['v-low', 'low', 'medium', 'high', 'veryhigh']
        const priority = validPriorities.includes(updatedTask.priority) ? updatedTask.priority : 'medium'
        
        const updateData = {
          title: updatedTask.title || '',
          description: updatedTask.description || '',
          status: status,
          priority: priority,
          story_points: updatedTask.storyPoints || 0
        }
        
        console.log('=== SAVING TO DATABASE ===')
        console.log('Original Status:', updatedTask.status)
        console.log('Validated Status:', status)
        console.log('Original Priority:', updatedTask.priority)
        console.log('Validated Priority:', priority)
        console.log('Story Points:', updatedTask.storyPoints)
        console.log('Status type:', typeof status)
        console.log('Status value:', status)
        console.log('Priority type:', typeof priority)
        console.log('Priority value:', priority)
        
        console.log('=== SENDING TO DATABASE ===')
        console.log('Update data:', updateData)
        
        // Update object in zone_objects table
        const result = await updateZoneObject(updatedTask.id, updateData)
        
        console.log('=== DATABASE RESULT ===')
        console.log('Result from database:', result)
        
        if (result) {
          console.log('Task saved successfully to database:', result)
          console.log('Result status:', result.status)
          console.log('Result status type:', typeof result.status)
          
          // Update local state with the result from database
          setSelectedTask(result)
          
          // Show success notification
          setNotification({
            type: 'info',
            message: 'Task updated successfully!'
          })
          
          // Hide notification after 3 seconds
          setTimeout(() => setNotification(null), 3000)
        } else {
          console.error('Database returned null/undefined result')
          
          // Show error notification
          setNotification({
            type: 'warning',
            message: 'Failed to save task changes'
          })
          
          // Hide notification after 5 seconds
          setTimeout(() => setNotification(null), 5000)
        }
      } else {
        console.warn('No task ID found for saving')
        
        // Show error notification
        setNotification({
          type: 'warning',
          message: 'No task ID found for saving'
        })
        
        // Hide notification after 5 seconds
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error) {
      console.error('Error saving task to database:', error)
      
      // Show error notification with more details
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      console.log('=== ERROR DETAILS ===')
      console.log('Error type:', typeof error)
      console.log('Error message:', errorMessage)
      console.log('Full error object:', error)
      
      setNotification({
        type: 'warning',
        message: `Failed to save task changes: ${errorMessage}`
      })
      
      // Hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000)
    }
  }

  // Removed test buildings creator
  
  // States for zone editing
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [editingZoneName, setEditingZoneName] = useState('')
  const [editingZoneColor, setEditingZoneColor] = useState('')
  const [isZoneEditMode, setIsZoneEditMode] = useState(false)

  // States for zone object details panel
  const [isZoneObjectDetailsOpen, setIsZoneObjectDetailsOpen] = useState(false)
  const [selectedZoneObject, setSelectedZoneObject] = useState<any>(null)
  
  // States for robot car movement
  const [robotCarTarget, setRobotCarTarget] = useState<[number, number] | null>(null)
  const [robotCarPosition, setRobotCarPosition] = useState<[number, number, number]>([0, 0.4, 0])
  
  // Function to find a free neighbor cell for robot car
  const findFreeNeighborCell = (q: number, r: number): [number, number] | null => {
    const neighbors = [
      [q + 1, r], [q + 1, r - 1], [q, r - 1],
      [q - 1, r], [q - 1, r + 1], [q, r + 1]
    ]
    
    // Find first free neighbor - use the computed cells from the render loop
    for (const [nq, nr] of neighbors) {
      // Check if this neighbor exists in our grid (radius = 12)
      const isInGrid = Math.abs(nq) <= 12 && Math.abs(nr) <= 12 && Math.abs(nq + nr) <= 12
      if (isInGrid) {
        // For now, just return the first neighbor - we'll improve this later
        return [nq, nr]
      }
    }
    
    // If no valid neighbor, use the first neighbor anyway
    return neighbors[0] as [number, number]
  }

  // States for creating objects in zones




  // Removed: automatic generation of test buildings




  // Hexagonal grid generation
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

  // Initialize grid based on server data
  React.useEffect(() => {
    if (loading) return

    console.log('HexGridSystem useEffect triggered - recreating all cells')
    const gridHexCells = generateHexGrid(12) // ~500 cells (оптимизировано)
    console.log(`Generating ${gridHexCells.length} cells for radius 12`)
    
    const initialCells: EnhancedHexCell[] = gridHexCells.map(({ q, r }) => {
      const distance = Math.abs(q) + Math.abs(r) + Math.abs(-q - r)
      const isCenter = q === 0 && r === 0
      const isNeighbor = distance === 1
      
      // Find server cell from database
      const serverCell = Array.isArray(hexCells) ? hexCells.find(cell => cell.q === q && cell.r === r) : null
      const building = getBuildingForCell(q, r)
      // const zone = getZoneForCell(q, r)
      
      // Check local buildings
      const localBuilding = Array.isArray(localBuildings) ? localBuildings.find(b => b.q === q && b.r === r) : null
      
      // Debug information for buildings
      if (building) {
        console.log(`Found building at [${q}, ${r}]:`, building)
      }
      
      // Determine if there's a building on this cell
      const hasBuilding = localBuilding || building
      
      if (hasBuilding) {
        console.log(`Cell [${q}, ${r}] has building:`, {
          localBuilding,
          serverBuilding: building,
          hasBuilding
        })
      }
      
      
      return {
        coordinates: [q, r] as [number, number],
        type: isCenter ? 'project-center' : isNeighbor ? 'building-slot' : 'hidden-slot',
        state: hasBuilding ? 'occupied' : (serverCell?.state || (isCenter ? 'occupied' : 'empty')),
        buildingType: localBuilding?.buildingType || building?.building_type || null,
        category: localBuilding?.category || building?.category,
        taskName: localBuilding?.taskName || building?.task_name,
        progress: localBuilding?.progress || building?.progress,
        priority: localBuilding?.priority || building?.priority
      }
    })

    console.log(`Created ${initialCells.length} cells for display`)
    setGridCells(initialCells)
  }, [loading, hexCells, getBuildingForCell, getZoneForCell, localBuildings, localZones])

  // Function for determining building category disabled
  // const assignCellProperties = (_q: number, _r: number, _buildingType: BuildingType) => ({
  //   category: undefined as any, taskName: undefined as any, progress: undefined as any, priority: undefined as any
  // })

  // Определение стороны ячейки (0..5) по осевым координатам
  // const getCellSide = (fromQ: number, fromR: number, toQ: number, toR: number): number => {
  //   const deltaQ = toQ - fromQ
  //   const deltaR = toR - fromR
  //   if (deltaQ > 0 && deltaR === 0) return 0
  //   if (deltaQ > 0 && deltaR < 0) return 1
  //   if (deltaQ === 0 && deltaR < 0) return 2
  //   if (deltaQ < 0 && deltaR === 0) return 3
  //   if (deltaQ < 0 && deltaR > 0) return 4
  //   return 5
  // }

  // Функция для вычисления клеток между двумя точками (должна быть объявлена ДО использования)
  function getCellsBetween(start: [number, number], end: [number, number]): Array<[number, number]> {
    const [startQ, startR] = start
    const [endQ, endR] = end
    const cells: Array<[number, number]> = []
    const deltaQ = endQ - startQ
    const deltaR = endR - startR
    const steps = Math.max(Math.abs(deltaQ), Math.abs(deltaR))
    if (steps === 0) return [[startQ, startR]]
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const q = Math.round(startQ + deltaQ * t)
      const r = Math.round(startR + deltaR * t)
      cells.push([q, r])
    }
    return cells
  }


  // Function for automatic zone color selection
  const getAvailableZoneColor = () => {
    const usedColors = new Set(effectiveZones.map(zone => zone.color))
    const availableColors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Turquoise
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Purple
      '#FFB347', // Orange
      '#98D8C8', // Mint
      '#F7DC6F', // Gold
      '#BB8FCE'  // Lavender
    ]
    
    for (const color of availableColors) {
      if (!usedColors.has(color)) {
        return color
      }
    }
    
    // If all colors are used, return the first one
    return availableColors[0]
  }



  // Function for exiting zone creation mode
  const handleExitZoneMode = () => {
    setZoneSelectionMode('idle')
    setSelectedZoneCells(new Set())
    setFirstClickCell(null)
    // setZoneBuildingAnimationStart(null) // Removed unused function
    // setAnimatedCells(new Set()) // Removed unused function
    setShowTopPanel(false)
    setSelectedZoneColor('')
    // setHoveredZoneColor(null)
    setHoveredCellType(null)
    setExtendingZoneId(null)
    console.log('Exit from zone creation mode')
  }

  // Function for exiting zone mode
  const handleExitZoneModeCompletely = () => {
    setIsZoneMode(false)
    setZoneSelectionMode('idle')
    setSelectedZoneCells(new Set())
    setFirstClickCell(null)
    setShowTopPanel(false)
    setSelectedZoneColor('')
    // setHoveredZoneColor(null)
    setHoveredCellType(null)
    setExtendingZoneId(null)
    setIsFlagMode(false)
    setFlagCells(new Set())
    setCurrentZonePath([])
    // Reset zone editing mode
    setEditingZoneId(null)
    setEditingZoneName('')
    setEditingZoneColor('')
    setIsZoneEditMode(false)
    console.log('Exit from zone mode')
  }



  // Function for setting hover effect for cells
  const setCellHoverEffect = useCallback((q: number, r: number) => {
    console.log(`setCellHoverEffect called for [${q}, ${r}]`)
    console.log(`localZones count:`, localZones.length)
    console.log(`zones count:`, zones.length)
    // Removed: selectedBuildingType logging
    
    const zoneColor = getZoneColor(q, r)
    console.log(`setCellHoverEffect for [${q}, ${r}]: zoneColor =`, zoneColor)
    
    if (zoneColor && isZoneEditMode) {
      // Cell inside zone - show special hover
      setHoveredCell([q, r])
      // setHoveredZoneColor(zoneColor)
      setHoveredCellType('zone-cell')
      console.log(`Setting zone-cell hover for [${q}, ${r}] with color ${zoneColor}`)
    } else if (isZoneMode) {
      // Regular cell in zone mode - show "+"
      setHoveredCell([q, r])
      // setHoveredZoneColor(null)
      setHoveredCellType('empty')
      console.log(`Setting empty hover for [${q}, ${r}] in zone mode`)
    } else {
      // Regular cell not in zone mode - don't show hover
      setHoveredCell([q, r])
      // setHoveredZoneColor(null)
      setHoveredCellType(null)
      console.log(`No hover for [${q}, ${r}] - not in zone mode`)
    }
  }, [localZones, zones, isZoneMode, zoneSelectionMode, showTopPanel, localBuildings])

  // Cell hover handler
  const handleCellHover = useCallback((q: number, r: number) => {
    if (hoveredCell && hoveredCell[0] === q && hoveredCell[1] === r) return
    console.log(`🖱️ handleCellHover called for [${q}, ${r}], isZoneMode: ${isZoneMode}`)
    setHoveredCell([q, r])
    console.log(`🖱️ handleCellHover: setHoveredCell([${q}, ${r}])`)
    
    // If in zone creation mode and there's a first cell - update selection preview
    if (isZoneMode && firstClickCell && zoneSelectionMode === 'selecting') {
      console.log(`Updating zone selection preview from [${firstClickCell[0]}, ${firstClickCell[1]}] to [${q}, ${r}]`)
      const cells = getCellsBetween(firstClickCell, [q, r])
      const cellKeys = cells.map(([cellQ, cellR]) => `${cellQ},${cellR}`)
      setSelectedZoneCells(new Set(cellKeys))
      console.log(`Selected zone cells:`, Array.from(cellKeys))
    }
    
    // If in zone extension mode - update preview with fixed cells
    if (isZoneMode && firstClickCell && zoneSelectionMode === 'extending') {
      console.log(`Updating zone extension preview from [${firstClickCell[0]}, ${firstClickCell[1]}] to [${q}, ${r}]`)
      const cells = getCellsBetween(firstClickCell, [q, r])
      const cellKeys = cells.map(([cellQ, cellR]) => `${cellQ},${cellR}`)
      
      // Combine fixed cells with new ones
      const allCells = new Set([...fixedZoneCells, ...cellKeys])
      setSelectedZoneCells(allCells)
      console.log(`Fixed zone cells:`, Array.from(fixedZoneCells))
      console.log(`New cell keys:`, Array.from(cellKeys))
      console.log(`Extended zone cells:`, Array.from(allCells))
      console.log(`Total cells in zone:`, allCells.size)
    }
    
    // If in zone extension mode, update preview with currently selected cells
    if (isZoneMode && zoneSelectionMode === 'extending' && firstClickCell) {
      const cells = getCellsBetween(firstClickCell, [q, r])
      const cellKeys = cells.map(([cellQ, cellR]) => `${cellQ},${cellR}`)
      // Combine currently selected cells with new ones
      setSelectedZoneCells(prev => new Set([...prev, ...cellKeys]))
    }
    
    // New hover logic for zones
    if (isZoneMode && zoneSelectionMode === 'idle' && !showTopPanel) {
      // Check if there's an adjacent zone
      const neighbors = getNeighbors(q, r)
      let hasAdjacentZone = false
      
      for (const [nq, nr] of neighbors) {
        const neighborZoneColor = getZoneColor(nq, nr)
        if (neighborZoneColor && !getZoneColor(q, r)) {
          // If adjacent cell belongs to a zone, but current one doesn't
          hasAdjacentZone = true
          break
        }
      }
      
      // If no zones exist in project, show hover on all empty cells
      const hasAnyZones = effectiveZones.length > 0 || localZones.length > 0
      
      if (hasAdjacentZone || !hasAnyZones) {
        // Show plus icon for cells adjacent to existing zones OR if no zones exist
        setHoveredCell([q, r])
        // setHoveredZoneColor(null)
        setHoveredCellType('empty')
      } else {
        // No adjacent zone and zones exist - don't show hover
        setHoveredCell([q, r])
        // setHoveredZoneColor(null)
        setHoveredCellType(null)
      }
    } else if (showTopPanel && selectedZoneColor && !isZoneEditMode) {
      // If zone creation panel is open, use selected color
      setHoveredCell([q, r])
      // setHoveredZoneColor(selectedZoneColor)
      setHoveredCellType('new-zone')
    } else if (isZoneEditMode && editingZoneId) {
      // If in zone editing mode, check if cell belongs to the zone being edited
      const currentZone = localZones.find(z => z && z.id === editingZoneId) || effectiveZones.find(z => z && z.id === editingZoneId)
      if (currentZone && (currentZone as any).cells && Array.isArray((currentZone as any).cells) && (currentZone as any).cells.some(([cellQ, cellR]: [number, number]) => cellQ === q && cellR === r)) {
        // Cell belongs to the zone being edited - show removal icon "-"
        setHoveredCell([q, r])
        // setHoveredZoneColor(currentZone.color)
        setHoveredCellType('zone-cell')
      } else {
        // Cell doesn't belong to the zone being edited - show addition icon "+"
        setHoveredCell([q, r])
        // setHoveredZoneColor(null)
        setHoveredCellType('empty')
      }
    } else if (isZoneMode && !isZoneEditMode) {
      // For zone creation mode (not editing) use general logic
      setCellHoverEffect(q, r)
    } else if (!isZoneMode || (isZoneMode && zoneSelectionMode === 'idle' && !showTopPanel)) {
      // Default mode: no special hover inside zones
      setHoveredCell([q, r])
      // setHoveredZoneColor(null)
      setHoveredCellType(null)
    } else if (isZoneMode && isZoneEditMode) {
      // In zone editing mode use special logic
      setCellHoverEffect(q, r)
    } else {
      // Not in zone mode - don't show hover effects
      setHoveredCell([q, r])
      // setHoveredZoneColor(null)
      setHoveredCellType(null)
    }
  }, [hoveredCell, isZoneMode, zoneSelectionMode, firstClickCell, selectedZoneColor, showTopPanel, fixedZoneCells, setCellHoverEffect, isZoneEditMode, editingZoneId, localZones, zones, localBuildings])

  // Mouse leave cell handler
  const handleCellLeave = useCallback((_q: number, _r: number) => {
    console.log(`🖱️ handleCellLeave called for [${_q}, ${_r}]`)
    setHoveredCell(null)
    // setHoveredZoneColor(null)
    setHoveredCellType(null)
  }, [gridCells, getZoneForCell])

  // Отладка обработчиков
  useEffect(() => {
    console.log(`🔧 HexGridSystem обработчики: handleCellHover=${!!handleCellHover}, handleCellLeave=${!!handleCellLeave}`)
  }, [handleCellHover, handleCellLeave])

  // Handlers for creating tickets inside zone objects
  const handleZoneObjectCreate = useCallback(async (objectData: {
    title: string
    type: 'story' | 'task' | 'bug' | 'test'
    status: 'open' | 'in_progress' | 'done'
    priority: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'
    assignee_id?: string | null
  }) => {
    console.log('Creating ticket:', objectData)
    console.log('Cell position:', modalConfig.cell)

    if (modalConfig.cell) {
      // Найдём центральный объект зоны на этой ячейке (без зависимости от функции ниже по файлу)
      const centerObject = (zoneObjects || []).find(o => modalConfig.cell && o.q === modalConfig.cell[0] && o.r === modalConfig.cell[1])
      if (!centerObject) {
        console.warn('No zone object found on this cell to attach ticket')
        setModalConfig({ isOpen: false, ticketType: null, cell: null })
        return
      }

      // Создаём тикет в object_tickets
      const ticket = await createTicketForZoneObject(centerObject.id, {
        type: objectData.type,
        title: objectData.title,
        status: objectData.status,
        priority: objectData.priority,
        assignee_id: objectData.assignee_id ?? null
      })

      if (ticket) {
        console.log('Ticket created:', ticket)
        // Ничего не перезагружаем — тикет уже добавлен в локальный state и сразу появится в сайдбаре
      } else {
        console.error('Failed to create ticket')
      }
    }

    setModalConfig({ isOpen: false, ticketType: null, cell: null })
  }, [modalConfig.cell, zoneObjects, reloadData])

  // REFACTORED: Removed handleZoneObjectCreatorClose - using inline close handler

  // REFACTORED: Removed problematic useEffect that caused race conditions
  // Modal now opens directly in the unified drop handler

  // REFACTORED: Moved handleUnifiedDrop after getZoneCenter to fix dependency order


  // Function for getting zone information for a cell
  const getZoneInfo = (q: number, r: number) => {
    console.log(`getZoneInfo called for cell [${q}, ${r}]`)
    console.log('localZones:', localZones)
    
    // First check local zones (they have priority)
    for (const zone of localZones) {
      console.log(`Checking zone ${zone.id}:`, zone.cells)
      if (zone && zone.cells && Array.isArray(zone.cells) && zone.cells.some(([cellQ, cellR]: [number, number]) => cellQ === q && cellR === r)) {
        console.log(`Found zone in localZones:`, zone)
        return {
          id: zone.id,
          name: zone.name,
          color: zone.color,
          cells: zone.cells,
          createdAt: zone.createdAt
        }
      }
    }
    
    // Then check server zones
    const zone = getZoneForCell(q, r)
    if (zone) {
      console.log(`Found zone in server zones:`, zone)
      // Check if this zone is being edited
      const editedZone = localZones.find(localZone => localZone && localZone.id === zone.id)
      if (editedZone) {
        // Zone is being edited - check if cell is in local version
        const isInEditedZone = editedZone.cells && Array.isArray(editedZone.cells) && 
          editedZone.cells.some(([cellQ, cellR]: [number, number]) => cellQ === q && cellR === r)
        if (isInEditedZone) {
          // Cell is in local version - return local zone
          return {
            id: editedZone.id,
            name: editedZone.name,
            color: editedZone.color,
            cells: editedZone.cells,
            createdAt: editedZone.createdAt
          }
        } else {
          // Cell was removed from local version - don't return zone
          console.log(`Cell [${q}, ${r}] was removed from edited zone ${zone.id}`)
          return null
        }
      } else {
        // Zone is not being edited - return server zone
        const zoneCellsForZone = effectiveZoneCells.filter(cell => cell.zone_id === zone.id)
        const cells = zoneCellsForZone.map(cell => [cell.q, cell.r] as [number, number])
        
        console.log(`Zone cells from server:`, cells)
        
        return {
          id: zone.id,
          name: zone.name,
          color: zone.color,
          cells: cells,
          createdAt: new Date(zone.created_at)
        }
      }
    }
    
    console.log(`No zone found for cell [${q}, ${r}]`)
    return null
  }

  // Radial menu object selection handler
  const handleRadialMenuSelect = useCallback(async (objectType: string) => {
    console.log('=== RADIAL MENU SELECTION ===')
    console.log('Selected object type:', objectType)
    console.log('Radial menu position:', radialMenuPosition)
    
    if (radialMenuPosition) {
      
      // Generate random color for zone
      const zoneColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8A80', '#81C784']
      const randomColor = zoneColors[Math.floor(Math.random() * zoneColors.length)]
      
      // Generate random name for zone
      const zoneNames = [
        'Development Zone', 'Testing Area', 'Bug Hunt', 'Feature Factory', 
        'Code Cave', 'Debug Den', 'Build Base', 'Release Ridge',
        'Quality Quarter', 'Innovation Island', 'Tech Territory', 'Code Canyon'
      ]
      const randomName = zoneNames[Math.floor(Math.random() * zoneNames.length)]
      
      // Create zone with selected cells
      const zoneCells: Array<[number, number]> = Array.from(selectedZoneCells).map(cellKey => {
        const [cellQ, cellR] = cellKey.split(',').map(Number)
        return [cellQ, cellR] as [number, number]
      })
      
      console.log('=== CREATING ZONE ===')
      console.log('Zone name:', randomName)
      console.log('Zone color:', randomColor)
      console.log('Zone cells:', zoneCells)
      console.log('Selected cells count:', selectedZoneCells.size)
      
      // Map UI option to canonical object type (hoisted so it's available in both branches)
      const typeMap: Record<string, 'mountain' | 'castle' | 'house' | 'garden' | 'factory' | 'helipad'> = {
        hub: 'castle',
        sprint: 'mountain',
        qa: 'factory',
        refinement: 'garden',
        meet: 'house',
        development: 'helipad'
      }
      const mappedType: 'mountain' | 'castle' | 'house' | 'garden' | 'factory' | 'helipad' = (typeMap[objectType] || 'house')

      // Try to create zone on server
      const serverZone = await createZone(randomName, randomColor, zoneCells as Array<[number, number]>)

      if (serverZone) {
        console.log('Created zone:', serverZone)

        // Create object in zone center on server
        // Используем новый правильный алгоритм центрирования
        const centerCoordinates = calculateHexZoneCenter(zoneCells)
        if (!centerCoordinates) {
          console.error('Could not calculate center for zone cells:', zoneCells)
          return
        }
        
        const [centerQ, centerR] = centerCoordinates
        console.log('Zone center calculated:', { centerQ, centerR })
        console.log('Zone cells for center calculation:', zoneCells)

        const centerObject = await createZoneObject({
          zone_id: serverZone.id,
          object_type: mappedType,
          title: (() => {
            // Для спринтов используем имя спринта, для остальных - стандартное название
            if (objectType === 'sprint') {
              return 'Sprint' // Базовое имя, которое потом может быть изменено пользователем
            }
            return `${objectType.charAt(0).toUpperCase() + objectType.slice(1)} Object`
          })(),
          description: `This is a ${objectType} object in the center of the zone.`,
          status: 'open',
          priority: 'medium',
          story_points: 0,
          q: centerQ,
          r: centerR
        })

        if (centerObject) {
          console.log('Created center object:', centerObject)

          setNotification({
            type: 'info',
            message: `Created zone "${randomName}" with ${objectType} object!`
          })
          setTimeout(() => setNotification(null), 3000)
        } else {
        }
      } else {
        console.warn('Failed to create zone on server, falling back to local preview')

        // Create local-only zone preview to keep UX smooth
        const localZoneId = `zone-local-${Date.now()}`
        setLocalZones(prev => [
          ...prev,
          { id: localZoneId, name: randomName, color: randomColor, cells: zoneCells as Array<[number, number]>, createdAt: new Date() }
        ])


        setNotification({
          type: 'info',
          message: `Created local ${objectType} preview`
        })
        setTimeout(() => setNotification(null), 2500)
      }
    }
    
    // Close radial menu
    setShowRadialMenu(false)
    setRadialMenuPosition(null)
    setRadialMenuWorldPosition(null)
    setRadialMenuMousePosition(null)
    setSelectedRadialOption(null)
    
    // Exit from zone construction mode
    setIsZoneMode(false)
    setZoneSelectionMode('idle')
    setFirstClickCell(null)
    setSelectedZoneCells(new Set())
    setFixedZoneCells(new Set())
    setSelectedZoneColor('')
    setShowTopPanel(false)
    setExtendingZoneId(null)
    setLastExtendingClick(0)
  }, [radialMenuPosition, selectedZoneCells, createZone, createZoneObject])

  const handleRadialMenuClose = useCallback(() => {
    setShowRadialMenu(false)
    setRadialMenuPosition(null)
    setRadialMenuWorldPosition(null)
    setRadialMenuMousePosition(null)
    setSelectedRadialOption(null)
    
    // Exit from zone construction mode
    setIsZoneMode(false)
    setZoneSelectionMode('idle')
    setFirstClickCell(null)
    setSelectedZoneCells(new Set())
    setFixedZoneCells(new Set())
    setSelectedZoneColor('')
    setShowTopPanel(false)
    setExtendingZoneId(null)
    setLastExtendingClick(0)
  }, [])

  // Zone creation handler
  const handleZoneCreate = async (zone: ZoneMarking) => {
    console.log('Creating zone:', zone)
    
    // Add zone to local state
    setLocalZones(prev => [...prev, zone])
    console.log('Zone added to local state')
    
    // Try to create zone on server
    if (createZone) {
      console.log('createZone function exists, attempting server creation')
      try {
        const serverZone = await createZone(zone.name, zone.color, zone.cells)
        if (serverZone) {
          console.log('Zone created on server:', serverZone)
        } else {
          console.warn('createZone returned null/undefined')
        }
      } catch (error) {
        console.error('Failed to create zone on server, but kept locally:', error)
      }
    } else {
      console.warn('createZone function is undefined')
    }
  }


  // Zone changes save handler
  const handleSaveZoneEdit = async () => {
    if (!editingZoneId || !editingZoneName.trim()) return

    const updatedZone: ZoneMarking = {
      id: editingZoneId,
      name: editingZoneName.trim(),
      color: editingZoneColor,
      cells: [], // Will be filled from current zone
      createdAt: new Date()
    }

    // Находим текущую зону и копируем её ячейки
    const currentZone = localZones.find(z => z && z.id === editingZoneId) || zones.find(z => z && z.id === editingZoneId)
    if (currentZone && (currentZone as any).cells && Array.isArray((currentZone as any).cells)) {
      updatedZone.cells = [...(currentZone as any).cells]
    }

    // Обновляем зону в локальном состоянии
    setLocalZones(prev => prev.map(zone => 
      zone && zone.id === editingZoneId ? updatedZone : zone
    ))

    // TODO: Обновить на сервере
    console.log('Zone updated:', updatedZone)

    // Обновляем позицию объектов зоны на основе нового центра
    if (updateZoneObjectPosition) {
      try {
        await updateZoneObjectPosition(editingZoneId)
        console.log('Zone object positions updated successfully')
      } catch (error) {
        console.error('Failed to update zone object positions:', error)
      }
    }

    // Сбрасываем состояние редактирования
    setEditingZoneId(null)
    setEditingZoneName('')
    setEditingZoneColor('')
    setIsZoneEditMode(false)
    setIsZoneMode(false) // Выходим из режима зон
    setZoneSelectionMode('idle')
    setShowTopPanel(false)
    setFirstClickCell(null)
    setSelectedZoneCells(new Set())
    setExtendingZoneId(null)
  }

  // Обработчик отмены редактирования зоны
  const handleCancelZoneEdit = () => {
    console.log('=== handleCancelZoneEdit called ===')
    console.log('editingZoneId:', editingZoneId)
    
    if (editingZoneId) {
      // Удаляем измененную зону из localZones, возвращая к исходному состоянию
      setLocalZones(prev => {
        const updatedZones = prev.filter(zone => zone.id !== editingZoneId)
        console.log('Removed edited zone from localZones:', editingZoneId)
        console.log('Updated localZones:', updatedZones)
        return updatedZones
      })
    }
    
    // Сбрасываем все состояния редактирования
    setEditingZoneId(null)
    setEditingZoneName('')
    setEditingZoneColor('')
    setIsZoneEditMode(false)
    setIsZoneMode(false) // Выходим из режима зон
    setZoneSelectionMode('idle')
    setShowTopPanel(false)
    setFirstClickCell(null)
    setSelectedZoneCells(new Set())
    setExtendingZoneId(null)
    
    // Принудительно перегенерируем сетку для отображения исходного состояния
    const gridHexCells = generateHexGrid(12)
    const updatedCells = gridHexCells.map(({ q, r }) => {
      const distance = Math.abs(q) + Math.abs(r) + Math.abs(-q - r)
      const isCenter = q === 0 && r === 0
      const isNeighbor = distance === 1
      
      // Находим серверную ячейку из базы данных
      const serverCell = Array.isArray(hexCells) ? hexCells.find(cell => cell.q === q && cell.r === r) : null
      const building = getBuildingForCell(q, r)
      
      // Проверяем локальные здания
      const localBuilding = Array.isArray(localBuildings) ? localBuildings.find(b => b.q === q && b.r === r) : null
      
      // Определяем, есть ли здание на этой ячейке
      const hasBuilding = localBuilding || building
      
      
      return {
        coordinates: [q, r] as [number, number],
        type: isCenter ? 'project-center' : isNeighbor ? 'building-slot' : 'hidden-slot',
        state: hasBuilding ? 'occupied' : (serverCell?.state || (isCenter ? 'occupied' : 'empty')),
        buildingType: localBuilding?.buildingType || building?.building_type || null,
        category: localBuilding?.category || building?.category,
        taskName: localBuilding?.taskName || building?.task_name,
        progress: localBuilding?.progress || building?.progress,
        priority: localBuilding?.priority || building?.priority
      }
    })
    
    setGridCells(updatedCells as unknown as EnhancedHexCell[])
    
    console.log('Zone edit cancelled, returned to original state')
    console.log('=== handleCancelZoneEdit finished ===')
  }

  // Обработчик удаления зоны
  const handleDeleteZone = async () => {
    if (!editingZoneId) return

    console.log('Deleting zone:', editingZoneId)
    
    // Удаляем зону из локального состояния
    setLocalZones(prev => prev.filter(zone => zone.id !== editingZoneId))
    
    // Пытаемся удалить зону на сервере
    if (deleteZone) {
      try {
        await deleteZone(editingZoneId)
        console.log('Zone deleted on server:', editingZoneId)
      } catch (error) {
        console.error('Failed to delete zone on server:', error)
      }
    }
    
    // Сбрасываем состояние редактирования
    setEditingZoneId(null)
    setEditingZoneName('')
    setEditingZoneColor('')
    setIsZoneEditMode(false)
    setIsZoneMode(false)
    setZoneSelectionMode('idle')
    setShowTopPanel(false)
    setFirstClickCell(null)
    setSelectedZoneCells(new Set())
    setExtendingZoneId(null)
    
    console.log('Zone deletion completed')
  }



  // Обработчик удаления ячейки из зоны
  const handleRemoveCellFromZone = (q: number, r: number) => {
    if (!editingZoneId) {
      console.log('No editingZoneId, cannot remove cell')
      return
    }

    console.log(`Attempting to remove cell [${q}, ${r}] from zone ${editingZoneId}`)
    
    // Обновляем локальные зоны
    setLocalZones(prev => {
      const updatedZones = prev.map(zone => {
        if (zone && zone.id === editingZoneId && zone.cells && Array.isArray(zone.cells)) {
          const newCells = zone.cells.filter(([cellQ, cellR]: [number, number]) => !(cellQ === q && cellR === r))
          console.log(`Zone ${zone.id}: removed cell [${q}, ${r}], cells count: ${zone.cells.length} -> ${newCells.length}`)
          return {
            ...zone,
            cells: newCells
          }
        }
        return zone
      })
      console.log('Updated local zones:', updatedZones)
      return updatedZones
    })

    // Принудительно обновляем hover состояние для этой ячейки
    setHoveredCell(null)
    // setHoveredZoneColor(null)
    setHoveredCellType(null)

    // Принудительно перегенерируем сетку для полного перерендера
    const gridHexCells = generateHexGrid(12)
    const updatedCells = gridHexCells.map(({ q: cellQ, r: cellR }) => {
      const distance = Math.abs(cellQ) + Math.abs(cellR) + Math.abs(-cellQ - cellR)
      const isCenter = cellQ === 0 && cellR === 0
      const isNeighbor = distance === 1
      
      // Находим серверную ячейку из базы данных
      const serverCell = hexCells.find(cell => cell.q === cellQ && cell.r === cellR)
      const building = getBuildingForCell(cellQ, cellR)
      
      // Проверяем локальные здания
      const localBuilding = localBuildings.find(b => b.q === cellQ && b.r === cellR)
      
      // Определяем, есть ли здание на этой ячейке
      const hasBuilding = localBuilding || building
      
      
      return {
        coordinates: [cellQ, cellR] as [number, number],
        type: isCenter ? 'project-center' : isNeighbor ? 'building-slot' : 'hidden-slot',
        state: hasBuilding ? 'occupied' : (serverCell?.state || (isCenter ? 'occupied' : 'empty')),
        buildingType: localBuilding?.buildingType || building?.building_type || null,
        category: localBuilding?.category || building?.category,
        taskName: localBuilding?.taskName || building?.task_name,
        progress: localBuilding?.progress || building?.progress,
        priority: localBuilding?.priority || building?.priority
      }
    })
    
    setGridCells(updatedCells as unknown as EnhancedHexCell[])

    // Проверяем, что ячейка действительно удалена
    setTimeout(() => {
      const zoneColor = getZoneColor(q, r)
      const zoneInfo = getZoneInfo(q, r)
      console.log(`After removal - cell [${q}, ${r}]: zoneColor=${zoneColor}, zoneInfo=${zoneInfo ? zoneInfo.name : 'null'}`)
    }, 100)

    console.log(`Removed cell [${q}, ${r}] from zone ${editingZoneId}`)
  }

  // Функция для добавления ячейки к редактируемой зоне
  const handleAddCellToZone = (q: number, r: number) => {
    if (!editingZoneId) {
      console.log('No editingZoneId, cannot add cell')
      return
    }

    console.log(`Attempting to add cell [${q}, ${r}] to zone ${editingZoneId}`)
    
    // Обновляем локальные зоны
    setLocalZones(prev => {
      const updatedZones = prev.map(zone => {
        if (zone && zone.id === editingZoneId && zone.cells && Array.isArray(zone.cells)) {
          // Проверяем, что ячейка еще не в зоне
          const cellExists = zone.cells.some(([cellQ, cellR]: [number, number]) => cellQ === q && cellR === r)
          if (!cellExists) {
            const newCells = [...zone.cells, [q, r] as [number, number]]
            console.log(`Zone ${zone.id}: added cell [${q}, ${r}], cells count: ${zone.cells.length} -> ${newCells.length}`)
            return {
              ...zone,
              cells: newCells
            }
          }
        }
        return zone
      })
      console.log('Updated local zones:', updatedZones)
      return updatedZones
    })

    // Принудительно перегенерируем сетку для полного перерендера
    const gridHexCells = generateHexGrid(12)
    const updatedCells = gridHexCells.map(({ q: cellQ, r: cellR }) => {
      const distance = Math.abs(cellQ) + Math.abs(cellR) + Math.abs(-cellQ - cellR)
      const isCenter = cellQ === 0 && cellR === 0
      const isNeighbor = distance === 1
      
      // Находим серверную ячейку из базы данных
      const serverCell = hexCells.find(cell => cell.q === cellQ && cell.r === cellR)
      const building = getBuildingForCell(cellQ, cellR)
      
      // Проверяем локальные здания
      const localBuilding = localBuildings.find(b => b.q === cellQ && b.r === cellR)
      
      // Определяем, есть ли здание на этой ячейке
      const hasBuilding = localBuilding || building
      
      
      return {
        coordinates: [cellQ, cellR] as [number, number],
        type: isCenter ? 'project-center' : isNeighbor ? 'building-slot' : 'hidden-slot',
        state: hasBuilding ? 'occupied' : (serverCell?.state || (isCenter ? 'occupied' : 'empty')),
        buildingType: localBuilding?.buildingType || building?.building_type || null,
        category: localBuilding?.category || building?.category,
        taskName: localBuilding?.taskName || building?.task_name,
        progress: localBuilding?.progress || building?.progress,
        priority: localBuilding?.priority || building?.priority
      }
    })
    
    setGridCells(updatedCells as unknown as EnhancedHexCell[])

    console.log(`Added cell [${q}, ${r}] to zone ${editingZoneId}`)
  }

  // Обработчик очистки выделения
  const handleSelectionClear = () => {
    setSelectedCells(new Set())
    setSelectedZoneCells(new Set())
    setFixedZoneCells(new Set())
    setZoneSelectionMode('idle')
    setFirstClickCell(null)
    setShowTopPanel(false)
    setSelectedZoneColor('')
    // setHoveredZoneColor(null)
    setHoveredCellType(null)
    setExtendingZoneId(null)
    setLastExtendingClick(0)
    // Сбрасываем режим редактирования зон
    setEditingZoneId(null)
    setEditingZoneName('')
    setEditingZoneColor('')
    setIsZoneEditMode(false)
  }

  // Обработчик переключения режима зон
  const handleZoneModeToggle = () => {
    setIsZoneMode(!isZoneMode)
    if (!isZoneMode) {
      // Включаем режим строительства
      handleSelectionClear()
    } else {
      // Выключаем режим строительства
      // При входе в режим зон сбрасываем hover цвет
      // setHoveredZoneColor(null)
      setHoveredCellType(null)
      setExtendingZoneId(null)
    }
  }

  // Функция для получения цвета зоны для ячейки
  const getZoneColor = (q: number, r: number) => {
    console.log(`🎨 getZoneColor called for cell [${q}, ${r}]`)
    
    // Сначала проверяем локальные зоны (они имеют приоритет)
    for (const zone of localZones) {
      if (zone && zone.cells && Array.isArray(zone.cells) && zone.cells.some(([cellQ, cellR]: [number, number]) => cellQ === q && cellR === r)) {
        console.log(`🎨 Found zone color in localZones: ${zone.color} for zone ${zone.id}`)
        return zone.color
      }
    }
    
    // Затем проверяем серверные зоны
    const zone = getZoneForCell(q, r)
    if (zone) {
      console.log(`🎨 Found zone color in server zones: ${zone.color} for zone ${zone.id}`)
      // Проверяем, редактируется ли эта зона и есть ли ячейка в локальной версии
      const editedZone = localZones.find(localZone => localZone && localZone.id === zone.id)
      if (editedZone) {
        // Зона редактируется - проверяем, есть ли ячейка в локальной версии
        const isInEditedZone = editedZone.cells && Array.isArray(editedZone.cells) && 
          editedZone.cells.some(([cellQ, cellR]: [number, number]) => cellQ === q && cellR === r)
        if (isInEditedZone) {
          // Ячейка есть в локальной версии - возвращаем цвет локальной зоны
          console.log(`🎨 Returning edited zone color: ${editedZone.color}`)
          return editedZone.color
        } else {
          // Ячейка удалена из локальной версии - не показываем цвет
          console.log(`🎨 Cell [${q}, ${r}] was removed from edited zone ${zone.id}`)
          return null
        }
      } else {
        // Зона не редактируется - показываем серверный цвет
        console.log(`🎨 Returning server zone color: ${zone.color}`)
        return zone.color
      }
    }

    console.log(`No zone color found for cell [${q}, ${r}]`)
    return null
  }

  const buildZoneObjectData = useCallback((zoneObject: any, q: number, r: number) => {
    return {
      id: zoneObject.id,
      type: (zoneObject as any).object_type || (zoneObject as any).type,
      title: zoneObject.title,
      description: zoneObject.description || `This is a ${(zoneObject as any).object_type} object in the zone.`,
      status: zoneObject.status as 'open' | 'in_progress' | 'done',
      priority: zoneObject.priority as 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh',
      storyPoints: (zoneObject as any).story_points || (zoneObject as any).storyPoints || 0,
      zoneId: (zoneObject as any).zone_id || (zoneObject as any).zoneId || '',
      cellPosition: [q, r] as [number, number],
      createdAt: new Date((zoneObject as any).created_at || Date.now()),
      isZoneCenter: Boolean((zoneObject as any).isZoneCenter),
      zoneProgress: (zoneObject as any).zoneProgress as number | undefined
    }
  }, [])

  const openSprintSidebar = useCallback((zoneObject: any, q: number, r: number) => {
    console.log('[DEBUG] openSprintSidebar invoked for', zoneObject?.id, zoneObject?.object_type, 'coords', q, r)
    const data = buildZoneObjectData(zoneObject, q, r)
    setSelectedZoneObject(data as any)
    setSprintObjectId(zoneObject.id)
    setIsSprintOpen(true)
    setIsZoneObjectDetailsOpen(false)
  }, [buildZoneObjectData])




  // Обработчик клика по ячейке
  const handleCellClick = useCallback(async (q: number, r: number, isRightClick: boolean = false, mousePosition?: [number, number]) => {
    console.log('🖱️ handleCellClick called:', { q, r, mousePosition })
    console.log('🖱️ Available zoneObjects:', zoneObjects)
    console.log('🖱️ Looking for object at [', q, ',', r, ']')
    
    // Проверяем, есть ли здание на этой клетке (локальное или серверное)
    const localBuilding = localBuildings.find(b => b.q === q && b.r === r)
    const serverBuilding = getBuildingForCell(q, r)
    const zoneInfo = getZoneInfo(q, r)
    const zoneColor = getZoneColor(q, r)
    const isProjectCenter = q === 0 && r === 0
    
    console.log('🖱️ Cell analysis:', {
      q, r,
      localBuilding: !!localBuilding,
      serverBuilding: !!serverBuilding,
      zoneInfo: !!zoneInfo,
      zoneColor: !!zoneColor,
      isProjectCenter
    })
    
    
    // Если в режиме редактирования зоны, обрабатываем удаление и добавление ячеек
    if (isZoneEditMode && editingZoneId) {
      console.log(`In edit mode, editingZoneId: ${editingZoneId}`)
      const currentZone = localZones.find(z => z && z.id === editingZoneId) || effectiveZones.find(z => z && z.id === editingZoneId)
      console.log(`Current zone:`, currentZone)
      
      if (currentZone && (currentZone as any).cells && Array.isArray((currentZone as any).cells) && (currentZone as any).cells.some(([cellQ, cellR]: [number, number]) => cellQ === q && cellR === r)) {
        console.log(`Cell [${q}, ${r}] belongs to editing zone, removing...`)
        // Клик на ячейку редактируемой зоны - удаляем её
        handleRemoveCellFromZone(q, r)
        return
      } else {
        console.log(`Cell [${q}, ${r}] does not belong to editing zone, adding...`)
        // Клик на ячейку вне редактируемой зоны - добавляем её
        handleAddCellToZone(q, r)
        return
      }
    }
    
    // Получаем актуальную информацию о зоне после возможных изменений
    const currentZoneColor = getZoneColor(q, r)
    
    // Проверяем, есть ли объект зоны на этой ячейке
    const zoneObject = getZoneObjectForCellLocal(q, r)
    console.log('Zone object found:', zoneObject)
    
    // Если есть объект зоны и это не правый клик - открываем детальную панель
    if (zoneObject && !isRightClick) {
      console.log('Found zone object:', zoneObject)
      try {
        window.dispatchEvent(new CustomEvent('sprint-click-debug', { detail: { zoneObject } }))
      } catch (error) {
        console.error('sprint-click-debug dispatch failed', error)
      }
      // Special case: Sprint (mapped type 'mountain') opens Sprint modal instead of sidebar
      const rawZoneType = (zoneObject as any).object_type ?? (zoneObject as any).type ?? ''
      const zoneObjectType = String(rawZoneType).toLowerCase()
      console.log('[SprintSidebar Routing] resolved type:', zoneObjectType, {
        object_type: (zoneObject as any).object_type,
        type: (zoneObject as any).type
      })
      if (zoneObjectType === 'mountain' || zoneObjectType === 'sprint') {
        openSprintSidebar(zoneObject, q, r)
        return
      }
      setIsSprintOpen(false)
      setSprintObjectId(null)
      
      // Создаем объект для ZoneObjectDetailsPanel (с прогрессом зоны для центральных объектов)
      const zoneObjectData = buildZoneObjectData(zoneObject, q, r)
      
      console.log('Opening ZoneObjectDetailsPanel with data:', zoneObjectData)
      setSelectedZoneObject(zoneObjectData as any)
      setIsZoneObjectDetailsOpen(true)
      
      // Move robot car to neighbor cell of the clicked building
      console.log(`🚗 Looking for neighbor cell for building at [${q}, ${r}]`)
      const neighborCell = findFreeNeighborCell(q, r)
      console.log(`🚗 Found neighbor cell:`, neighborCell)
      
      if (neighborCell) {
        const [targetQ, targetR] = neighborCell
        const [targetX, , targetZ] = hexToWorldPosition(targetQ, targetR)
        console.log(`🚗 Setting robot car target: [${targetQ}, ${targetR}] at world position [${targetX}, 0.4, ${targetZ}]`)
        setRobotCarTarget([targetQ, targetR])
        setRobotCarPosition([targetX, 0.4, targetZ])
        console.log(`🚗 Robot car state updated!`)
      } else {
        console.log(`🚗 No neighbor cell found!`)
      }
      return
    }
    
    // Создание объектов на ячейках внутри зон отключено
    if (currentZoneColor && !isZoneEditMode) {
      console.log('Cell is in zone but no object found, and not in edit mode - ignoring click')
      return
    }
    
    // Если есть здание и это не правый клик - открываем детальную панель
    if ((localBuilding || serverBuilding) && !isRightClick) {
      const building = (localBuilding || serverBuilding) as any
      console.log('Found building:', building)
      
      // Создаем объект задачи на основе данных здания
      const taskData = {
        id: building?.id || `${q}-${r}`,
        title: building?.task_name || building?.taskName || 'Untitled Task',
        description: building?.description || 'This is a detailed description of the task. It contains all the necessary information about what needs to be done.',
        status: (building?.status as any) || 'in_progress',
        priority: (building?.priority === 1 ? 'low' : 
                  building?.priority === 2 ? 'medium' : 
                  building?.priority === 3 ? 'high' : 'veryhigh') as 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh',
        storyPoints: building?.storyPoints || Math.floor(Math.random() * 8) + 1,
        checklist: [
          { id: '1', text: 'Review requirements', completed: true },
          { id: '2', text: 'Create wireframes', completed: true },
          { id: '3', text: 'Implement UI components', completed: false },
          { id: '4', text: 'Write tests', completed: false },
          { id: '5', text: 'Deploy to staging', completed: false }
        ],
        attachments: [
          { id: '1', name: 'design-mockup.fig', type: 'Figma', size: '2.4 MB' },
          { id: '2', name: 'requirements.pdf', type: 'PDF', size: '1.2 MB' },
          { id: '3', name: 'api-spec.json', type: 'JSON', size: '45 KB' }
        ],
        comments: [
          { id: '1', author: 'John Doe', text: 'Great progress on the UI components!', timestamp: '2 hours ago' },
          { id: '2', author: 'Jane Smith', text: 'Don\'t forget to update the documentation.', timestamp: '1 hour ago' },
          { id: '3', author: 'Mike Johnson', text: 'The API integration looks good.', timestamp: '30 min ago' }
        ]
      }
      setSelectedTask(taskData)
      setIsDetailsPanelOpen(true)
      return
    }
    

    
    // Если это центр проекта И на ячейке есть здание и не правый клик - открываем детальную панель проекта
    if (isProjectCenter && (localBuilding || serverBuilding) && !isRightClick) {
      console.log('Found project center with building')
      
      const projectTaskData = {
        id: 'project-center',
        title: 'Project Center',
        description: 'This is the central hub of your project. From here you can manage all aspects of your project including tasks, zones, and buildings.',
        status: 'done' as const,
        priority: 'high' as const,
        storyPoints: 13,
        checklist: [
          { id: '1', text: 'Project initialized', completed: true },
          { id: '2', text: 'Core systems setup', completed: true },
          { id: '3', text: 'Development environment ready', completed: true },
          { id: '4', text: 'Team collaboration enabled', completed: true }
        ],
        attachments: [
          { id: '1', name: 'project-overview.pdf', type: 'PDF', size: '3.2 MB' },
          { id: '2', name: 'team-structure.md', type: 'Markdown', size: '15 KB' },
          { id: '3', name: 'development-guidelines.pdf', type: 'PDF', size: '1.8 MB' }
        ],
        comments: [
          { id: '1', author: 'Project Manager', text: 'Project center is now fully operational!', timestamp: '1 day ago' },
          { id: '2', author: 'Lead Developer', text: 'All core systems are running smoothly.', timestamp: '12 hours ago' },
          { id: '3', author: 'Designer', text: 'UI/UX guidelines have been updated.', timestamp: '6 hours ago' }
        ]
      }
      setSelectedTask(projectTaskData)
      setIsDetailsPanelOpen(true)
      return
    }
    
    // Удалено: логика создания зданий и ландшафта
    
    // Если в режиме создания зоны и это второй клик - игнорируем, так как выделение уже фиксировано
    if (isZoneMode && zoneSelectionMode !== 'idle' && firstClickCell && !isRightClick) {
      console.log('Zone selection is fixed, ignoring additional clicks:', { q, r })
      return
    }
    
    // Если ячейка пустая и не в зоне - запускаем режим создания зоны (только если в режиме зон)
    if (!isRightClick && !localBuilding && !serverBuilding && !zoneInfo && !zoneColor && !isProjectCenter && isZoneMode) {
      console.log('Starting zone creation mode for empty cell:', { q, r })
      console.log('Current isZoneMode:', isZoneMode)
      console.log('Current zoneSelectionMode:', zoneSelectionMode)
      
      // Если это первый клик в режиме зон
      if (zoneSelectionMode === 'idle') {
        // Автоматически создаем зону из 7 ячеек (центральная + 6 соседних)
        const neighbors = getNeighbors(q, r)
        const zoneCells = [`${q},${r}`, ...neighbors.map(([nq, nr]) => `${nq},${nr}`)]
        
        setIsZoneMode(true)
        // Keep as 'selecting' to satisfy union type
        setZoneSelectionMode('selecting')
        setFirstClickCell([q, r] as [number, number])
        setSelectedZoneCells(new Set(zoneCells))
        setFixedZoneCells(new Set(zoneCells)) // Фиксируем выделение сразу
        setSelectedZoneColor(getAvailableZoneColor())
        setExtendingZoneId(null)
        setShowTopPanel(false) // Скрываем панель, так как создание происходит через радиальное меню
        
        // Показываем радиальное меню для выбора объекта в центре
        const worldPos = hexToWorldPosition(q, r)
        console.log('=== RADIAL MENU POSITIONING ===')
        console.log('Cell coordinates:', [q, r])
        console.log('World position:', worldPos)
        console.log('Mouse position:', mousePosition)
        console.log('Window dimensions:', { width: window.innerWidth, height: window.innerHeight })
        
        setShowRadialMenu(true)
        setRadialMenuPosition([q, r] as [number, number])
        setRadialMenuWorldPosition(worldPos)
        setRadialMenuMousePosition(mousePosition || null)
        
        // Обновляем время последнего клика для автофокуса при первом клике
        setLastExtendingClick(Date.now())
        
        console.log('Set isZoneMode to true')
        console.log('Set zoneSelectionMode to fixed')
        console.log('Set firstClickCell to:', [q, r])
        console.log('Set selectedZoneCells to:', zoneCells)
        console.log('Showing radial menu for object selection')
        
        return
      }
    }
    
    // Если это центральная ячейка без здания - открываем панель проекта
    if (isProjectCenter && !localBuilding && !serverBuilding && !isRightClick) {
      console.log('🎯 Project center clicked without building - opening project panel')
      console.log('🎯 isProjectCenter:', isProjectCenter)
      console.log('🎯 localBuilding:', localBuilding)
      console.log('🎯 serverBuilding:', serverBuilding)
      console.log('🎯 Opening project panel')
      
      const projectTaskData = {
        id: 'project-center',
        title: 'Project Center',
        description: 'This is the central hub of your project. From here you can manage all aspects of your project including tasks, zones, and buildings.',
        status: 'done' as const,
        priority: 'high' as const,
        storyPoints: 13,
        checklist: [
          { id: '1', text: 'Project initialized', completed: true },
          { id: '2', text: 'Core systems setup', completed: true },
          { id: '3', text: 'Development environment ready', completed: true },
          { id: '4', text: 'Team collaboration enabled', completed: true }
        ],
        attachments: [
          { id: '1', name: 'project-overview.pdf', type: 'PDF', size: '3.2 MB' },
          { id: '2', name: 'team-structure.md', type: 'Markdown', size: '15 KB' },
          { id: '3', name: 'development-guidelines.pdf', type: 'PDF', size: '1.8 MB' }
        ],
        comments: [
          { id: '1', author: 'Project Manager', text: 'Project center is now fully operational!', timestamp: '1 day ago' },
          { id: '2', author: 'Lead Developer', text: 'All core systems are running smoothly.', timestamp: '12 hours ago' },
          { id: '3', author: 'Designer', text: 'UI/UX guidelines have been updated.', timestamp: '6 hours ago' }
        ]
      }
      console.log('🎯 Setting selectedTask and opening details panel')
      setSelectedTask(projectTaskData)
      setIsDetailsPanelOpen(true)
      console.log('🎯 Project panel should be open now')
      return
    }
    
    // Если ячейка пустая и не в зоне, но не в режиме зон - ничего не делаем
    if (!isRightClick && !localBuilding && !serverBuilding && !zoneInfo && !zoneColor && !isProjectCenter && !isZoneMode) {
      console.log('Empty cell clicked, but zone mode not active:', { q, r })
      return
    }
  }, [localBuildings, getBuildingForCell, getZoneInfo, getZoneColor, zones, setSelectedTask, setIsDetailsPanelOpen, getAvailableZoneColor, buildZoneObjectData, openSprintSidebar])

  // Удалено: функции для выбора зданий

  // Функция для получения центра зоны
  const getZoneCenter = (zoneId: string): [number, number] | null => {
    console.log(`getZoneCenter called for zoneId: ${zoneId}`)
    
    // Проверяем локальные зоны
    const localZone = localZones.find(zone => zone.id === zoneId)
    if (localZone && localZone.cells.length > 0) {
      console.log(`Found local zone:`, localZone)
      const center = calculateHexZoneCenter(localZone.cells)
      console.log(`Calculated center:`, center)
      return center
    }
    
    // Проверяем серверные зоны
    const zone = effectiveZones.find(z => z && z.id === zoneId)
    if (!zone) {
      console.log(`No zone found with id: ${zoneId}`)
      return null
    }

    // Получаем все ячейки этой зоны из zoneCells
    const zoneCellsForZone = effectiveZoneCells.filter(cell => cell.zone_id === zoneId)
    if (zoneCellsForZone.length === 0) {
      console.log(`No cells found for zone: ${zoneId}`)
      return null
    }

    // Используем новый правильный алгоритм центрирования
    const center = calculateHexZoneCenter(zoneCellsForZone)
    console.log(`Calculated server zone center:`, center)
    
    return center
  }

  // REFACTORED: Removed complex handleUnifiedDrop - using simple solution

  // Функция для определения центра зоны
  const isZoneCenter = (q: number, r: number) => {
    console.log(`isZoneCenter called for cell [${q}, ${r}]`)
    
    // Проверяем локальные зоны
    for (const zone of localZones) {
      console.log(`Checking local zone ${zone.id}:`, zone.cells)
      if (zone.cells.some(([cellQ, cellR]: [number, number]) => cellQ === q && cellR === r)) {
        const center = getZoneCenter(zone.id)
        console.log(`Local zone center:`, center)
        const isCenter = center ? q === center[0] && r === center[1] : false
        console.log(`Is center:`, isCenter)
        return isCenter
      }
    }
    
    // Проверяем серверные зоны
    const zone = getZoneForCell(q, r)
    if (!zone) {
      console.log(`No zone found for cell [${q}, ${r}]`)
      return false
    }

    const center = getZoneCenter(zone.id)
    console.log(`Server zone center:`, center)
    const isCenter = center ? q === center[0] && r === center[1] : false
    console.log(`Is center:`, isCenter)
    return isCenter
  }

  // ЕДИНАЯ ФУНКЦИЯ для правильного вычисления места дропа
  const calculateDropTarget = useCallback((clientX: number, clientY: number) => {
    console.log('🎯 Calculating drop target for:', { clientX, clientY })
    
    // Находим ячейку под курсором
    const cell = findCellUnderCursor(clientX, clientY)
    if (!cell) {
      console.log('❌ No cell found under cursor')
      return null
    }
    
    console.log('🎯 Found cell:', cell)
    
    // Получаем зону для ячейки
    const zone = getZoneForCell(cell.q, cell.r)
    const isCenter = isZoneCenter(cell.q, cell.r)
    
    console.log('🏢 Zone info:', {
      hasZone: !!zone,
      zoneName: zone?.name, 
      isCenter,
      cell: [cell.q, cell.r]
    })
    
    // Проверяем, что дроп на центр зоны
    if (!zone || !isCenter) {
      console.log('❌ Drop not on zone center - invalid target')
      return null
    }
    
    // Получаем zone object для этой ячейки
    const zoneObject = getZoneObjectForCell(cell.q, cell.r)
    if (!zoneObject) {
      console.log('❌ No zone object found for center cell')
      return null
    }
    
    console.log('✅ Valid drop target found:', {
      cell: [cell.q, cell.r],
      zone: zone.name,
      zoneObject: zoneObject.title
    })
    
    return {
      cell: [cell.q, cell.r],
      zone,
      zoneObject
    }
  }, [findCellUnderCursor, getZoneForCell, isZoneCenter, getZoneObjectForCell])

  const findTicketDetails = useCallback((ticketId: string) => {
    for (const [, list] of Object.entries(ticketsByZoneObject)) {
      const items = Array.isArray(list) ? list : []
      const found = items.find((item: any) => item && item.id === ticketId)
      if (found) return found
    }
    return null
  }, [ticketsByZoneObject])

const getZoneObjectById = useCallback((zoneObjectId: string | null | undefined) => {
  if (!zoneObjectId) return null
  return zoneObjects.find((obj) => obj && obj.id === zoneObjectId) || null
}, [zoneObjects])

const normalizeRocketCopyRecord = (
  raw: any,
  fallback: Partial<RocketTicketCopy>,
  findDetails: () => any
): RocketTicketCopy => {
  const details = findDetails()
  return {
    ticketId: fallback.ticketId || raw?.ticketId || raw?.id,
    status: String(raw?.status).toLowerCase() === 'done' ? 'done' : 'planned',
    title: raw?.title || fallback.title || details?.title || 'Ticket',
    ticketType: (raw?.ticketType || raw?.type || fallback.ticketType || details?.type || 'task') as RocketTicketCopy['ticketType'],
    priority: (raw?.priority ?? fallback.priority ?? details?.priority ?? null) as RocketTicketCopy['priority'],
    assigneeId: raw?.assigneeId ?? raw?.assignee_id ?? fallback.assigneeId ?? details?.assignee_id ?? null,
    assigneeName: raw?.assigneeName ?? raw?.assignee ?? fallback.assigneeName ?? (details as any)?.assignee ?? (details as any)?.assignee_name ?? null,
    originZoneObjectId: raw?.originZoneObjectId ?? raw?.locationObjectId ?? fallback.originZoneObjectId ?? details?.zone_object_id ?? null
  }
}

const useCachedRocketCopy = (
  projectId: string,
  findTicketDetails: (ticketId: string) => any
) => {
  return useCallback((zoneObjectId: string, ticketId: string): RocketTicketCopy | null => {
    try {
      const key = `rocket_copies_${projectId}_${zoneObjectId}`
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return null
      const entry = parsed.find((item: any) => {
        const id = typeof item?.ticketId === 'string' ? item.ticketId : item?.id
        return id === ticketId
      })
      if (!entry) return null
      const hydrate = () => findTicketDetails(ticketId)
      return normalizeRocketCopyRecord(entry, { ticketId }, hydrate)
    } catch (err) {
      console.error('Failed to read cached rocket copy', err)
      return null
    }
  }, [projectId, findTicketDetails])
}

const isSprintZoneObject = useCallback((zoneObject: any | null | undefined) => {
  if (!zoneObject) return false
  const rawType = (zoneObject as any).object_type ?? (zoneObject as any).type
  const type = String(rawType || '').toLowerCase()
  return type === 'sprint' || type === 'mountain'
  }, [])

  const ensureSprintContext = useCallback((zoneObject: any | null | undefined) => {
    if (!zoneObject || !zoneObject.id) return null
    const zoneId = zoneObject.id
    if (sprintObjectId !== zoneId) {
      setSprintObjectId(zoneId)
    }
    return zoneId
  }, [sprintObjectId])

  const getCachedRocketCopy = useCachedRocketCopy(projectId, findTicketDetails)

  useEffect(() => {
    const onOpen = (e: any) => {
      const detail = e?.detail || {}
      try {
        window.dispatchEvent(new CustomEvent('sprint-sidebar-open-event', { detail }))
      } catch (error) {
        console.error('failed to log sprint-sidebar-open-event', error)
      }
      const zoneObjectId = detail.zoneObjectId || detail.id || null
      if (!zoneObjectId) {
        console.warn('open-sprint-modal dispatched without zoneObjectId')
        return
      }

      if (isSprintOpen && selectedZoneObject && (selectedZoneObject as any).id === zoneObjectId) {
        return
      }

      const zoneObject = zoneObjects.find(obj => obj && obj.id === zoneObjectId)
      if (!zoneObject) {
        console.warn('open-sprint-modal: zone object not found for id', zoneObjectId)
        return
      }

      const targetQ = typeof detail.q === 'number' ? detail.q : (zoneObject as any).q || 0
      const targetR = typeof detail.r === 'number' ? detail.r : (zoneObject as any).r || 0

      openSprintSidebar(zoneObject, targetQ, targetR)
    }
    window.addEventListener('open-sprint-modal' as any, onOpen as any)
    return () => window.removeEventListener('open-sprint-modal' as any, onOpen as any)
  }, [zoneObjects, openSprintSidebar, isSprintOpen, selectedZoneObject])

  const buildRocketCopy = useCallback((ticketId: string, status: RocketTicketGhostStatus, originZoneObjectId: string | null): RocketTicketCopy => {
    const details = findTicketDetails(ticketId)
    return {
      ticketId,
      status,
      title: details?.title || 'Ticket',
      ticketType: (details?.type as RocketTicketCopy['ticketType']) || 'task',
      priority: (details?.priority as RocketTicketCopy['priority']) ?? null,
      assigneeId: details?.assignee_id ?? null,
      assigneeName: ((details as any)?.assignee ?? (details as any)?.assignee_name) ?? null,
      originZoneObjectId: originZoneObjectId ?? details?.zone_object_id ?? null
    }
  }, [findTicketDetails])

  const upsertRocketCopy = useCallback((ticketId: string, status: RocketTicketGhostStatus, originZoneObjectId: string | null) => {
    setRocketTicketCopies((prev) => {
      const index = prev.findIndex((copy) => copy.ticketId === ticketId)
      if (index === -1) {
        return [...prev, buildRocketCopy(ticketId, status, originZoneObjectId)]
      }
      const next = [...prev]
      const rebuilt = buildRocketCopy(ticketId, status, originZoneObjectId ?? prev[index].originZoneObjectId)
      next[index] = { ...next[index], ...rebuilt, status }
      return next
    })
  }, [buildRocketCopy])

  const removeRocketCopy = useCallback((ticketId: string) => {
    setRocketTicketCopies((prev) => prev.filter((copy) => copy.ticketId !== ticketId))
  }, [])

  // Load sprint state (planned/done ghosts, metadata) from Supabase / local fallback
  useEffect(() => {
    let cancelled = false

    setIsSprintStateLoaded(false)
    setActiveSprintId(null)
    setPlannedCountAtStart(null)
    setIsSprintStarted(false)
    setSprintStartedAt(null)

    const resetSprintState = () => {
      if (cancelled) return
      setRocketTicketCopies([])
      setPlannedTickets(new Set())
      setActiveSprintId(null)
      setIsSprintStarted(false)
      setSprintStartedAt(null)
      setPlannedCountAtStart(null)
      if (sprintObjectId) {
        setSprintProgressByObject(prev => ({
          ...prev,
          [sprintObjectId]: { total: 0, done: 0 }
        }))
      }
    }

    if (!sprintObjectId) {
      resetSprintState()
      setSprintName('Sprint')
      setSprintWeeks(2)
      setIsSprintStateLoaded(true)
      return
    }

    const loadFromSupabase = async () => {
      try {
        const { sprintService } = await import('../lib/supabase')
        const remote = await sprintService.getCurrentSprintForObject(projectId, sprintObjectId)
        if (cancelled) return false

        if (remote) {
          setActiveSprintId(remote.id || null)
          const remoteStatus = String(remote.status || '').toLowerCase()
          const isActive = remoteStatus === 'active'
          setIsSprintStarted(isActive)
          setSprintStartedAt(remote.started_at ? new Date(remote.started_at) : (isActive ? new Date() : null))
          if (typeof remote.weeks === 'number' && remote.weeks > 0) {
            setSprintWeeks(remote.weeks)
          }
          if (remote.name) {
            setSprintName(remote.name)
            setActiveSprintNames(prev => ({
              ...prev,
              [sprintObjectId]: remote.name
            }))
          }

          const plannedIds = Array.isArray(remote.planned_ticket_ids)
            ? remote.planned_ticket_ids.filter((id: any) => typeof id === 'string')
            : []
          const doneIds = Array.isArray(remote.done_ticket_ids)
            ? remote.done_ticket_ids.filter((id: any) => typeof id === 'string')
            : []

          const remoteCopies: RocketTicketCopy[] = []
          plannedIds.forEach((id) => { remoteCopies.push(buildRocketCopy(id, 'planned', null)) })
          doneIds.forEach((id) => { remoteCopies.push(buildRocketCopy(id, 'done', null)) })

          setRocketTicketCopies(remoteCopies)
          setPlannedTickets(new Set(plannedIds))
          setPlannedCountAtStart(plannedIds.length)
          setSprintProgressByObject(prev => ({
            ...prev,
            [sprintObjectId]: {
              total: plannedIds.length + doneIds.length,
              done: doneIds.length
            }
          }))
          setIsSprintStateLoaded(true)
          return true
        }
      } catch (error) {
        console.error('Failed to load sprint state from Supabase', error)
      }
      return false
    }

    const loadFromLocalStorage = () => {
      try {
        const plannedKey = `planned_tickets_${projectId}_${sprintObjectId}`
        const copiesKey = `rocket_copies_${projectId}_${sprintObjectId}`
        const nameKey = `sprint_name_${projectId}_${sprintObjectId}`

        const storedCopiesRaw = localStorage.getItem(copiesKey)
        if (storedCopiesRaw) {
          try {
            const parsed = JSON.parse(storedCopiesRaw)
            if (Array.isArray(parsed)) {
              const normalized = parsed
                .map((item: any): RocketTicketCopy | null => {
                  if (!item) return null
                  const ticketId = item.ticketId || item.id
                  const status = item.status === 'done' ? 'done' : 'planned'
                  if (!ticketId) return null
                  return {
                    ticketId,
                    status,
                    title: item.title || 'Ticket',
                    ticketType: item.ticketType || item.type || 'task',
                    priority: item.priority ?? null,
                    assigneeId: item.assigneeId ?? item.assignee_id ?? null,
                    originZoneObjectId: item.originZoneObjectId ?? item.locationObjectId ?? null
                  }
                })
                .filter((x): x is RocketTicketCopy => Boolean(x))
              setRocketTicketCopies(normalized)
              setPlannedTickets(new Set(normalized.filter(copy => copy.status === 'planned').map(copy => copy.ticketId)))
              setSprintProgressByObject(prev => ({
                ...prev,
                [sprintObjectId]: {
                  total: normalized.length,
                  done: normalized.filter(copy => copy.status === 'done').length
                }
              }))
            } else {
              resetSprintState()
            }
          } catch {
            resetSprintState()
          }
        } else {
          const saved = localStorage.getItem(plannedKey)
          if (saved) {
            try {
              const ids = JSON.parse(saved)
              if (Array.isArray(ids)) {
                const fallbackCopies: RocketTicketCopy[] = ids
                  .filter((id): id is string => typeof id === 'string')
                  .map((ticketId) => buildRocketCopy(ticketId, 'planned', null))
                setRocketTicketCopies(fallbackCopies)
                setPlannedTickets(new Set(ids.filter((id): id is string => typeof id === 'string')))
                setSprintProgressByObject(prev => ({
                  ...prev,
                  [sprintObjectId]: {
                    total: fallbackCopies.length,
                    done: fallbackCopies.filter(copy => copy.status === 'done').length
                  }
                }))
              } else {
                resetSprintState()
              }
            } catch {
              resetSprintState()
            }
          } else {
            resetSprintState()
          }
        }

        const savedName = localStorage.getItem(nameKey)
        if (savedName) {
          setSprintName(savedName)
          setActiveSprintNames(prev => ({
            ...prev,
            [sprintObjectId]: savedName
          }))
        } else {
          setSprintName('Sprint')
        }
      } catch (error) {
        console.error('Failed to load sprint state from localStorage', error)
        resetSprintState()
      }

      setIsSprintStateLoaded(true)
    }

    (async () => {
      const loaded = await loadFromSupabase()
      if (!loaded && !cancelled) {
        loadFromLocalStorage()
      }
    })()

    return () => { cancelled = true }
  }, [projectId, sprintObjectId, buildRocketCopy, setActiveSprintNames])

  

  // Handle planning and sprint ticket movement
  useEffect(() => {
    const onMoved = (e: any) => {
      const { from, to, ticketId } = e.detail || {}
      if (!ticketId || !sprintObjectId) return

      if (!isSprintStarted) {
        if (to === sprintObjectId) {
          upsertRocketCopy(ticketId, 'planned', from || null)
          return
        }
        if (from === sprintObjectId) {
          removeRocketCopy(ticketId)
        }
        return
      }

      if (from === sprintObjectId && to && to !== sprintObjectId) {
        upsertRocketCopy(ticketId, 'planned', to || null)
        void (async () => {
          try {
            const { ticketService } = await import('../lib/supabase')
            await ticketService.removeTicketsFromSprint([ticketId])
          } catch (err) {
            console.error('Failed to detach ticket from sprint after move', err)
          }
        })()
      }

      if (to === sprintObjectId) {
        const existing = rocketCopiesRef.current.find((copy) => copy.ticketId === ticketId)
        if (existing) {
          upsertRocketCopy(ticketId, 'done', from || existing.originZoneObjectId || null)
          if (activeSprintId) {
            void (async () => {
              try {
                const { ticketService } = await import('../lib/supabase')
                await ticketService.assignTicketsToSprint([ticketId], activeSprintId, { boardColumn: 'in_sprint' })
              } catch (err) {
                console.error('Failed to flag ticket as in sprint after move', err)
              }
            })()
          }
        }
      }
    }

    window.addEventListener('ticket-moved' as any, onMoved as any, true)
    return () => window.removeEventListener('ticket-moved' as any, onMoved as any, true)
  }, [isSprintStarted, sprintObjectId, upsertRocketCopy, removeRocketCopy, activeSprintId])

  useEffect(() => {
    if (rocketTicketCopies.length === 0) return
    setRocketTicketCopies((prev) => {
      let hasChanges = false
      const next = prev.map((copy) => {
        const details = findTicketDetails(copy.ticketId)
        if (!details) return copy

        let modified = false
        const updated: RocketTicketCopy = { ...copy }

        if (details.title && details.title !== copy.title) {
          updated.title = details.title
          modified = true
        }
        if (details.type && details.type !== copy.ticketType) {
          updated.ticketType = details.type
          modified = true
        }
        if (details.priority && details.priority !== copy.priority) {
          updated.priority = details.priority
          modified = true
        }
        if (details.assignee_id !== undefined && details.assignee_id !== copy.assigneeId) {
          updated.assigneeId = details.assignee_id
          modified = true
        }
        const detailsAssigneeName = (details as any)?.assignee ?? (details as any)?.assignee_name ?? null
        if (detailsAssigneeName !== undefined && detailsAssigneeName !== copy.assigneeName) {
          updated.assigneeName = detailsAssigneeName
          modified = true
        }
        if (details.zone_object_id && details.zone_object_id !== copy.originZoneObjectId) {
          updated.originZoneObjectId = details.zone_object_id
          modified = true
        }

        if (modified) {
          hasChanges = true
          return updated
        }
        return copy
      })
      return hasChanges ? next : prev
    })
  }, [rocketTicketCopies.length, findTicketDetails])

  const activeSprintProgress = useMemo(() => {
    const total = rocketTicketCopies.length
    const done = rocketTicketCopies.filter((copy) => copy.status === 'done').length
    return { total, done }
  }, [rocketTicketCopies])

  const sprintSidebarTickets = useMemo<SprintSidebarTicket[]>(() => {
    const sprintZoneObject = sprintObjectId ? getZoneObjectById(sprintObjectId) : null

    return rocketTicketCopies.map((copy) => {
      const origin = getZoneObjectById(copy.originZoneObjectId)
      const details = findTicketDetails(copy.ticketId)
      const detailZoneObject = details?.zone_object_id ? getZoneObjectById(details.zone_object_id) : null
      const effectiveOrigin = origin ?? detailZoneObject
      const focusTarget = effectiveOrigin ?? sprintZoneObject
      const focusPosition = focusTarget ? hexToWorldPosition(focusTarget.q, focusTarget.r) : null
      const originTitle = effectiveOrigin?.title || null
      const subtitle = copy.status === 'done'
        ? `Completed in ${originTitle ?? 'Sprint'}`
        : `Ticket in ${originTitle ?? 'Pipeline'}`

      return {
        id: copy.ticketId,
        title: copy.title,
        ticketType: copy.ticketType,
        priority: copy.priority ?? null,
        status: copy.status,
        subtitle,
        originName: originTitle,
        assigneeId: copy.assigneeId ?? null,
        assigneeName: copy.assigneeName ?? null,
        onClick: focusPosition ? () => {
          const [focusX, focusY, focusZ] = focusPosition
          try {
            window.dispatchEvent(new CustomEvent('camera-focus', {
              detail: {
                position: [focusX, focusY, focusZ],
                ticketId: copy.ticketId,
                zoneObjectId: focusTarget?.id ?? null
              }
            }))
          } catch (err) {
            console.error('Failed to dispatch camera focus for sprint ticket', err)
          }
        } : undefined,
        onDragStart: (event) => {
          try {
            event.dataTransfer?.setData('application/x-remove-from-sprint', JSON.stringify({ ticketId: copy.ticketId }))
            event.dataTransfer?.setData('application/x-ticket-type', copy.ticketType)
            event.dataTransfer?.setData('text/plain', copy.ticketType)
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = 'move'
            }
            const ghostData: DragGhostData = {
              title: copy.title,
              type: copy.ticketType,
              priority: copy.priority || undefined,
              isNewTicket: false
            }
            setDragImage(event, ghostData)
          } catch (err) {
            console.error('Failed to initialise sprint ghost drag', err)
          }
          try {
            window.dispatchEvent(new CustomEvent('ticket-dragstart', {
              detail: {
                type: copy.ticketType,
                ticketId: copy.ticketId,
                fromZoneObjectId: copy.originZoneObjectId ?? sprintObjectId
              }
            }))
          } catch {}
        },
        onDragEnd: () => {
          try { window.dispatchEvent(new CustomEvent('ticket-dragend')) } catch {}
        }
      }
    })
  }, [rocketTicketCopies, getZoneObjectById, sprintObjectId, findTicketDetails])

  const plannedSprintTickets = useMemo(() => sprintSidebarTickets.filter((ticket) => ticket.status === 'planned'), [sprintSidebarTickets])
  const doneSprintTickets = useMemo(() => sprintSidebarTickets.filter((ticket) => ticket.status === 'done'), [sprintSidebarTickets])

  const handleSprintNameDraftChange = useCallback((value: string) => {
    setSprintName(value)
  }, [])

  const handleSprintNameCommit = useCallback(async (value: string) => {
    const name = value.trim() || 'Sprint'
    setSprintName(name)
    if (!sprintObjectId) return
    try {
      const { sprintService } = await import('../lib/supabase')
      const result = await sprintService.saveSprintState({
        sprintId: activeSprintId,
        projectId,
        zoneObjectId: sprintObjectId,
        name,
        status: isSprintStarted ? 'active' : 'draft',
        startedAt: isSprintStarted ? (sprintStartedAt ? sprintStartedAt.toISOString() : null) : undefined
      })
      if (result && result.id && result.id !== activeSprintId) {
        setActiveSprintId(result.id)
      }
      setActiveSprintNames(prev => ({
        ...prev,
        [sprintObjectId]: name
      }))
    } catch (error) {
      console.error('Failed to update sprint name', error)
    }
  }, [activeSprintId, projectId, sprintObjectId, isSprintStarted, sprintStartedAt])

  const handleSprintDurationChange = useCallback((weeks: number) => {
    setSprintWeeks(weeks)
  }, [])

  const handleSprintStart = useCallback(async () => {
    if (isSprintActionLoading || isSprintStarted || !sprintObjectId) return
    if (plannedTickets.size === 0) {
      setNotification({ message: 'Plan tickets for Sprint before starting', type: 'warning' })
      setTimeout(() => setNotification(null), 2000)
      return
    }

    const plannedIds = plannedSprintTickets.map((ticket) => ticket.id)
    const doneIds = doneSprintTickets.map((ticket) => ticket.id)
    const nameToPersist = (sprintName || 'Sprint').trim() || 'Sprint'

    setIsSprintActionLoading(true)
    try {
      const { sprintService } = await import('../lib/supabase')
      const activated = await sprintService.activateSprint({
        sprintId: activeSprintId,
        projectId,
        zoneObjectId: sprintObjectId,
        name: nameToPersist,
        weeks: sprintWeeks,
        plannedTicketIds: plannedIds,
        doneTicketIds: doneIds
      })

      if (activated) {
        setIsSprintStarted(true)
        setActiveSprintId(activated.id || activeSprintId)
        const started = activated.started_at ? new Date(activated.started_at) : new Date()
        setSprintStartedAt(started)
        if (typeof activated.weeks === 'number' && activated.weeks > 0) {
          setSprintWeeks(activated.weeks)
        }
        setPlannedCountAtStart(plannedIds.length)
        setActiveSprintNames(prev => ({
          ...prev,
          [sprintObjectId]: activated.name || nameToPersist
        }))

        if (sprintObjectId) {
          try {
            await sprintService.attachTicketsInObjectToSprint(sprintObjectId, activated.id)
          } catch (err) {
            console.error('Failed to attach tickets to sprint', err)
          }
        }
        if (activated.id) {
          try { localStorage.setItem(`sprint_planned_${activated.id}`, String(plannedIds.length)) } catch {}
        }
      }
    } catch (error) {
      console.error('Sprint start error', error)
      setNotification({ message: 'Failed to start sprint', type: 'error' })
      setTimeout(() => setNotification(null), 2000)
    } finally {
      setIsSprintActionLoading(false)
    }
  }, [
    isSprintActionLoading,
    isSprintStarted,
    sprintObjectId,
    plannedTickets,
    plannedSprintTickets,
    doneSprintTickets,
    activeSprintId,
    projectId,
    sprintName,
    sprintWeeks
  ])

  const handleSprintStop = useCallback(async () => {
    if (isSprintActionLoading || !isSprintStarted || !activeSprintId) return

    setIsSprintActionLoading(true)
    try {
      const { sprintService, ticketService } = await import('../lib/supabase')
      const plannedIds = plannedSprintTickets.map((ticket) => ticket.id)
      const doneIds = doneSprintTickets.map((ticket) => ticket.id)

      await sprintService.finishSprint(activeSprintId, {
        plannedTicketIds: plannedIds,
        doneTicketIds: doneIds,
        zoneObjectId: sprintObjectId
      })

      if (doneIds.length > 0) {
        try {
          await ticketService.markTicketsDone(doneIds, activeSprintId)
        } catch (err) {
          console.error('Failed to mark sprint tickets as done', err)
        }
        try {
          await sprintService.incrementProjectCrystals(projectId, doneIds.length)
        } catch (err) {
          console.error('Failed to increment project crystals', err)
        }
      }

      const archivedCount = await sprintService.archiveSprintTickets(projectId, activeSprintId, null)
      setIsSprintStarted(false)
      setActiveSprintId(null)
      setSprintStartedAt(null)
      setSprintTickets([])
      setRocketTicketCopies([])
      setPlannedTickets(new Set())
      setPlannedCountAtStart(null)
      try { localStorage.removeItem(`sprint_planned_${activeSprintId}`) } catch {}
      if (sprintObjectId) {
        try { localStorage.removeItem(`planned_tickets_${projectId}_${sprintObjectId}`) } catch {}
        try { localStorage.removeItem(`rocket_copies_${projectId}_${sprintObjectId}`) } catch {}
      }
      try { await reloadData() } catch (err) { console.error('Failed to reload data after sprint stop', err) }
      try { window.dispatchEvent(new Event('sprint-completed')) } catch {}
      setNotification({ message: `Sprint finished, archived ${archivedCount} tickets`, type: 'info' })
      setTimeout(() => setNotification(null), 2000)
    } catch (error) {
      console.error('Sprint stop error', error)
      setNotification({ message: 'Failed to stop sprint', type: 'error' })
      setTimeout(() => setNotification(null), 2000)
    } finally {
      setIsSprintActionLoading(false)
    }
  }, [
    isSprintActionLoading,
    isSprintStarted,
    activeSprintId,
    projectId,
    sprintObjectId,
    reloadData,
    plannedSprintTickets,
    doneSprintTickets
  ])

  const sprintStartDisabled = isSprintActionLoading || isSprintStarted || plannedSprintTickets.length === 0 || !sprintObjectId || !isSprintStateLoaded
  const sprintStopDisabled = isSprintActionLoading || !isSprintStarted

  // Гибридные обработчики drag & drop
  useEffect(() => {
    console.log('🔧 HexGridSystem: Setting up hybrid drag & drop event listeners')
    
    const handleHybridDragStart = (e: any) => {
      console.log('🎯 Hybrid dragstart received:', e.detail)
      
      isDraggingRef.current = true
      setIsDraggingTicket(true)
      
      const dragData: HybridDragData = e.detail
      if (dragData.isNewTicket && dragData.type) {
        console.log('🆕 Hybrid new ticket drag detected:', dragData.type)
        setPendingTicketType(dragData.type as any)
      }
    }
    
    const handleHybridDragEnd = (e: any) => {
      console.log('🎯 Hybrid dragend received')
      isDraggingRef.current = false
      setIsDraggingTicket(false)
      setPendingTicketType(null)
    }
    
    const handleHybridDrop = (e: any) => {
      console.log('🎯 Hybrid drop received:', e.detail)

      const { dragData, clientX, clientY } = e.detail
      if (!dragData) {
        console.log('❌ No dragData found, returning')
        return
      }

      console.log('🎯 DragData:', dragData)

      const dropTarget = calculateDropTarget(clientX, clientY)
      const targetZoneObject = dropTarget?.zoneObject || null
      const isSprintTarget = isSprintZoneObject(targetZoneObject)
      const sprintTargetId = isSprintTarget
        ? ensureSprintContext(targetZoneObject)
        : sprintObjectId

      if (!dropTarget) {
        if (dragData.isSprintGhostRemoval && dragData.ticketId) {
          console.log('🧹 Removing rocket copy after drop outside sprint')
          removeRocketCopy(dragData.ticketId)
        } else {
          console.log('❌ Invalid drop target')
        }
        return
      }

      if (dragData.isSprintGhostRemoval && dragData.ticketId) {
        if (!isSprintTarget) {
          console.log('🧹 Removing rocket copy via ghost removal drop')
          removeRocketCopy(dragData.ticketId)
        }
        return
      }

      if (isSprintTarget && dragData.isExistingTicket && dragData.ticketId) {
        const ticketId = dragData.ticketId
        const sprintZoneId = (targetZoneObject as any)?.id || sprintTargetId || sprintObjectId || null
        let existing = rocketCopiesRef.current.find((copy) => copy.ticketId === ticketId)

        if (!existing && sprintZoneId) {
          const cached = getCachedRocketCopy(sprintZoneId, ticketId)
          if (cached) {
            existing = cached
            setRocketTicketCopies((prev) => {
              const index = prev.findIndex((copy) => copy.ticketId === ticketId)
              if (index === -1) {
                return [...prev, cached]
              }
              const next = [...prev]
              next[index] = { ...next[index], ...cached }
              return next
            })
          }
        }
        const origin = dragData.fromZoneObjectId || existing?.originZoneObjectId || null

        let nextStatus: RocketTicketGhostStatus = 'planned'
        if (existing) {
          if (existing.status === 'planned') {
            nextStatus = isSprintStarted ? 'done' : 'planned'
          } else {
            nextStatus = existing.status
          }
        } else {
          nextStatus = 'planned'
        }

        if (existing && existing.status === nextStatus && existing.originZoneObjectId === origin) {
          return
        }

        if (nextStatus === 'planned' && existing && existing.status === 'planned' && !isSprintStarted) {
          return
        }

        console.log('🚀 Updating rocket copy for ticket:', ticketId, 'status:', nextStatus)
        upsertRocketCopy(ticketId, nextStatus, origin)

        if (nextStatus === 'done' && isSprintStarted && sprintZoneId) {
          const currentFrom = dragData.fromZoneObjectId
            || findTicketDetails(ticketId)?.zone_object_id
            || existing?.originZoneObjectId
            || null

          if (currentFrom && currentFrom !== sprintZoneId) {
            moveTicket(ticketId, currentFrom, sprintZoneId)
          }

          if (activeSprintId) {
            void (async () => {
              try {
                const { ticketService } = await import('../lib/supabase')
                await ticketService.assignTicketsToSprint([ticketId], activeSprintId, { boardColumn: 'in_sprint' })
              } catch (err) {
                console.error('Failed to assign ticket to sprint after completion', err)
              }
            })()
          }
        }
        return
      }

      // Используем единую функцию для вычисления места дропа
      if (dragData.isNewTicket) {
        console.log('🆕 Opening modal for new ticket:', dragData.type, 'on zone center:', dropTarget.cell)
        setModalConfig({
          isOpen: true,
          ticketType: dragData.type,
          cell: dropTarget.cell as [number, number]
        })
      } else if (dragData.isExistingTicket) {
        console.log('🔄 Moving existing ticket:', dragData.ticketId, 'to zone center:', dropTarget.cell)
        if (dragData.fromZoneObjectId !== dropTarget.zoneObject.id) {
          moveTicket(dragData.ticketId, dragData.fromZoneObjectId, dropTarget.zoneObject.id)
        }
      }
    }

    // Добавляем слушатели для гибридных событий
    addHybridEventListener('hybrid-dragstart', handleHybridDragStart)
    addHybridEventListener('hybrid-dragend', handleHybridDragEnd)
    addHybridEventListener('hybrid-drop', handleHybridDrop)
    
    console.log('✅ HexGridSystem: Hybrid event listeners added successfully')
    
    return () => {
      removeHybridEventListener('hybrid-dragstart', handleHybridDragStart)
      removeHybridEventListener('hybrid-dragend', handleHybridDragEnd)
      removeHybridEventListener('hybrid-drop', handleHybridDrop)
    }
  }, [
    calculateDropTarget,
    isSprintZoneObject,
    moveTicket,
    removeRocketCopy,
    upsertRocketCopy,
    ensureSprintContext,
    findTicketDetails,
    isSprintStarted,
    sprintObjectId,
    activeSprintId,
    getCachedRocketCopy
  ])

  // Упрощение: статус зоны не влияет на визуальное состояние центра — объект строится сразу
  const calculateZoneProgress = (_zoneId: string): number => 100


  // Функция для получения объекта зоны для конкретной ячейки (использует серверные данные)
  const getZoneObjectForCellLocal = (q: number, r: number) => {
    
    const foundObject = zoneObjects.find(obj => 
      obj.q === q && obj.r === r
    ) || null
    
    if (foundObject) {
      console.log(`Found object for [${q}, ${r}]:`, foundObject)
    } else {
      // Ячейка пустая - это нормально
      console.debug(`Cell [${q}, ${r}] is empty`)
    }
    
    if (foundObject) {
      console.log(`=== PROCESSING FOUND OBJECT ===`)
      console.log('Raw object from database:', foundObject)
      console.log('Object ID:', foundObject.id)
      console.log('Object title:', foundObject.title)
      console.log('Object description:', foundObject.description)
      console.log('Object status:', foundObject.status)
      console.log('Object priority:', foundObject.priority)
      console.log('Object story_points:', foundObject.story_points)
      
      // Проверяем, является ли это центральным объектом зоны
      const isCenterObject = isZoneCenter(foundObject.q, foundObject.r)
      const zoneProgress = isCenterObject ? (calculateZoneProgress(foundObject.zone_id) ?? 0) : 0
      
      // Преобразуем структуру данных из базы в формат, ожидаемый компонентом
      const processedObject = {
        id: foundObject.id,
        // Используем фактический тип объекта из БД для ЛЮБОГО центра
        type: foundObject.object_type,
        title: foundObject.title || 'Untitled Task',
        description: foundObject.description || (isCenterObject ? 'Central building of the zone' : 'No description'),
        status: isCenterObject ? (zoneProgress === 100 ? 'done' : zoneProgress > 0 ? 'in_progress' : 'open') : (foundObject.status !== null && foundObject.status !== undefined ? foundObject.status : 'open'),
        priority: isCenterObject ? 'medium' : (foundObject.priority || 'medium'), // для центральных объектов фиксированный приоритет
        storyPoints: foundObject.story_points || 0,
        zoneId: foundObject.zone_id,
        cellPosition: [foundObject.q, foundObject.r] as [number, number],
        createdAt: new Date(foundObject.created_at),
        // Специальные поля для центральных объектов зон
        isZoneCenter: isCenterObject,
        zoneProgress: zoneProgress ?? 0,
        // Добавляем пустые массивы для checklist, attachments, comments
        checklist: [
          { id: '1', text: 'Review requirements', completed: true },
          { id: '2', text: 'Create wireframes', completed: true },
          { id: '3', text: 'Implement UI components', completed: false },
          { id: '4', text: 'Write tests', completed: false },
          { id: '5', text: 'Deploy to staging', completed: false }
        ],
        attachments: [
          { id: '1', name: 'design-mockup.fig', type: 'Figma', size: '2.4 MB' },
          { id: '2', name: 'requirements.pdf', type: 'PDF', size: '1.2 MB' },
          { id: '3', name: 'api-spec.json', type: 'JSON', size: '45 KB' }
        ],
        comments: [
          { id: '1', author: 'John Doe', text: 'Great progress on the UI components!', timestamp: '2 hours ago' },
          { id: '2', author: 'Jane Smith', text: 'Don\'t forget to update the documentation.', timestamp: '1 hour ago' },
          { id: '3', author: 'Mike Johnson', text: 'The API integration looks good.', timestamp: '30 min ago' }
        ]
      }
      
      console.log(`=== PROCESSED OBJECT ===`)
      console.log('Processed object for UI:', processedObject)
      console.log('Processed status:', processedObject.status)
      console.log('Processed status type:', typeof processedObject.status)
      
      return processedObject
    }
    
    console.log(`No object found for cell [${q}, ${r}]`)
    return null
  }

  // Функция для определения выделения ячейки
  // const isCellSelected = (q: number, r: number) => {
  //   const cellKey = `${q},${r}`
  //   return selectedCells.has(cellKey) || selectedZoneCells.has(cellKey) || flagCells.has(cellKey) || currentZonePath.some(([cellQ, cellR]) => cellQ === q && cellR === r)
  // }

  // Обработчик создания зоны из формы
  const handleCreateZoneFromForm = async (name: string, color: string) => {
    const cells: Array<[number, number]> = Array.from(selectedCells).map(cell => {
      const [q, r] = cell.split(',').map(Number)
      return [q, r]
    })

    const newZone: ZoneMarking = {
      id: `zone-${Date.now()}`,
      name,
      color,
      cells,
      createdAt: new Date()
    }

    await handleZoneCreate(newZone)
    handleSelectionClear()
  }

  // Обработчик отмены создания зоны
  const handleCancelZoneCreation = () => {
    handleSelectionClear()
  }



  // Обработчик нажатия клавиш
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'F' || event.key === 'f') {
        setIsFlagMode(!isFlagMode)
        setFlagCells(new Set())
        setCurrentZonePath([])
      }
      
      // Горячие клавиши для строительства
      // numeric key handlers are disabled in this build
      
      // Выход из режимов по ESC
      if (event.key === 'Escape') {
        // Сначала закрываем радиальное меню, если оно открыто
        if (showRadialMenu) {
          handleRadialMenuClose()
          return
        }
        
        // Затем выходим из режимов зон
        if (zoneSelectionMode !== 'idle') {
          handleExitZoneMode()
        } else if (isZoneMode) {
          handleExitZoneModeCompletely()
        }
      }
      
      // Подсказки камеры отключены
      
      // Переключение названий зон по N
      if (event.key.toLowerCase() === 'n') {
        setShowZoneNames(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isFlagMode, zoneSelectionMode, isZoneMode, showRadialMenu, handleRadialMenuClose])

  // Ref для Canvas уже объявлен выше

  // REFACTORED: Removed old onDrop callback - now using unified drop handler

  // Улучшенный DropHandler с правильным raycasting
  const DropHandler: React.FC = () => {
    const { camera, gl } = useThree()
    const raycaster = useRef(new THREE.Raycaster())
    
    // Функция для получения позиции мыши в normalized device coordinates
    const getMouseNDC = (e: DragEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
    }
    
    // Функция для поиска ячейки под курсором
    const findCellUnderCursor = (e: DragEvent) => {
      console.log('🔍 findCellUnderCursor called with event:', e)
      
      const mouse = getMouseNDC(e)
      console.log('📍 Mouse NDC coordinates:', mouse)
      
      raycaster.current.setFromCamera(mouse, camera)
      
      // Получаем все объекты для проверки
      const targets = Array.from(hoverTargetsRef.current.values())
      console.log('🎯 Available hover targets:', targets.length)
      
      // Логируем информацию о первых нескольких объектах
      targets.slice(0, 3).forEach((target, index) => {
        console.log(`🎯 Target ${index}:`, {
          type: target.type,
          userData: target.userData,
          position: target.position,
          visible: target.visible
        })
      })
      
      const intersects = raycaster.current.intersectObjects(targets, false)
      console.log('💥 Raycaster intersections:', intersects.length)
      
      if (intersects.length > 0) {
        const hit = intersects[0]
        const userData = hit.object.userData
        console.log('🎯 Hit object userData:', userData)
        
        if (userData && userData.isBuilding) {
          console.log('✅ Found building cell:', { q: userData.q, r: userData.r })
          return { q: userData.q, r: userData.r, object: hit.object }
        } else {
          console.log('❌ Hit object is not a building')
        }
      } else {
        console.log('❌ No intersections found')
      }
      
      return null
    }
    
    // REFACTORED: Moved handleUnifiedDrop outside DropHandler to make it accessible
    
    useEffect(() => {
      const handleDragEnter = (e: DragEvent) => {
        e.preventDefault()
        console.log('🎯 DRAG ENTER EVENT!')
        console.log('🎯 DataTransfer types:', e.dataTransfer?.types)
        setIsDraggingTicket(true)
      }
      
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        
        // Определяем тип операции по dataTransfer
        const existingTicketData = e.dataTransfer?.getData('application/x-existing-ticket')
        const isExistingTicket = Boolean(existingTicketData)
        
        // Устанавливаем правильный dropEffect
        e.dataTransfer!.dropEffect = isExistingTicket ? 'move' : 'copy'
        
        console.log('🎯 DRAG OVER EVENT!', { isExistingTicket, dropEffect: e.dataTransfer!.dropEffect })
        
        const cell = findCellUnderCursor(e)
        console.log('🎯 DragOver: findCellUnderCursor result:', cell)
        
        if (cell) {
          setHoveredCellDuringDrag([cell.q, cell.r])
          
          // Устанавливаем candidateCenterCell для всех центров зон
          const isCenter = isZoneCenter(cell.q, cell.r)
          setCandidateCenterCell(isCenter ? [cell.q, cell.r] : null)
          
          const zone = getZoneForCell(cell.q, cell.r)
          console.log('🎯 DragOver: Cell found', {
            cell: [cell.q, cell.r],
            isCenter,
            candidateCenterCell: isCenter ? [cell.q, cell.r] : null,
            zone: zone ? { name: zone.name, center: getZoneCenter(zone.id) } : null
          })
          
          // Применяем hover эффект напрямую к mesh - только для центров зон
          if (cell.object && cell.object instanceof THREE.Mesh) {
            const material = cell.object.material as THREE.MeshStandardMaterial
            if (isCenter) {
              material.emissive = new THREE.Color('#00ff00')
              material.emissiveIntensity = 0.3
            }
            // Убираем красные эффекты для нецентров зон
          }
        } else {
          setHoveredCellDuringDrag(null)
          setCandidateCenterCell(null)
          
          // Fallback: показываем информацию о зоне даже когда raycasting не работает
          const canvas = document.querySelector('canvas')
          if (canvas) {
            const rect = canvas.getBoundingClientRect()
            const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
            const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
            
            const approxQ = Math.round((nx + 1) * 3) - 2
            const approxR = Math.round((ny + 1) * 2) - 1
            
            const zone = getZoneForCell(approxQ, approxR)
            const isCenter = zone && isZoneCenter(approxQ, approxR)
            
            console.log('🎯 DragOver: Zone info:', {
              approxCell: [approxQ, approxR],
              hasZone: !!zone,
              zoneName: zone?.name,
              isZoneCenter: isCenter
            })
          }
          
          // Сбрасываем все hover эффекты
          hoverTargetsRef.current.forEach((mesh) => {
            if (mesh instanceof THREE.Mesh) {
              const material = mesh.material as THREE.MeshStandardMaterial
              material.emissive = new THREE.Color(0x000000)
              material.emissiveIntensity = 0
            }
          })
        }
        
      }
      
      const handleDragLeave = (e: DragEvent) => {
        // Проверяем, действительно ли мы покинули canvas
        const rect = gl.domElement.getBoundingClientRect()
        const x = e.clientX
        const y = e.clientY
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
          setHoveredCellDuringDrag(null)
          setCandidateCenterCell(null)
          
          // Сбрасываем все hover эффекты
          hoverTargetsRef.current.forEach((mesh) => {
            if (mesh instanceof THREE.Mesh) {
              const material = mesh.material as THREE.MeshStandardMaterial
              material.emissive = new THREE.Color(0x000000)
              material.emissiveIntensity = 0
            }
          })
        }
      }
      
      const handleDragEnd = () => {
        setIsDraggingTicket(false)
        setHoveredCellDuringDrag(null)
        setCandidateCenterCell(null)
        
        // Сбрасываем все hover эффекты
        hoverTargetsRef.current.forEach((mesh) => {
          if (mesh instanceof THREE.Mesh) {
            const material = mesh.material as THREE.MeshStandardMaterial
            material.emissive = new THREE.Color(0x000000)
            material.emissiveIntensity = 0
          }
        })
      }
      
      const handleDrop = (e: DragEvent) => {
        console.log('🎯 DropHandler: handleDrop called')
        // Простое логирование - основная логика в div wrapper
      }
      
      // Регистрируем события на canvas элементе
      const canvas = gl.domElement
      
      canvas.addEventListener('dragenter', handleDragEnter)
      canvas.addEventListener('dragover', handleDragOver)
      canvas.addEventListener('dragleave', handleDragLeave)
      canvas.addEventListener('drop', handleDrop)
      canvas.addEventListener('dragend', handleDragEnd)
      
      // Удален дублирующий обработчик ticket-dragstart - используется основной обработчик выше
      
      return () => {
        canvas.removeEventListener('dragenter', handleDragEnter)
        canvas.removeEventListener('dragover', handleDragOver)
        canvas.removeEventListener('dragleave', handleDragLeave)
        canvas.removeEventListener('drop', handleDrop)
        canvas.removeEventListener('dragend', handleDragEnd)
        // Удален дублирующий обработчик ticket-dragstart
      }
    }, [camera, gl])
    
    return null
  }

  // Глобальные обработчики drag&drop для типов тикетов
  useEffect(() => {
    // Добавляем глобальный слушатель для отладки
    const debugDropHandler = (e: DragEvent) => {
      const ticketType = e.dataTransfer?.getData('text/plain')
      if (ticketType && ['story', 'task', 'bug', 'test'].includes(ticketType)) {
        console.log('🎯 DEBUG: Global drop event detected!', {
          ticketType,
          target: e.target,
          currentTarget: e.currentTarget,
          type: e.type
        })
      }
    }

    const debugDragStartHandler = (e: DragEvent) => {
      const ticketType = e.dataTransfer?.getData('text/plain')
      if (ticketType && ['story', 'task', 'bug', 'test'].includes(ticketType)) {
        console.log('🎯 DEBUG: Global dragstart event detected!', {
          ticketType,
          target: e.target,
          currentTarget: e.currentTarget,
          type: e.type
        })
      }
    }

    // Добавляем слушатели на разные уровни
    document.addEventListener('drop', debugDropHandler, true)
    window.addEventListener('drop', debugDropHandler, true)
    document.addEventListener('dragstart', debugDragStartHandler, true)
    window.addEventListener('dragstart', debugDragStartHandler, true)
    
    return () => {
      document.removeEventListener('drop', debugDropHandler, true)
      window.removeEventListener('drop', debugDropHandler, true)
      document.removeEventListener('dragstart', debugDragStartHandler, true)
      window.removeEventListener('dragstart', debugDragStartHandler, true)
    }
  }, [])

  // Исправленная функция computeHexUnder с правильным округлением координат
  const computeHexUnder = useCallback((clientX: number, clientY: number) => {
    console.log('🔍 computeHexUnder called', { clientX, clientY, isDragging: isDraggingTicket, isDraggingRef: isDraggingRef.current })
    
    // Проверяем состояние dragging - используем ref для актуального значения
    if (!isDraggingRef.current) {
      console.log('❌ Skipping hex calculation - not dragging (isDraggingTicket:', isDraggingTicket, ', isDraggingRef:', isDraggingRef.current, ')')
      return
    }
    
    // Получаем canvas элемент правильным способом
    const canvas = document.querySelector('canvas')
    if (!canvas) {
      console.log('❌ Canvas not found')
      return
    }
    
    const rect = canvas.getBoundingClientRect()
    
    // Нормализуем координаты мыши для Three.js
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1
    
    console.log('📍 Mouse normalized coords:', { nx, ny })
    
    // Используем raycaster для определения позиции в мире
    const raycaster = new THREE.Raycaster()
    const camera = cameraRef.current
    if (!camera) {
      console.log('❌ Camera not found')
      return
    }
    raycaster.setFromCamera({ x: nx, y: ny } as any, camera)
    
    // Создаем плоскость на уровне Y=0 для пересечения с лучом
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersectionPoint = new THREE.Vector3()
    
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      // Конвертируем world позицию в hex координаты (упрощенная версия)
      const hexSize = 1
      const hexQ = Math.round((2/3 * intersectionPoint.x) / hexSize)
      const hexR = Math.round((-1/3 * intersectionPoint.x + Math.sqrt(3)/3 * intersectionPoint.z) / hexSize)
      
      console.log('🎯 Hex under cursor:', { q: hexQ, r: hexR })
      
      // Сохраняем координаты в window для использования другими обработчиками
      ;(window as any).__hoveredCell = [hexQ, hexR]
    }
  }, [isDraggingRef, isDraggingTicket])

  // Глобальные слушатели mousemove - всегда активны, но обрабатывают только при isDraggingTicket
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      console.log('🖱️ mousemove event:', { x: e.clientX, y: e.clientY, isDragging: isDraggingTicket, isDraggingRef: isDraggingRef.current })
      computeHexUnder(e.clientX, e.clientY)
    }
    const onPointerMove = (e: PointerEvent) => {
      console.log('👆 pointermove event:', { x: e.clientX, y: e.clientY, isDragging: isDraggingTicket, isDraggingRef: isDraggingRef.current })
      computeHexUnder(e.clientX, e.clientY)
    }
    
    // Подключаем слушатели сразу при монтировании компонента
    window.addEventListener('mousemove', onMouseMove, true)
    window.addEventListener('pointermove', onPointerMove, true)
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove, true)
      window.removeEventListener('pointermove', onPointerMove, true)
    }
  }, [computeHexUnder]) // Пересоздаем при изменении computeHexUnder

  // Убираем сложный globalDropHandler - используем существующую систему raycasting

  // Load active sprint state when sidebar opens (must be before any early returns)
  useEffect(() => {
    if (!isSprintOpen) return
    ;(async () => {
      try {
        const { sprintService } = await import('../lib/supabase')
        const active = sprintObjectId
          ? await sprintService.getActiveSprintForObject(projectId, sprintObjectId)
          : await sprintService.getActiveSprint(projectId)
        setIsSprintStarted(Boolean(active))
        setActiveSprintId(active?.id || null)
        setSprintStartedAt(active?.started_at ? new Date(active.started_at) : null)
        if (active && typeof active.weeks === 'number' && active.weeks > 0) {
          setSprintWeeks(active.weeks)
        }
      } catch (error) {
        console.error('Failed to load active sprint', error)
        setIsSprintStarted(false)
        setActiveSprintId(null)
        setSprintStartedAt(null)
      }
    })()
  }, [isSprintOpen, projectId, sprintObjectId])

  // Load sprint tickets for active sprint (used to render placeholders persistently)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isSprintStarted || !activeSprintId) { setSprintTickets([]); return }
      try {
        const { supabase } = await import('../lib/supabase')
        const { data } = await supabase
          .from('object_tickets')
          .select('id,title,priority,assignee_id,zone_object_id,sprint_id')
          .eq('sprint_id', activeSprintId)
          .neq('board_column', 'archived')
        if (!cancelled) setSprintTickets(Array.isArray(data) ? data as any : [])
      } catch {}
    })()
    const onMoved = (e: any) => {
      try {
        const { ticketId, to } = (e && e.detail) || {}
        if (!ticketId) return
        setSprintTickets((prev) => {
          if (!Array.isArray(prev) || prev.length === 0) return prev
          const idx = prev.findIndex((t: any) => t && t.id === ticketId)
          if (idx < 0) return prev
          const copy = prev.slice()
          copy[idx] = { ...copy[idx], zone_object_id: to }
          return copy
        })
      } catch {}
    }
    const onCompleted = () => { try { setSprintTickets([]) } catch {} }
    window.addEventListener('ticket-moved' as any, onMoved as any)
    window.addEventListener('sprint-completed' as any, onCompleted as any)
    return () => {
      cancelled = true
      window.removeEventListener('ticket-moved' as any, onMoved as any)
      window.removeEventListener('sprint-completed' as any, onCompleted as any)
    }
  }, [isSprintStarted, activeSprintId])

  // Keep planned count snapshot in localStorage for persistence across reloads during active sprint
  useEffect(() => {
    try {
      if (isSprintStarted && activeSprintId) {
        const key = `sprint_planned_${activeSprintId}`
        const raw = localStorage.getItem(key)
        if (raw && !plannedCountAtStart) {
          const num = parseInt(raw, 10)
          if (!Number.isNaN(num)) setPlannedCountAtStart(num)
        }
      } else {
        // reset when no active sprint
        setPlannedCountAtStart(null)
      }
    } catch {}
  }, [isSprintStarted, activeSprintId])

  // Fallback: if tickets are loaded and snapshot not set yet, take current length as snapshot
  useEffect(() => {
    if (!isSprintStarted || !activeSprintId) return
    if (plannedCountAtStart == null) {
      const total = Array.isArray(sprintTickets) ? sprintTickets.length : 0
      setPlannedCountAtStart(total)
      try { localStorage.setItem(`sprint_planned_${activeSprintId}`, String(total)) } catch {}
    }
  }, [isSprintStarted, activeSprintId, sprintTickets, plannedCountAtStart])

  // Показываем индикатор загрузки
  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: 0,
        left: 0,
        background: 'radial-gradient(1000px 700px at 50% 40%, #FFFFFF 0%, #FFFFFF 20%, #EBECF7 70%, #EBECF7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      } as any}>
        {/* Hexagon Loading Animation */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="100" height="100" viewBox="-0.1 -0.1 1.2 1.2" style={{ marginBottom: '24px' }}>
            <path 
              className="hexagon-loading hexagon-background" 
              d="M0.4625 0.01165063509
                 a0.075 0.075 0 0 1 0.075 0
                 l0.3666729559 0.2116987298
                 a0.075 0.075 0 0 1 0.0375 0.06495190528
                 l0 0.4233974596
                 a0.075 0.075 0 0 1 -0.0375 0.06495190528
                 l-0.3666729559 0.2116987298
                 a0.075 0.075 0 0 1 -0.075 0
                 l-0.3666729559 -0.2116987298
                 a0.075 0.075 0 0 1 -0.0375 -0.06495190528
                 l0 -0.4233974596
                 a0.075 0.075 0 0 1 0.0375 -0.06495190528 Z" 
            />
            <path 
              className="hexagon-loading hexagon-trace" 
              d="M0.4625 0.01165063509
                 a0.075 0.075 0 0 1 0.075 0
                 l0.3666729559 0.2116987298
                 a0.075 0.075 0 0 1 0.0375 0.06495190528
                 l0 0.4233974596
                 a0.075 0.075 0 0 1 -0.0375 0.06495190528
                 l-0.3666729559 0.2116987298
                 a0.075 0.075 0 0 1 -0.075 0
                 l-0.3666729559 -0.2116987298
                 a0.075 0.075 0 0 1 -0.0375 -0.06495190528
                 l0 -0.4233974596
                 a0.075 0.075 0 0 1 0.0375 -0.06495190528 Z" 
            />
          </svg>
          
          <div style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Loading project data...
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#6B7280',
            opacity: 0.8
          }}>
            Preparing your workspace
          </div>
        </div>
      </div>
    )
  }

  // Показываем ошибку
  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: 0,
        left: 0,
        background: 'radial-gradient(1000px 700px at 50% 40%, #FFFFFF 0%, #FFFFFF 20%, #EBECF7 70%, #EBECF7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FF6B6B',
        fontSize: '18px',
        textAlign: 'center'
      } as any}>
        <GlassPanel style={{
          padding: '40px',
          textAlign: 'center'
        }}>
          Loading error: {error}
          <br />
          <button 
            onClick={reloadData}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: '#4ECDC4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </GlassPanel>
      </div>
    )
  }

  


  return (
    <>
      {/* 3D Canvas с гексагональной сеткой */}
      <div 
        className={`canvas-container ${isDraggingTicket ? 'is-dragging' : ''}`}
        onDrop={(e) => {
          console.log('🎯 SIMPLE DROP on canvas container!')
          e.preventDefault()
          e.stopPropagation()

          const existingTicketPayload = e.dataTransfer?.getData('application/x-existing-ticket')
          if (existingTicketPayload) {
            console.log('🎯 Existing ticket drop detected:', existingTicketPayload)
            try {
              const parsed = JSON.parse(existingTicketPayload)
              const ticketId = parsed?.ticketId as string | undefined
              const fromZoneObjectIdRaw = parsed?.fromZoneObjectId
              const fromZoneObjectId = typeof fromZoneObjectIdRaw === 'string'
                ? fromZoneObjectIdRaw
                : typeof fromZoneObjectIdRaw === 'number'
                  ? String(fromZoneObjectIdRaw)
                  : undefined

              if (!ticketId || !fromZoneObjectId) {
                console.warn('❌ Existing ticket payload incomplete, skipping modal open')
                return
              }

              const dropTarget = calculateDropTarget(e.clientX, e.clientY)
              if (!dropTarget) {
                console.log('❌ Existing ticket drop target invalid, skipping modal')
                return
              }

              const targetZoneObject = dropTarget.zoneObject
              if (isSprintZoneObject(targetZoneObject)) {
                ensureSprintContext(targetZoneObject)
                const existing = rocketCopiesRef.current.find((copy) => copy.ticketId === ticketId)
                const nextStatus: RocketTicketGhostStatus = existing
                  ? (existing.status === 'planned' ? 'done' : existing.status)
                  : 'planned'
                console.log('🚀 Updating rocket copy via fallback drop handler', { ticketId, nextStatus })
                upsertRocketCopy(ticketId, nextStatus, fromZoneObjectId)
                return
              }

              if (dropTarget.zoneObject.id === fromZoneObjectId) {
                console.log('⚠️ Existing ticket dropped onto the same zone object, no move needed')
                return
              }

              console.log('🔄 Moving existing ticket via fallback drop handler', {
                ticketId,
                fromZoneObjectId,
                toZoneObjectId: dropTarget.zoneObject.id
              })
              moveTicket(ticketId, fromZoneObjectId, dropTarget.zoneObject.id)?.catch((err) => {
                console.error('❌ Failed to move ticket via fallback drop handler:', err)
              })
            } catch (error) {
              console.error('❌ Failed to parse existing ticket payload, skipping modal:', error)
            }
            return
          }

          const ticketType = e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('application/x-ticket-type')
          console.log('🎯 Simple drop ticketType:', ticketType)

          if (ticketType && ['story', 'task', 'bug', 'test'].includes(ticketType)) {
            console.log('🎯 SIMPLE: Opening modal for ticket type:', ticketType)
            
            // Локальная функция для вычисления места дропа
            const cell = findCellUnderCursor(e.clientX, e.clientY)
            if (!cell) {
              console.log('❌ No cell found under cursor')
              return
            }
            
            const zone = getZoneForCell(cell.q, cell.r)
            const isCenter = isZoneCenter(cell.q, cell.r)
            
            if (!zone || !isCenter) {
              console.log('❌ Drop not on zone center - modal will NOT open')
              return
            }
            
            const zoneObject = getZoneObjectForCell(cell.q, cell.r)
            if (!zoneObject) {
              console.log('❌ No zone object found for center cell')
              return
            }
            
            console.log('🎯 SIMPLE: Valid drop target found:', [cell.q, cell.r])
            setModalConfig({
              isOpen: true,
              ticketType: ticketType,
              cell: [cell.q, cell.r]
            })
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDragEnter={(e) => {
          console.log('🎯 onDragEnter triggered on canvas container')
          e.preventDefault()
        }}
        onDragLeave={(e) => {
          console.log('🎯 onDragLeave triggered on canvas container')
        }}
        style={{ 
          width: '100vw', 
          height: '100vh', 
          position: 'absolute',
          top: 0,
          left: 0,
          background: 'radial-gradient(1000px 700px at 50% 40%, #FFFFFF 0%, #FFFFFF 20%, #EBECF7 70%, #EBECF7 100%)'
        } as any}
      >
        <Canvas
            ref={canvasRef}
            shadows={{ type: THREE.PCFSoftShadowMap }}
            camera={{ position: [0, 18, 18], fov: 45 }}
            style={{ 
              width: '100%',
              height: '100%',
              background: 'transparent'
            } as any}
            // REFACTORED: Removed conflicting onDrop handler - now using unified drop handler in DropHandler component
            onDragOver={(e) => {
              e.preventDefault()
              // Просто устанавливаем эффект, никакой логики!
              const existingTicket = e.dataTransfer?.getData('application/x-existing-ticket')
              e.dataTransfer.dropEffect = existingTicket ? 'move' : 'copy'
            }}
            onDragEnter={(e) => {
              console.log('🎯 onDragEnter triggered on Canvas')
              e.preventDefault()
            }}
            onDragLeave={(e) => {
              console.log('🎯 onDragLeave triggered on Canvas')
            }}
          onPointerDown={(e) => { if (isTicketModalOpen || isSidebarHover) { e.stopPropagation(); e.preventDefault() } }}
          onWheel={(e) => { if (isTicketModalOpen || isSidebarHover) { e.stopPropagation(); e.preventDefault() } }}
          onPointerMove={(e) => { if (isTicketModalOpen || isSidebarHover) { e.stopPropagation(); e.preventDefault() } }}
          onPointerEnter={() => {
            // Устанавливаем курсор по умолчанию при входе в canvas
            const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
            if (canvas) canvas.style.cursor = 'default'
          }}
          onContextMenu={(event) => {
            // Предотвращаем контекстное меню браузера
            event.preventDefault()
          }}
          gl={{
            powerPreference: "high-performance",
            antialias: true,
            stencil: false,
            depth: true,
            // Отключаем логарифмический depth-buffer во избежание артефактов мерцания на Mac
            logarithmicDepthBuffer: false,
            precision: 'highp',
            // Добавляем настройки для предотвращения конфликтов контекста
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false,
            alpha: true // Включаем прозрачность для показа CSS фона
          }}
          onCreated={({ gl, scene, camera }) => {
            console.log('🎨 Canvas created successfully')
            if (isTicketModalOpen) {
              gl.domElement.style.pointerEvents = 'none'
            } else {
              gl.domElement.style.pointerEvents = 'auto'
            }
            
            // Улучшенная обработка потери WebGL контекста
            const handleContextLost = (event: Event) => {
              console.warn('⚠️ WebGL context lost - attempting to prevent default')
              event.preventDefault()
              // Попытка восстановить контекст
              setTimeout(() => {
                try {
                  const newContext = gl.domElement.getContext('webgl2') || gl.domElement.getContext('webgl')
                  if (newContext) {
                    console.log('✅ WebGL context recovered')
                    // Force re-render
                    gl.render(scene, camera)
                  } else {
                    console.error('❌ Failed to recover WebGL context')
                    // Reload the page as last resort
                    window.location.reload()
                  }
                } catch (error) {
                  console.error('❌ Error during context recovery:', error)
                  window.location.reload()
                }
              }, 100)
            }
            
            const handleContextRestored = () => {
              console.log('✅ WebGL context restored')
              // Перезапускаем рендеринг
              try {
                gl.render(scene, camera)
              } catch (error) {
                console.error('❌ Error during context restoration:', error)
              }
            }
            
            gl.domElement.addEventListener('webglcontextlost', handleContextLost)
            gl.domElement.addEventListener('webglcontextrestored', handleContextRestored)
            
            // Очистка слушателей при размонтировании
            return () => {
              gl.domElement.removeEventListener('webglcontextlost', handleContextLost)
              gl.domElement.removeEventListener('webglcontextrestored', handleContextRestored)
            }
          }}
          onError={(error) => {
            console.error('❌ Canvas error:', error)
            // Показываем пользователю дружелюбное сообщение
            if (error instanceof Error && error.message?.includes('WebGL')) {
              console.warn('WebGL error detected - this might be a browser compatibility issue')
            }
          }}
        >
          <TicketBeamEffects
            zoneObjects={zoneObjects}
            onBeamStart={handleBeamStart}
            onBeamImpact={handleBeamImpact}
            onBeamFinish={handleBeamFinish}
          />
          {/* Zone names теперь рендерятся в UnifiedHexCell */}
          <CameraBridge onReady={(cam) => { cameraRef.current = cam }} />
          
          
          {/* Wind System Provider */}
          <WindProvider>
            {/* === ПРОФЕССИОНАЛЬНАЯ НАСТРОЙКА ОСВЕЩЕНИЯ === */}

{/* 1. Мягкий окружающий свет - предотвращает абсолютно черные тени */}
<ambientLight intensity={0.8} />

{/* 2. Атмосферный свет (небо/земля) - добавляет цвет и реализм */}
<hemisphereLight 
  color={'#a8d8ff'}      // Более насыщенный цвет неба
  groundColor={'#b5a99a'}  // Более теплый цвет земли
  intensity={1.6} 
/>

{/* 3. Основной свет (Солнце) - отбрасывает четкие тени */}
<directionalLight
  castShadow // <-- ГЛАВНЫЙ ИСТОЧНИК ТЕНЕЙ
  position={[15, 30, 10]} // <-- Новое положение: светит сверху-слева, создавая длинные тени вправо
  intensity={2.5} // <-- Интенсивность снижена, так как есть другие источники
  color={'#FFDEB5'} // <-- Теплый, солнечный цвет
  shadow-mapSize-width={4096} // <-- Увеличиваем качество карты теней
  shadow-mapSize-height={4096}
  shadow-camera-near={0.5}
  shadow-camera-far={100} // <-- Уменьшаем дальность, чтобы не рендерить лишнее
  // ВАЖНО: Уменьшаем область камеры, чтобы повысить четкость
  shadow-camera-left={-25}
  shadow-camera-right={25}
  shadow-camera-top={25}
  shadow-camera-bottom={-25}
  shadow-bias={-0.0005}
/>

{/* 4. Заполняющий свет (Отраженный от неба) - смягчает тени, добавляет объем */}
<directionalLight
  // НЕ отбрасывает тени - для производительности
  position={[10, 20, -20]} // <-- Светит с противоположной стороны
  intensity={0.75} // <-- Низкая интенсивность
  color={'#cceaff'} // <-- Холодный, небесный цвет
/>

          {/* Небо и окружение - отключено для показа CSS фона */}
          {/* <Environment background={'only'} environmentIntensity={2}>
            <mesh scale={500}>
              <sphereGeometry args={[1, 64, 64]} />
              <meshBasicMaterial color="#EBECF7" side={THREE.BackSide} />
            </mesh>
          </Environment> */}

          {/* Вода отключена */}

        {/* Умная сетка для обычного режима */}
        {!isZoneMode && (
          <SmartHexGrid
            zones={zones.map(zone => {
              // ПРАВИЛЬНЫЙ ПОДХОД: Используем `getZoneCenter`, который знает о локальных изменениях
              const center = getZoneCenter(zone.id) || [0, 0] as [number, number]
              const zoneCellsForZone = effectiveZoneCells.filter(zc => zc.zone_id === zone.id)
              
              return {
                id: zone.id,
                name: zone.name,
                color: zone.color,
                center, // <-- Теперь это правильный, авторитетный центр
                cells: zoneCellsForZone.map(zc => [zc.q, zc.r] as [number, number])
              }
            })}
            zoneObjects={zoneObjects}
            ticketsByZoneObject={ticketsByZoneObject}
            notificationsByBuilding={notificationsByBuilding}
            isZoneMode={false}
            hoveredCell={hoveredCell}
            hoveredCellType={hoveredCellType}
            onCellClick={(q, r, mousePosition) => handleCellClick(q, r, false, mousePosition ? [mousePosition.x, mousePosition.y] : undefined)}
            onCellHover={handleCellHover}
            onCellLeave={handleCellLeave}
            showZoneNames={showZoneNames}
            isDraggingTicket={isDraggingTicket}
            candidateCenterCell={candidateCenterCell}
            hoveredCellDuringDrag={hoveredCellDuringDrag}
            registerHoverTarget={registerHoverTarget}
            unregisterHoverTarget={unregisterHoverTarget}
            activeSprintObjectId={sprintObjectId}
            activeSprintProgress={sprintObjectId ? activeSprintProgress : null}
            sprintProgressMap={sprintProgressByObject}
            energyPulseMap={energyPulseMap}
            badgeAnimationMap={badgeAnimations}
          />
        )}
          
          {/* Оригинальная сетка для интерактивности (временно включена для режима строительства) */}
          {isZoneMode && gridCells.map((cell) => {
            const [q, r] = cell.coordinates
            const [x, _y, z] = hexToWorldPosition(q, r)
            
            const zoneColor = getZoneColor(q, r)
            const isZoneCenterCell = isZoneCenter(q, r)
            const zoneObject = getZoneObjectForCellLocal(q, r)
            const objectIsSelected = Boolean(selectedZoneObject && zoneObject && selectedZoneObject.id === zoneObject.id)
            
            // Находим зону для этой ячейки (для building mode)
            const zone = zones.find(z => {
              const zoneCellsForZone = effectiveZoneCells.filter(zc => zc.zone_id === z.id)
              return zoneCellsForZone.some(zc => zc.q === q && zc.r === r)
            })
            
            // Находим здание для центральной ячейки зоны (для building mode)
            const building = isZoneCenterCell && zone ? zoneObjects.find(obj => obj.zone_id === zone.id) : null
            const isSprintBuilding = Boolean(building && typeof building.object_type === 'string' && ['sprint', 'mountain'].includes(building.object_type.toLowerCase()))
            const progressEntry = isSprintBuilding && building ? (sprintProgressByObject[building.id] ?? { total: 0, done: 0 }) : null
            const sprintProgressForCell = isSprintBuilding
              ? (building?.id === sprintObjectId && activeSprintProgress ? activeSprintProgress : progressEntry)
              : null
            
            // Вычисляем количество тикетов в зоне
            // Тикеты хранятся по ID здания (zoneObject), а не по ID зоны
            const zoneTicketCount = building ? (ticketsByZoneObject[building.id] || []).length : 0

            // Check notification data for this building
            const buildingNotifications = building ? notificationsByBuilding[building.id] ?? null : null
            const buildingTickets = building ? (ticketsByZoneObject[building.id] || []) : []
            const mentionNotificationCount = Array.isArray(buildingNotifications?.notifications)
              ? buildingNotifications.notifications.filter((notification) => notification.type === 'comment_mention').length
              : 0
            const mentionNotificationExists = mentionNotificationCount > 0
            const commentCountFromTickets = buildingTickets.reduce((count, ticket) => {
              if (!ticket) return count
              if (Array.isArray(ticket.comments)) {
                return count + ticket.comments.length
              }
              const fallbackFields = [
                (ticket as any).commentCount,
                (ticket as any).comment_count,
                (ticket as any).comments_count,
                (ticket as any).comment_counts
              ]
              const fallbackValue = fallbackFields.find((value) => typeof value === 'number' && Number.isFinite(value))
              return count + (fallbackValue ? Number(fallbackValue) : 0)
            }, 0)
            const commentCountFromNotifications = typeof buildingNotifications?.commentCount === 'number'
              ? buildingNotifications.commentCount
              : 0
            const totalCommentCount = (() => {
              if (commentCountFromTickets > 0) return commentCountFromTickets
              if (commentCountFromNotifications > 0) return commentCountFromNotifications
              return mentionNotificationCount
            })()
            const hasAnyComments = totalCommentCount > 0
            const hasUnreadMentions = building && buildingTickets.length > 0
              ? buildingHasUnreadMentions(building.id, buildingTickets)
              : false
            const hasMentions = Boolean(
              typeof buildingNotifications?.hasCommentMentions === 'boolean'
                ? buildingNotifications.hasCommentMentions
                : mentionNotificationExists
            ) || hasUnreadMentions || hasAnyComments
            const assignmentCount = buildingNotifications?.assignmentCount ??
              (Array.isArray(buildingNotifications?.notifications)
                ? buildingNotifications.notifications.filter((notification) => notification.type === 'assignment').length
                : 0)

            if (buildingNotifications) {
              console.log('[HexGridSystem] notifications for building', {
                buildingId: building.id,
                title: building.title,
                hasMentions,
                assignmentCount,
                unreadCount: buildingNotifications.unreadCount,
                commentCountFromNotifications
              })
            }

            if (building) {
              console.log('[HexGridSystem] building badge state', JSON.stringify({
                  buildingId: building.id,
                  buildingTitle: building.title,
                  zoneId: building.zone_id,
                  hasMentions,
                  assignmentCount,
                  commentCountFromTickets,
                  commentCountFromNotifications,
                  totalCommentCount,
                  buildingNotifications: buildingNotifications ?? null,
                  tickets: ticketsByZoneObject[building.id] || []
                }, null, 2))
            }
            
            // Debug mentions for zone centers
            if (isZoneCenterCell && building) {
              if (hasMentions) {
                console.log('💬 Building has unread mentions!', {
                  buildingId: building.id,
                  buildingTitle: building.title,
                  hasMentions,
                  ticketCount: (ticketsByZoneObject[building.id] || []).length,
                  notifications: buildingNotifications,
                  userEmail: user?.email,
                  userId: user?.id
                })
              }
              
              // Also log when no mentions but we have a building with tickets
              if (!hasMentions && (ticketsByZoneObject[building.id] || []).length > 0) {
                console.log('📭 Building has tickets but no unread mentions', {
                  buildingId: building.id,
                  buildingTitle: building.title,
                  ticketCount: (ticketsByZoneObject[building.id] || []).length,
                  userEmail: user?.email
                })
              }
            }
            
            // Отладка: проверяем данные тикетов
            if (isZoneCenterCell && zone) {
              console.log('🔍 Zone ticket debug:', {
                zoneId: zone.id,
                zoneName: zone.name,
                buildingId: building?.id,
                buildingTitle: building?.title,
                ticketsByZone: ticketsByZoneObject[zone.id] || [],
                ticketsByBuilding: building ? (ticketsByZoneObject[building.id] || []) : [],
                zoneTicketCount,
                hasMentions,
                allTicketKeys: Object.keys(ticketsByZoneObject)
              })
            }
            
            // Animation disabled
            
            // Определяем состояние ячейки для UnifiedHexCell
            const cellState: HexCellState = (() => {
              if (objectIsSelected) return 'selected'
              if (zoneColor) return 'zone'
              if (hoveredCell && hoveredCell[0] === q && hoveredCell[1] === r) return 'hover'
              if (cell.buildingType) return 'occupied'
              return 'empty'
            })()

            const showPlusIcon = Boolean(isZoneMode && 
              hoveredCell && 
              hoveredCell[0] === q && 
              hoveredCell[1] === r && 
              hoveredCellType === 'empty')

            // Определяем, показывать ли камень на этой ячейке
            const shouldShowStone = Boolean(
              zoneColor && // Ячейка принадлежит зоне
              !isZoneCenterCell && // Не центральная ячейка зоны
              !building && // Нет здания на ячейке
              (cellState === 'zone' || cellState === 'hover') // Ячейка в состоянии зоны или ховера
            )
            
            // Генерируем seed для камня на основе координат и зоны
            const stoneSeed = shouldShowStone ? 
              Math.abs((q * 2654435761) ^ (r * 1597334677) ^ (zone?.id?.charCodeAt(0) || 0)) : 0

            // Дополнительная логика: показываем камень с вероятностью 30% для ячеек зоны
            // Это обеспечивает естественное распределение камней
            const stoneProbability = shouldShowStone ? (stoneSeed % 100) / 100 : 0
            
            // Гарантируем минимум один камень в зоне: выбираем ячейку с наименьшим seed
            let finalShouldShowStone = shouldShowStone && stoneProbability < 0.3
            let stoneCount = 1
            
            // Логика для деревьев (аналогично камням, но с другими параметрами)
            const shouldShowTrees = Boolean(
              zoneColor && // Ячейка принадлежит зоне
              !isZoneCenterCell && // Не центральная ячейка зоны
              !building && // Нет здания на ячейке
              (cellState === 'zone' || cellState === 'hover') // Ячейка в состоянии зоны или ховера
            )
            
            const treeSeed = shouldShowTrees ? 
              Math.abs((q * 2654435761) ^ (r * 1597334677) ^ (zone?.id?.charCodeAt(0) || 0)) + 10000 : 0
            
            const treeProbability = shouldShowTrees ? (treeSeed % 100) / 100 : 0
            let finalShouldShowTrees = shouldShowTrees && treeProbability < 0.25 // 25% вероятность для деревьев
            let treeCount = 1
            
            if (zone && shouldShowStone) {
              // Находим все ячейки зоны для определения минимального seed
              const zoneCellsForZone = effectiveZoneCells.filter(zc => zc.zone_id === zone.id)
              const zoneCellSeeds = zoneCellsForZone.map(zc => 
                Math.abs((zc.q * 2654435761) ^ (zc.r * 1597334677) ^ (zone.id.charCodeAt(0) || 0))
              )
              const minSeed = Math.min(...zoneCellSeeds)
              const currentCellSeed = Math.abs((q * 2654435761) ^ (r * 1597334677) ^ (zone.id.charCodeAt(0) || 0))
              
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
              const zoneCellsForZone = effectiveZoneCells.filter(zc => zc.zone_id === zone.id)
              const zoneCellSeeds = zoneCellsForZone.map(zc => 
                Math.abs((zc.q * 2654435761) ^ (zc.r * 1597334677) ^ (zone.id.charCodeAt(0) || 0)) + 10000
              )
              const minSeed = Math.min(...zoneCellSeeds)
              const currentCellSeed = Math.abs((q * 2654435761) ^ (r * 1597334677) ^ (zone.id.charCodeAt(0) || 0)) + 10000
              
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

            // Отладка для камней и деревьев
            if (finalShouldShowStone) {
              console.log(`🪨 ${stoneCount} камней размещены на ячейке [${q}, ${r}] в зоне "${zone?.name}" (${zoneColor})`)
            }
            if (finalShouldShowTrees) {
              console.log(`🌳 ${treeCount} деревьев размещены на ячейке [${q}, ${r}] в зоне "${zone?.name}" (${zoneColor})`)
            }

            const buildingId = building?.id ?? null
            const pulse = buildingId ? energyPulseMap[buildingId] : undefined
            const badgeAnim = buildingId ? badgeAnimations[buildingId] : undefined

            return (
              <>
              <UnifiedHexCell
                key={`${q},${r}-${zoneColor ? 'zone' : 'empty'}`}
                q={q}
                r={r}
                state={cellState}
                color={cell.buildingType ? '#6B7280' : undefined}
                zoneColor={zoneColor || undefined}
                isZoneCenter={Boolean(isZoneCenterCell)}
                cellType={cell.type}
                onClick={(q, r, mousePosition) => handleCellClick(q, r, false, mousePosition ? [mousePosition.x, mousePosition.y] : undefined)}
                onPointerEnter={(q, r) => handleCellHover(q, r)}
                onPointerLeave={(q, r) => handleCellLeave(q, r)}
                showPlusIcon={showPlusIcon}
                hexSize={2.0}
                zoneObject={building ? {
                  ...building,
                  type: building.object_type as any
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
                isDragTarget={(() => {
                  const isHovered = hoveredCell && 
                    hoveredCell[0] === q && 
                    hoveredCell[1] === r
                  return Boolean(isDraggingTicket && isHovered)
                })()}
                isDragValid={(() => {
                  const isHovered = hoveredCell && 
                    hoveredCell[0] === q && 
                    hoveredCell[1] === r
                  const isCenter = isZoneCenterCell
                  return Boolean(isDraggingTicket && isHovered && isCenter)
                })()}
                registerHoverTarget={registerHoverTarget}
                unregisterHoverTarget={unregisterHoverTarget}
                sprintProgress={sprintProgressForCell || undefined}
                energyPulse={pulse ? pulse.type : null}
                energyPulseKey={pulse?.key}
                energyPulseColor={pulse?.color ?? null}
                ticketBadgeAnimation={badgeAnim?.type ?? null}
                ticketBadgeAnimationKey={badgeAnim?.key}
              />
              {isDraggingTicket && dragTicketId && isZoneCenterCell && candidateCenterCell && candidateCenterCell[0] === q && candidateCenterCell[1] === r && (() => {
                const foundObject = getZoneObjectForCellLocal(q, r)
                const isSprintTarget = Boolean(foundObject && sprintObjectId && foundObject.id === sprintObjectId)
                const isPlanned = plannedTickets.has(dragTicketId)
                if (isSprintTarget && isSprintStarted && !isPlanned) {
                  return (
                    <Html position={[x, 2.6, z]} center zIndexRange={[10, 0]}>
                      <span style={{
                        padding: '6px 10px',
                        background: '#DC2626',
                        color: '#FFFFFF',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.22)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: 0.2,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        pointerEvents: 'none'
                      }}>
                        Not planned for Sprint
                      </span>
                    </Html>
                  )
                }
                if (isSprintTarget && isSprintStarted && isPlanned) {
                  return (
                    <Html position={[x, 2.6, z]} center zIndexRange={[10, 0]}>
                      <span style={{
                        padding: '6px 10px',
                        background: '#10B981',
                        color: '#FFFFFF',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.22)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: 0.2,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        pointerEvents: 'none'
                      }}>
                        Drop to mark Done
                      </span>
                    </Html>
                  )
                }
                return null
              })()}
              
              </>
            )
          })}

          {/* Story tents: render only on non-center cells to avoid overlap with zone centers */}
          {(zoneObjects || []).filter((obj) => obj.object_type === 'story' && !isZoneCenter(obj.q, obj.r)).map((obj, idx) => {
            const [x, , z] = hexToWorldPosition(obj.q, obj.r)
            
            const seed = Math.abs((obj.q * 2654435761) ^ (obj.r * 1597334677))
            const rnd = (n: number) => {
              const v = (Math.sin(seed + n) * 43758.5453123) % 1
              return v < 0 ? -v : v
            }
            const models = [
              '/models/Tree_1.glb','/models/Tree_2.glb','/models/Tree_3.glb',
              '/models/Tree_4.glb','/models/Tree_5.glb','/models/Tree_6.glb','/models/Tree_7.glb'
            ]
            const pick = (n: number) => models[Math.abs(Math.floor(rnd(n) * models.length)) % models.length]
            const count = 2 + Math.floor(rnd(1) * 2) // 2–3 деревьев
            const items = Array.from({ length: count })
            return (
              <group key={`story-center-${obj.q},${obj.r}-${idx}`}>
                {/* Палатка (cache-busted to ensure latest from public/models) */}
                {/* Деревья вокруг палатки */}
                {items.map((_, i) => {
                  const angle = rnd(10 + i) * Math.PI * 2
                  const radius = 0.6 + rnd(20 + i) * 0.5
                  const tx = x + Math.cos(angle) * radius
                  const tz = z + Math.sin(angle) * radius
                  const rotY = rnd(30 + i) * Math.PI * 2
                  const scale = 0.8 + rnd(40 + i) * 0.5
                  return (
                    <Vegetation key={i} modelPath={pick(50 + i)} position={[tx, 0, tz]} rotationY={rotY} scale={scale} seed={seed + i} fitDiameter={0.5} />
                  )
                })}
              </group>
            )
          })}





          {/* Zone center buildings are now rendered through ZoneObjectComponent in UnifiedHexCell */}

          {/* Connected Road System */}
          <ConnectedRoadSystem />

          {/* Dust bursts */}
          {dustBursts.map(({ id, pos }) => (
            <DustBurst key={id}
              position={pos}
              duration={1.0}
              count={36}
              color={'#a78355'}
              onComplete={() => setDustBursts(prev => prev.filter(p => p.id !== id))}
            />
          ))}

          {/* RTS камера */}
          <RTSCamera
            fov={45}
            minHeight={6}
            maxHeight={80}
            minDistance={4}
            maxDistance={100}
            moveSpeed={0.25}
            zoomSpeed={0.1}
            rotationSpeed={0.03}
            edgeZoneSize={50}
            targetPosition={[0, 0, 0]}
            disabled={isTicketModalOpen || isSidebarHover || (isZoneMode && zoneSelectionMode !== 'idle')}
            isModalOpen={modalConfig.isOpen}
          />
          
          {/* Тестовая машинка в центре проекта */}
          <RobotCar 
            position={robotCarPosition} 
            color="#ffffff"
            isMoving={Boolean(robotCarTarget)}
            isBlinking={true}
            scale={0.8}
            targetPosition={robotCarTarget ? (() => {
              const [targetQ, targetR] = robotCarTarget
              const [targetX, , targetZ] = hexToWorldPosition(targetQ, targetR)
              const targetPos = [targetX, 0.4, targetZ] as [number, number, number]
              console.log(`🚗 RobotCar targetPosition:`, targetPos)
              return targetPos
            })() : undefined}
          />
          
          {/* DropHandler для обработки drop событий с доступом к Three.js */}
          <DropHandler />
          
          </WindProvider>
        </Canvas>
        
        {/* Performance Monitor removed */}
      </div>


      {/* Zone Color Picker */}
      <ZoneColorPicker
        isOpen={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        currentColor={colorPickerColor}
        onColorChange={(color) => {
          console.log('🎨 Color picker onColorChange called:', { color, colorPickerZoneId })
          setColorPickerColor(color)
          if (colorPickerZoneId) {
            console.log('🎨 Calling saveZoneColor with:', { colorPickerZoneId, color })
            saveZoneColor(colorPickerZoneId, color)
          } else {
            console.error('❌ colorPickerZoneId is null/undefined, cannot save color')
          }
        }}
        position={colorPickerPosition}
      />

      {/* UI панель */}
      {/* ZoneSelectionTool теперь позиционируется самостоятельно */}
      <ZoneSelectionTool
          isZoneMode={Boolean(isZoneMode)}
          onZoneModeToggle={handleZoneModeToggle}
          onZoneCreate={handleZoneCreate}
          zones={effectiveZones.map(zone => ({
            id: zone.id,
            name: zone.name,
            color: zone.color,
            cells: [], // TODO: получить ячейки зоны
            createdAt: new Date(zone.created_at)
          }))}
          selectedCells={selectedCells}
          onCellSelect={(q, r) => {
            const cellKey = `${q},${r}`
            setSelectedCells(prev => {
              const newSet = new Set(prev)
              if (newSet.has(cellKey)) {
                newSet.delete(cellKey)
              } else {
                newSet.add(cellKey)
              }
              return newSet
            })
          }}
          onSelectionClear={handleSelectionClear}
          showZoneForm={false}
          pendingZoneCells={[]}
          onCreateZoneFromForm={handleCreateZoneFromForm}
          onCancelZoneCreation={handleCancelZoneCreation}
          isFlagMode={isFlagMode}
          flagCells={flagCells}
          currentZonePath={currentZonePath}
          // Показываем панель редактирования только в режиме редактирования
          showTopPanel={Boolean(isZoneEditMode)}
          zoneName={editingZoneName}
          selectedZoneColor={editingZoneColor}
          onZoneNameChange={setEditingZoneName}
          onZoneColorChange={setEditingZoneColor}
          onCreateZoneFromTopPanel={handleSaveZoneEdit}
          onClearZoneSelection={handleCancelZoneEdit}
          isExtendingZone={extendingZoneId !== null}
          zoneSelectionMode={zoneSelectionMode}
          lastExtendingClick={lastExtendingClick}
          // Новые пропсы для редактирования зон
          isZoneEditMode={Boolean(isZoneEditMode)}
          editingZoneName={editingZoneName}
          editingZoneColor={editingZoneColor}
          onSaveZoneEdit={handleSaveZoneEdit}
          onCancelZoneEdit={handleCancelZoneEdit}
          onZoneNameEditChange={setEditingZoneName}
          onZoneColorEditChange={setEditingZoneColor}
          onDeleteZone={handleDeleteZone}
        />

        {/* Удалено: панель выбора зданий */}

      {/* Детальная панель объекта */}
      <ObjectDetailsPanel
        isOpen={isDetailsPanelOpen}
        onClose={() => {
          setIsDetailsPanelOpen(false)
          setSelectedTask(null)
        }}
        task={selectedTask}
        onSave={handleTaskSave}
      />

      {/* Модалка создания нового тикета */}
      {modalConfig.isOpen && (
        <ZoneObjectCreator
          isOpen={true}
          onClose={() => setModalConfig({ isOpen: false, ticketType: null, cell: null })}
          onSave={handleZoneObjectCreate}
          cellPosition={modalConfig.cell}
          defaultType={modalConfig.ticketType as any || 'story'}
          projectId={projectId}
        />
      )}


      {/* Панель деталей объекта зоны */}
      <ZoneObjectDetailsPanel
        side="right"
        isOpen={isZoneObjectDetailsOpen}
        onClose={() => {
          setIsZoneObjectDetailsOpen(false)
          setSelectedZoneObject(null)
        }}
        zoneObject={selectedZoneObject as any}
        projectId={projectId}
        zoneColor={selectedZoneObject ? getZoneColor(selectedZoneObject.cellPosition[0], selectedZoneObject.cellPosition[1]) || undefined : undefined}
        onSave={handleTaskSave}
        isDragging={isDraggingTicket}
        zoneTickets={(() => {
          console.log('🔍 ZoneObjectDetailsPanel tickets debug:')
          console.log('- selectedZoneObject:', selectedZoneObject)
          console.log('- selectedZoneObject.id:', selectedZoneObject?.id)
          console.log('- ticketsByZoneObject keys:', Object.keys(ticketsByZoneObject))
          console.log('- ticketsByZoneObject:', ticketsByZoneObject)
          
          if (selectedZoneObject) {
            const tickets = ticketsByZoneObject[selectedZoneObject.id] || []
            console.log('- tickets for selectedZoneObject.id:', tickets)
            console.log('- tickets length:', tickets.length)
            
            return tickets.map(t => {
              console.log('Mapping ticket for ZoneObjectDetailsPanel:', {
                id: t.id,
                title: t.title,
                sprint_id: (t as any).sprint_id,
                fullTicket: t
              })
              return {
                id: t.id,
                object_type: t.type,
                title: t.title,
                status: t.status,
                priority: t.priority,
                assignee_id: t.assignee_id || null,
                board_column: (t as any).board_column,
                sprint_id: (t as any).sprint_id
              }
            })
          }
          
          console.log('- No selectedZoneObject, returning empty array')
          return []
        })()}
        onOpenTicket={(ticketId, position) => {
          if (!selectedZoneObject) return
          const list = ticketsByZoneObject[selectedZoneObject.id] || []
          const t = list.find(x => x.id === ticketId)
          if (t) { 
            setSelectedTicket({ ...t, zone_object_id: (selectedZoneObject as any).id } as any)
            setSelectedTicketPosition(position || null)
            setIsTicketModalOpen(true) 
          }
        }}
        plannedTickets={globalPlannedTicketIds.size > 0 ? globalPlannedTicketIds : plannedTickets}
        sprintName={sprintName}
        sprintNames={activeSprintNames}
        sprintLabelByTicketId={plannedTicketNames}
        onSprintBadgeClick={(sprintId) => {
          console.log('HexGridSystem onSprintBadgeClick called with sprintId:', sprintId)
          
          // Найти sprint здание на карте (тип 'mountain')
          const sprintBuilding = zoneObjects.find(obj => obj.object_type === 'mountain')
          console.log('Found sprint building:', sprintBuilding)
          
          if (sprintBuilding) {
            // Переместить камеру к sprint зданию
            const [x, y, z] = hexToWorldPosition(sprintBuilding.q, sprintBuilding.r)
            console.log('Sprint building position:', { q: sprintBuilding.q, r: sprintBuilding.r, world: [x, y, z] })
            
            // Отправить событие для перемещения камеры
            window.dispatchEvent(new CustomEvent('camera-focus', {
              detail: {
                position: [x, y, z],
                zoom: 2.0 // Приблизить к зданию
              }
            }))
            console.log('Camera focus event dispatched to sprint building')
          } else {
            console.log('No sprint building found on map')
          }
        }}
      />

      {isSprintOpen && (
        <Sidebar
          isOpen={isSprintOpen}
          onClose={() => {
            setIsSprintOpen(false)
            setSprintObjectId(null)
            setSelectedZoneObject(null)
          }}
          side="left"
        >
          <SprintSidebar
            sprintName={sprintName}
            onSprintNameChange={handleSprintNameDraftChange}
            onSprintNameCommit={handleSprintNameCommit}
            durationWeeks={sprintWeeks}
            onDurationChange={handleSprintDurationChange}
            sprintStartedAt={sprintStartedAt}
            isSprintStarted={isSprintStarted}
            plannedTickets={plannedSprintTickets}
            doneTickets={doneSprintTickets}
            onClose={() => {
              setIsSprintOpen(false)
              setSprintObjectId(null)
              setSelectedZoneObject(null)
            }}
            onStart={handleSprintStart}
            onStop={handleSprintStop}
            startDisabled={sprintStartDisabled}
            stopDisabled={sprintStopDisabled}
            isActionLoading={isSprintActionLoading}
          />
        </Sidebar>
      )}

      {/* Радиальное меню для выбора объекта в центре зоны */}
      <RadialMenu
        isOpen={showRadialMenu}
        onClose={handleRadialMenuClose}
        onSelect={handleRadialMenuSelect}
        position={radialMenuPosition}
        worldPosition={radialMenuWorldPosition}
        mousePosition={radialMenuMousePosition}
      />

      {/* Подсказки управления камерой отключены */}

      {/* Bottom Tapbar */}
      <BottomTapbar 
        onSelect={(id) => console.log('create type:', id)} 
      />

      {/* Bottom-panel ghost overlay removed: we now use unified HTML5 drag image like Sidebar */}

      {/* Ticket details modal */}
      <TicketDetailsModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false)
          // Reload notifications after closing modal (comments may have been marked as read)
          setTimeout(() => reloadNotifications(), 300)
        }}
        projectId={projectId}
        ticket={selectedTicket}
        ticketPosition={selectedTicketPosition}
        onSave={(updates) => {
          if (!selectedTicket) return
          updateTicket(selectedTicket.id, selectedTicket.zone_object_id, updates as any)
          setSelectedTicket((prev: any) => prev ? { ...prev, ...updates } : prev)
        }}
        onSaveToDatabase={async (ticketId, updates) => {
          try {
            console.log('🔄 Saving to database via useProjectData:', { ticketId, updates })
            // Use hook helper so realtime broadcast + state stay in sync
            const zoneObjectId = selectedTicket?.zone_object_id || updates.zone_object_id || ''
            if (!zoneObjectId) {
              console.warn('⚠️ Missing zone_object_id for ticket save, falling back to direct service call')
              const { ticketService } = await import('../lib/supabase')
              const directResult = await ticketService.updateTicket(ticketId, updates)
              return !!directResult
            }
            const result = await updateTicket(ticketId, zoneObjectId, updates as any)
            return !!result
          } catch (error) {
            console.error('❌ Error saving ticket to database:', error)
            return false
          }
        }}
      />

      {/* Уведомления */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: notification.type === 'warning' ? '#fff3cd' : '#d1ecf1',
          color: notification.type === 'warning' ? '#856404' : '#0c5460',
          border: `1px solid ${notification.type === 'warning' ? '#ffeaa7' : '#bee5eb'}`,
          borderRadius: '8px',
          padding: '12px 20px',
          zIndex: 2000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          {notification.message}
        </div>
      )}

      {/* Drag Test Element removed */}

      {/* Debug Logger - moved to end for proper positioning */}
      {/* <DebugLogger /> */}

    </>
  )
} 
