import { useState, useEffect, useCallback } from 'react'
import { zoneService, zoneCellService, hexCellService, buildingService, zoneObjectService, ticketService, linkService, supabase } from '../lib/supabase'
import type { Zone, ZoneCell, HexCell, Building, ZoneObject, ZoneObjectTicket } from '../types/enhanced'

export const useProjectData = (projectId: string) => {
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneCells, setZoneCells] = useState<ZoneCell[]>([])
  const [hexCells, setHexCells] = useState<HexCell[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [zoneObjects, setZoneObjects] = useState<ZoneObject[]>([])
  const [ticketsByZoneObject, setTicketsByZoneObject] = useState<Record<string, ZoneObjectTicket[]>>({})
  const [links, setLinks] = useState<Array<{
    id: string
    from_object_id: string
    to_object_id: string
    link_type: 'primary' | 'secondary'
    created_at: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загрузка всех данных проекта
  const loadProjectData = useCallback(async () => {
    console.log('🚀 loadProjectData called with projectId:', projectId)
    
    if (!projectId) {
      console.log('❌ No projectId provided, returning early')
      return
    }

    // Guard against non-UUID ids (e.g., mock ids like '1','2','3')
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(projectId)
    console.log('🔍 ProjectId is UUID:', isUuid)
    
    if (!isUuid) {
      console.log('❌ Non-UUID projectId, clearing all data and returning')
      // Non-UUID ids are not supported anymore (no mock preview)
      setZones([])
      setZoneCells([])
      setHexCells([])
      setBuildings([])
      setZoneObjects([])
      setTicketsByZoneObject({})
      setLinks([])
      setLoading(false)
      return
    }

    console.log('=== LOADING PROJECT DATA ===')
    console.log('Project ID:', projectId)
    
    setLoading(true)
    setError(null)

    try {
      // Загружаем зоны
      console.log('Loading zones...')
      const zonesData = await zoneService.getZones(projectId)
      console.log('Zones loaded:', zonesData)
      setZones(zonesData)

      // Загружаем ячейки зон для всех зон
      const allZoneCells: ZoneCell[] = []
      console.log('Loading zone cells for', zonesData.length, 'zones...')
      for (const zone of zonesData) {
        try {
          const zoneCellsData = await zoneCellService.getZoneCells(zone.id)
          console.log(`Zone ${zone.name} cells:`, zoneCellsData)
          allZoneCells.push(...zoneCellsData)
        } catch (err) {
          console.error(`Error loading cells for zone ${zone.id}:`, err)
        }
      }
      console.log('Total zone cells loaded:', allZoneCells.length)
      setZoneCells(allZoneCells)

      // Загружаем ячейки
      console.log('Loading hex cells...')
      const hexCellsData = await hexCellService.getHexCells(projectId)
      console.log('Hex cells loaded:', hexCellsData.length)
      setHexCells(hexCellsData)

      // Загружаем здания
      console.log('Loading buildings...')
      const buildingsData = await buildingService.getBuildings(projectId)
      console.log('Buildings loaded:', buildingsData.length)
      setBuildings(buildingsData)

      // Загружаем объекты зон для всех зон
      const allZoneObjects: any[] = []
      console.log('Loading zone objects for zones:', zonesData.map(z => ({ id: z.id, name: z.name })))
      for (const zone of zonesData) {
        try {
          const zoneObjectsData = await zoneObjectService.getZoneObjects(zone.id)
          console.log(`Zone ${zone.name} (${zone.id}) objects:`, zoneObjectsData)
          allZoneObjects.push(...zoneObjectsData)
        } catch (err) {
          console.error(`Error loading objects for zone ${zone.id}:`, err)
        }
      }
      console.log('Total zone objects loaded:', allZoneObjects.length, allZoneObjects)
      setZoneObjects(allZoneObjects)
      try { (window as any)._zoneObjects = allZoneObjects } catch {}

      // Загружаем тикеты для всех объектов зон
      console.log('🎫 Starting tickets loading for all zone objects...')
      console.log('🎫 Total zone objects to process:', allZoneObjects.length)
      const ticketsMap: Record<string, ZoneObjectTicket[]> = {}
      for (const obj of allZoneObjects) {
        try {
          console.log('🔍 Loading tickets for zone object:', obj.id, obj.title)
          const tickets = await ticketService.getTicketsByZoneObject(obj.id)
          console.log('✅ Tickets loaded for', obj.title, ':', tickets)
          console.log('🎫 Tickets count for', obj.title, ':', tickets.length)
          ticketsMap[obj.id] = tickets
        } catch (err) {
          console.warn('⚠️ Error loading tickets for zone object:', obj.id, err)
        }
      }
      console.log('🎫 Final ticketsMap:', ticketsMap)
      console.log('🎫 Final ticketsMap keys:', Object.keys(ticketsMap))
      console.log('🎫 Final ticketsMap total tickets:', Object.values(ticketsMap).flat().length)
      setTicketsByZoneObject(ticketsMap)

      // Загружаем связи между объектами
      console.log('🔗 Loading links...')
      const linksData = await linkService.getLinks(projectId)
      console.log('🔗 Links loaded:', linksData)
      console.log('🔗 Links count:', linksData.length)
      setLinks(linksData)
    } catch (err) {
      console.error('Error loading project data:', err)
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Создание зоны
  const createZone = useCallback(async (name: string, color: string, cells: Array<[number, number]>) => {
    console.log('useProjectData: Creating zone with:', { name, color, cells, projectId })
    
    if (!projectId) {
      console.warn('useProjectData: No projectId provided')
      return null
    }

    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      console.log('useProjectData: Current user:', user?.id)
      
      // Создаем зону
      console.log('useProjectData: Calling zoneService.createZone')
      const zone = await zoneService.createZone({
        name,
        color,
        project_id: projectId,
        created_by: user?.id || undefined as unknown as string
      })

      if (!zone) {
        console.warn('useProjectData: zoneService.createZone returned null')
        return null
      }

      console.log('useProjectData: Zone created:', zone)

      // Создаем ячейки зоны
      const zoneCells = cells.map(([q, r]) => ({
        zone_id: zone.id,
        q,
        r
      }))

      console.log('useProjectData: Creating zone cells:', zoneCells)
      const createdZoneCells = await zoneCellService.createZoneCells(zoneCells)
      console.log('useProjectData: Zone cells created on server:', createdZoneCells)

      // Обновляем локальное состояние
      setZones(prev => [zone, ...prev])
      
      // Добавляем ячейки зоны в локальное состояние
      const newZoneCells = cells.map(([q, r]) => ({
        id: crypto.randomUUID(),
        zone_id: zone.id,
        q,
        r,
        created_at: new Date().toISOString()
      })) as unknown as ZoneCell[]
      setZoneCells(prev => [...newZoneCells, ...prev])
      
      console.log('useProjectData: Zone added to local state')
      console.log('useProjectData: Total zones in state:', zones.length + 1)
      console.log('useProjectData: Total zone cells in state:', zoneCells.length + newZoneCells.length)

      return zone
    } catch (err) {
      console.error('useProjectData: Error creating zone:', err)
      setError('Failed to create zone')
      return null
    }
  }, [projectId])

  // Удаление зоны
  const deleteZone = useCallback(async (zoneId: string) => {
    try {
      // Удаляем ячейки зоны
      await zoneCellService.deleteZoneCells(zoneId)

      // Удаляем зону
      const success = await zoneService.deleteZone(zoneId)

      if (success) {
        setZones(prev => prev.filter(zone => zone.id !== zoneId))
      }

      return success
    } catch (err) {
      console.error('Error deleting zone:', err)
      setError('Failed to delete zone')
      return false
    }
  }, [])

  // Создание здания
  const createBuilding = useCallback(async (
    q: number,
    r: number,
    buildingType: Building['building_type'],
    category: string,
    taskName: string,
    progress: number,
    priority: number
  ) => {
    console.log('useProjectData: Creating building with:', { q, r, buildingType, category, taskName, progress, priority, projectId })
    
    if (!projectId) {
      console.warn('useProjectData: No projectId provided for building')
      return null
    }

    try {
      console.log('useProjectData: Calling buildingService.createBuilding')
      const building = await buildingService.createBuilding({
        project_id: projectId,
        q,
        r,
        building_type: buildingType,
        category,
        task_name: taskName,
        progress,
        priority
      })

      if (building) {
        console.log('useProjectData: Building created:', building)
        setBuildings(prev => [...prev, building])
      } else {
        console.warn('useProjectData: buildingService.createBuilding returned null')
      }

      return building
    } catch (err) {
      console.error('useProjectData: Error creating building:', err)
      setError('Failed to create building')
      return null
    }
  }, [projectId])

  // Удаление здания
  const deleteBuilding = useCallback(async (buildingId: string) => {
    try {
      const success = await buildingService.deleteBuilding(buildingId)

      if (success) {
        setBuildings(prev => prev.filter(building => building.id !== buildingId))
      }

      return success
    } catch (err) {
      console.error('Error deleting building:', err)
      setError('Failed to delete building')
      return false
    }
  }, [])

  // Обновление состояния ячейки
  const updateHexCellState = useCallback(async (q: number, r: number, state: HexCell['state']) => {
    if (!projectId) return false

    try {
      const success = await hexCellService.updateHexCellState(projectId, q, r, state)

      if (success) {
        setHexCells(prev => prev.map(cell => 
          cell.q === q && cell.r === r 
            ? { ...cell, state, updated_at: new Date().toISOString() }
            : cell
        ))
      }

      return success
    } catch (err) {
      console.error('Error updating hex cell state:', err)
      setError('Failed to update cell state')
      return false
    }
  }, [projectId])

  // Получение зоны для ячейки
  const getZoneForCell = useCallback((q: number, r: number) => {
    // Находим зону, которая содержит данную ячейку
    const zoneCell = zoneCells.find(cell => cell.q === q && cell.r === r)
    if (!zoneCell) return null
    
    return zones.find(zone => zone.id === zoneCell.zone_id) || null
  }, [zones, zoneCells])

  // Получение здания для ячейки
  const getBuildingForCell = useCallback((q: number, r: number) => {
    return buildings.find(building => building.q === q && building.r === r) || null
  }, [buildings])

  // Создание объекта зоны
  const createZoneObject = useCallback(async (objectData: {
    zone_id: string
    object_type: 'mountain' | 'castle' | 'house' | 'garden' | 'factory' | 'helipad' | 'story' | 'task' | 'bug' | 'test'
    title: string
    description?: string
    status?: string
    priority?: string
    story_points?: number
    assignee_id?: string
    q: number
    r: number
  }) => {
    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      
      const object = await zoneObjectService.createZoneObject({
        ...objectData,
        created_by: user?.id || undefined
      })

      if (object) {
        console.log('useProjectData: Zone object created:', object)
        setZoneObjects(prev => [...prev, object])
      } else {
        console.warn('useProjectData: zoneObjectService.createZoneObject returned null')
      }

      return object
    } catch (err) {
      console.error('useProjectData: Error creating zone object:', err)
      setError('Failed to create zone object')
      return null
    }
  }, [])

  // Обновление позиции объекта зоны на основе центра зоны
  const updateZoneObjectPosition = useCallback(async (zoneId: string) => {
    try {
      console.log('useProjectData: Updating zone object position for zone:', zoneId)
      
      const success = await zoneObjectService.updateZoneObjectPosition(zoneId)
      
      if (success) {
        console.log('useProjectData: Zone object position updated successfully')
        // Перезагружаем данные, чтобы обновить UI
        await loadProjectData()
      } else {
        console.warn('useProjectData: Failed to update zone object position')
        setError('Failed to update zone object position')
      }
      
      return success
    } catch (err) {
      console.error('useProjectData: Error updating zone object position:', err)
      setError('Failed to update zone object position')
      return false
    }
  }, [loadProjectData])

  // Получение объекта зоны для ячейки
  const getZoneObjectForCell = useCallback((q: number, r: number) => {
    return zoneObjects.find(obj => obj.q === q && obj.r === r) || null
  }, [zoneObjects])

  // Обновление объекта зоны
  const updateZoneObject = useCallback(async (objectId: string, updates: {
    title?: string
    description?: string
    status?: string
    priority?: string
    story_points?: number
  }) => {
    console.log('=== UPDATEZONEOBJECT CALLED ===')
    console.log('Object ID:', objectId)
    console.log('Updates:', updates)
    console.log('Status update:', updates.status)
    console.log('Status type:', typeof updates.status)
    console.log('Priority update:', updates.priority)
    console.log('Priority type:', typeof updates.priority)
    
    try {
      // Валидируем данные перед отправкой
      const validatedUpdates = {
        title: updates.title || '',
        description: updates.description || '',
        status: updates.status || 'open',
        priority: updates.priority || 'medium',
        story_points: updates.story_points || 0
      }
      
      console.log('=== VALIDATED UPDATES ===')
      console.log('Validated updates:', validatedUpdates)
      console.log('Status in validated updates:', validatedUpdates.status)
      console.log('Status type in validated updates:', typeof validatedUpdates.status)
      
      const result = await zoneObjectService.updateZoneObject(objectId, validatedUpdates)
      
      console.log('=== ZONEOBJECTSERVICE RESULT ===')
      console.log('Result from zoneObjectService:', result)
      
      if (result) {
        console.log('useProjectData: Zone object updated successfully:', result)
        console.log('Updated status in result:', result.status)
        console.log('Updated priority in result:', result.priority)
        
        // Обновляем только конкретный объект в локальном состоянии
        setZoneObjects(prev => {
          const updated = prev.map(obj => obj.id === objectId ? { ...obj, ...result } : obj)
          console.log('Updated zoneObjects:', updated)
          return updated
        })
        
        // Очищаем ошибку при успешном обновлении
        setError(null)
      } else {
        console.error('zoneObjectService.updateZoneObject returned null/undefined')
        setError('Failed to update zone object: Database returned null')
      }
      
      return result
    } catch (err) {
      console.error('useProjectData: Error updating zone object:', err)
      
      // Более детальное сообщение об ошибке
      let errorMessage = 'Failed to update zone object'
      if (err instanceof Error) {
        errorMessage = `Failed to update zone object: ${err.message}`
      }
      
      setError(errorMessage)
      return null
    }
  }, [])

  // Создание тикета для объекта зоны с локальным обновлением состояния
  const createTicketForZoneObject = useCallback(async (
    zoneObjectId: string,
    ticket: {
      type: 'story' | 'task' | 'bug' | 'test'
      title: string
      status?: 'open' | 'in_progress' | 'done'
      priority?: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'
      assignee_id?: string | null
      description?: string
      checklist?: any
      links?: any
      comments?: any
      attachments?: any
    }
  ) => {
    const created = await ticketService.createTicket({
      zone_object_id: zoneObjectId,
      ...ticket
    })
    if (created) {
      setTicketsByZoneObject(prev => ({
        ...prev,
        [zoneObjectId]: [created, ...(prev[zoneObjectId] || [])]
      }))
    }
    return created
  }, [])

  const updateTicket = useCallback(async (ticketId: string, zoneObjectId: string, updates: Partial<{ 
    title: string; 
    status: 'open' | 'in_progress' | 'done';
    priority: 'v-low'|'low'|'medium'|'high'|'veryhigh'; 
    assignee_id: string|null; 
    description: string;
    checklist: any;
    links: any;
    comments: any;
    attachments: any;
  }>) => {
    const clean = { ...updates } as any
    // Убираем поля, которые не должны обновляться через эту функцию
    delete clean.status
    const updated = await ticketService.updateTicket(ticketId, clean)
    if (updated) {
      setTicketsByZoneObject(prev => ({
        ...prev,
        [zoneObjectId]: (prev[zoneObjectId] || []).map(t => t.id === ticketId ? { ...t, ...updated } : t)
      }))
    }
    return updated
  }, [])

  // Локальное обновление после перемещения тикета между объектами
  useEffect(() => {
    const onMoved = (e: any) => {
      const { from, to, ticketId, optimistic } = e.detail || {}
      if (!from || !to || !ticketId) return
      // If we already moved optimistically via moveTicket, skip duplicating state changes here
      if (optimistic) return
      setTicketsByZoneObject(prev => {
        const next = { ...prev }
        // Remove from source
        next[from] = (next[from] || []).filter(t => t.id !== ticketId)
        // Dedupe destination and insert at top
        const movedTicket = Object.values(prev).flat().find(t => t.id === ticketId)
        const toList = (next[to] || []).filter(t => t.id !== ticketId)
        if (movedTicket) {
          const updated = { ...movedTicket, zone_object_id: to }
          next[to] = [updated, ...toList]
        } else {
          next[to] = toList
        }
        return next
      })
    }
    window.addEventListener('ticket-moved' as any, onMoved as any, true)
    return () => window.removeEventListener('ticket-moved' as any, onMoved as any, true)
  }, [])

  const moveTicket = useCallback(async (ticketId: string, fromZoneObjectId: string, toZoneObjectId: string) => {
    console.log('🔄 moveTicket called with:', { ticketId, fromZoneObjectId, toZoneObjectId })
    
    if (fromZoneObjectId === toZoneObjectId) {
      console.log('⚠️ Same zone object, no move needed')
      return null
    }
    
    // Optimistic update: move immediately in local state
    let prevFromList: any[] = []
    let prevToList: any[] = []
    let optimisticTicket: any | null = null
    setTicketsByZoneObject(prev => {
      prevFromList = prev[fromZoneObjectId] || []
      prevToList = prev[toZoneObjectId] || []
      const found = prevFromList.find(t => t.id === ticketId)
      optimisticTicket = found ? { ...found, zone_object_id: toZoneObjectId } : null
      const fromList = prevFromList.filter(t => t.id !== ticketId)
      const toList = optimisticTicket ? [optimisticTicket, ...prevToList] : prevToList
      return { ...prev, [fromZoneObjectId]: fromList, [toZoneObjectId]: toList }
    })

    // Fire request in background; reconcile on result
    try {
      const moved = await ticketService.moveTicketToZoneObject(ticketId, toZoneObjectId)
      if (moved) {
        setTicketsByZoneObject(prev => ({
          ...prev,
          [toZoneObjectId]: (prev[toZoneObjectId] || []).map(t => (t.id === ticketId ? { ...t, ...moved } : t))
        }))
      } else {
        // rollback
        setTicketsByZoneObject(prev => ({
          ...prev,
          [fromZoneObjectId]: prevFromList,
          [toZoneObjectId]: prevToList
        }))
      }
      return moved
    } catch (err) {
      // rollback on error
      setTicketsByZoneObject(prev => ({
        ...prev,
        [fromZoneObjectId]: prevFromList,
        [toZoneObjectId]: prevToList
      }))
      return null
    }
  }, [])

  // Методы для работы со связями
  const createLink = useCallback(async (fromObjectId: string, toObjectId: string, linkType: 'primary' | 'secondary' = 'primary') => {
    const created = await linkService.createLink(fromObjectId, toObjectId, linkType)
    if (created) {
      setLinks(prev => [...prev, created])
    }
    return created
  }, [])

  const deleteLink = useCallback(async (linkId: string) => {
    const success = await linkService.deleteLink(linkId)
    if (success) {
      setLinks(prev => prev.filter(link => link.id !== linkId))
    }
    return success
  }, [])

  const getPrimaryLink = useCallback(async (fromObjectId: string) => {
    return await linkService.getPrimaryLink(fromObjectId)
  }, [])

  // Загрузка данных при изменении projectId
  useEffect(() => {
    console.log('🔄 useProjectData useEffect triggered')
    console.log('🔄 projectId:', projectId)
    console.log('🔄 loadProjectData function:', typeof loadProjectData)
    loadProjectData()
  }, [loadProjectData])

  return {
    zones,
    zoneCells,
    hexCells,
    buildings,
    zoneObjects,
    ticketsByZoneObject,
    links,
    createTicketForZoneObject,
    updateTicket,
    moveTicket,
    createLink,
    deleteLink,
    getPrimaryLink,
    loading,
    error,
    createZone,
    deleteZone,
    createBuilding,
    deleteBuilding,
    createZoneObject,
    updateZoneObject,
    updateZoneObjectPosition,
    getZoneForCell,
    getBuildingForCell,
    getZoneObjectForCell,
    reloadData: loadProjectData
  }

  // Remove archived tickets from in-memory state when moved to archive
  const removeArchivedFromState = useCallback((zoneObjectId: string) => {
    setTicketsByZoneObject(prev => {
      const list = prev[zoneObjectId] || []
      const filtered = list.filter((t: any) => t.board_column !== 'archived')
      return { ...prev, [zoneObjectId]: filtered }
    })
  }, [])
} 