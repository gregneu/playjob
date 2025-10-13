import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Zone, ZoneCell, HexCell, Building } from '../types/enhanced'
import { calculateHexZoneCenter } from './hex-utils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

const globalForSupabase = globalThis as typeof globalThis & {
  supabaseClient?: SupabaseClient
  supabaseServiceClient?: SupabaseClient | null
}

const getOrInitSupabaseClient = () => {
  if (!globalForSupabase.supabaseClient) {
    globalForSupabase.supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '')
  }
  return globalForSupabase.supabaseClient
}

const getOrInitSupabaseServiceClient = () => {
  if (!supabaseServiceKey) {
    return null
  }
  if (globalForSupabase.supabaseServiceClient === undefined) {
    globalForSupabase.supabaseServiceClient = createClient(supabaseUrl || '', supabaseServiceKey)
  }
  return globalForSupabase.supabaseServiceClient
}

// Проверяем наличие переменных окружения
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not configured. Using mock data.')
}

export const supabase = getOrInitSupabaseClient()

// Создаем отдельный клиент с service_role для загрузки zone_objects
export const supabaseService = getOrInitSupabaseServiceClient()

// Функция для проверки доступности Supabase
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey)
}

// Проверка существования таблицы zone_objects
export const checkZoneObjectsTable = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured')
    return false
  }

  try {
    const { data, error } = await supabase
      .from('zone_objects')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Error checking zone_objects table:', error)
      return false
    }

    console.log('zone_objects table exists and is accessible')
    return true
  } catch (err) {
    console.error('Error checking zone_objects table:', err)
    return false
  }
}

// Функции для работы с зонами
export const zoneService = {
  // Получить все зоны проекта
  async getZones(projectId: string): Promise<Zone[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    console.log('=== GETTING ZONES ===')
    console.log('Project ID:', projectId)

    try {
      // Skip invalid projectId
      if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(projectId)) {
        console.warn('getZones: non-UUID projectId, returning empty array:', projectId)
        return []
      }
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching zones:', error)
        console.error('Error details:', error.message, error.details, error.hint)
        return []
      }

      console.log('Zones fetched successfully:', data)
      return data || []
    } catch (err) {
      console.warn('Table zones might not exist yet, returning empty array')
      console.error('Exception details:', err)
      return []
    }
  },

  // Создать новую зону
  async createZone(zone: Omit<Zone, 'id' | 'created_at' | 'updated_at'>): Promise<Zone | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning null')
      return null
    }

    const { data, error } = await supabase
      .from('zones')
      .insert(zone)
      .select()
      .single()

    if (error) {
      console.error('Error creating zone:', error)
      return null
    }

    return data
  },

  // Удалить зону
  async deleteZone(zoneId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning false')
      return false
    }

    const { error } = await supabase
      .from('zones')
      .delete()
      .eq('id', zoneId)

    if (error) {
      console.error('Error deleting zone:', error)
      return false
    }

    return true
  }
}

// Функции для работы с ячейками зон
export const zoneCellService = {
  // Получить все ячейки зоны
  async getZoneCells(zoneId: string): Promise<ZoneCell[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    console.log('=== GETTING ZONE CELLS ===')
    console.log('Zone ID:', zoneId)

    const { data, error } = await supabase
      .from('zone_cells')
      .select('*')
      .eq('zone_id', zoneId)

    if (error) {
      console.error('Error fetching zone cells:', error)
      console.error('Error details:', error.message, error.details, error.hint)
      return []
    }

    console.log('Zone cells fetched successfully:', data)
    return data || []
  },

  // Создать ячейки зоны
  async createZoneCells(cells: Omit<ZoneCell, 'id' | 'created_at'>[]): Promise<ZoneCell[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    const { data, error } = await supabase
      .from('zone_cells')
      .insert(cells)
      .select()

    if (error) {
      console.error('Error creating zone cells:', error)
      return []
    }

    return data || []
  },

  // Удалить все ячейки зоны
  async deleteZoneCells(zoneId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning false')
      return false
    }

    const { error } = await supabase
      .from('zone_cells')
      .delete()
      .eq('zone_id', zoneId)

    if (error) {
      console.error('Error deleting zone cells:', error)
      return false
    }

    return true
  }
}

// Функции для работы с гексагональными ячейками
export const hexCellService = {
  // Получить все ячейки проекта
  async getHexCells(projectId: string): Promise<HexCell[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    try {
      if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(projectId)) {
        console.warn('getHexCells: non-UUID projectId, returning empty array:', projectId)
        return []
      }
      const { data, error } = await supabase
        .from('hex_cells')
        .select('*')
        .eq('project_id', projectId)

      if (error) {
        console.error('Error fetching hex cells:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.warn('Table hex_cells might not exist yet, returning empty array')
      return []
    }
  },

  // Создать или обновить ячейку
  async upsertHexCell(cell: Omit<HexCell, 'id' | 'created_at' | 'updated_at'>): Promise<HexCell | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning null')
      return null
    }

    const { data, error } = await supabase
      .from('hex_cells')
      .upsert(cell, { onConflict: 'project_id,q,r' })
      .select()
      .single()

    if (error) {
      console.error('Error upserting hex cell:', error)
      return null
    }

    return data
  },

  // Обновить состояние ячейки
  async updateHexCellState(projectId: string, q: number, r: number, state: HexCell['state']): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning false')
      return false
    }

    const { error } = await supabase
      .from('hex_cells')
      .update({ state, updated_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('q', q)
      .eq('r', r)

    if (error) {
      console.error('Error updating hex cell state:', error)
      return false
    }

    return true
  }
}

// Функции для работы со зданиями
export const buildingService = {
  // Получить все здания проекта
  async getBuildings(projectId: string): Promise<Building[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    try {
      if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(projectId)) {
        console.warn('getBuildings: non-UUID projectId, returning empty array:', projectId)
        return []
      }
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('project_id', projectId)

      if (error) {
        console.error('Error fetching buildings:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.warn('Table buildings might not exist yet, returning empty array')
      return []
    }
  },

  // Создать здание
  async createBuilding(building: Omit<Building, 'id' | 'created_at' | 'updated_at'>): Promise<Building | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning null')
      return null
    }

    const { data, error } = await supabase
      .from('buildings')
      .insert(building)
      .select()
      .single()

    if (error) {
      console.error('Error creating building:', error)
      return null
    }

    return data
  },

  // Удалить здание
  async deleteBuilding(buildingId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning false')
      return false
    }

    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('id', buildingId)

    if (error) {
      console.error('Error deleting building:', error)
      return false
    }

    return true
  }
}

// Функции для работы с объектами зон
export const zoneObjectService = {
  // Получить все объекты зоны
  async getZoneObjects(zoneId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning empty array')
      return []
    }

    console.log('=== GETTING ZONE OBJECTS ===')
    console.log('Zone ID:', zoneId)

    try {
      // Используем service_role клиент для обхода RLS
      const client = supabaseService || supabase
      const { data, error } = await client
        .from('zone_objects')
        .select('*')
        .eq('zone_id', zoneId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching zone objects:', error)
        console.error('Error details:', error.message, error.details, error.hint)
        return []
      }

      console.log('Zone objects fetched successfully:', data)
      return data || []
    } catch (err) {
      console.warn('Table zone_objects might not exist yet, returning empty array')
      console.error('Exception details:', err)
      return []
    }
  },

  // Получить объект по координатам
  async getZoneObjectByCoordinates(zoneId: string, q: number, r: number): Promise<any | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning null')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('zone_objects')
        .select('*')
        .eq('zone_id', zoneId)
        .eq('q', q)
        .eq('r', r)
        .single()

      if (error) {
        console.error('Error fetching zone object by coordinates:', error)
        return null
      }

      return data
    } catch (err) {
      console.warn('Table zone_objects might not exist yet, returning null')
      return null
    }
  },

  // Создать объект зоны
  async createZoneObject(object: {
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
    created_by?: string
  }): Promise<any | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning null')
      return null
    }

    // Проверяем существование таблицы
    const tableExists = await checkZoneObjectsTable()
    if (!tableExists) {
      console.error('zone_objects table does not exist or is not accessible')
      return null
    }

    try {
      console.log('=== CREATING ZONE OBJECT ===')
      console.log('Object data to insert:', object)
      console.log('Status:', object.status)
      console.log('Priority:', object.priority)
      
      const { data, error } = await supabase
        .from('zone_objects')
        .insert(object)
        .select()
        .single()

      if (error) {
        console.error('Error creating zone object:', error)
        console.error('Error details:', error.message, error.details, error.hint)
        return null
      }

      console.log('=== ZONE OBJECT CREATED SUCCESSFULLY ===')
      console.log('Created object:', data)
      console.log('Status in database:', data.status)
      console.log('Priority in database:', data.priority)

      return data
    } catch (err) {
      console.error('Error creating zone object:', err)
      return null
    }
  },

  // Обновить объект зоны
  async updateZoneObject(objectId: string, updates: Partial<{
    title: string
    description: string
    status: string
    priority: string
    story_points: number
    assignee_id: string
    color: string
  }>): Promise<any | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning null')
      return null
    }

    // Проверяем существование таблицы
    const tableExists = await checkZoneObjectsTable()
    if (!tableExists) {
      console.error('zone_objects table does not exist or is not accessible')
      return null
    }

    try {
      console.log('=== UPDATING ZONE OBJECT ===')
      console.log('Object ID:', objectId)
      console.log('Updates to apply:', updates)
      console.log('Status update:', updates.status)
      console.log('Status update type:', typeof updates.status)
      console.log('Priority update:', updates.priority)
      console.log('Priority update type:', typeof updates.priority)
      
      // Валидируем данные перед отправкой
      const validatedUpdates = {
        title: updates.title || '',
        description: updates.description || '',
        status: updates.status || 'open',
        priority: updates.priority || 'medium',
        story_points: updates.story_points || 0,
        updated_at: new Date().toISOString()
      }
      
      // Убираем undefined значения
      Object.keys(validatedUpdates).forEach(key => {
        if (validatedUpdates[key as keyof typeof validatedUpdates] === undefined) {
          delete validatedUpdates[key as keyof typeof validatedUpdates]
        }
      })
      
      console.log('Validated data to send to database:', validatedUpdates)
      console.log('Status in validated data:', validatedUpdates.status)
      console.log('Status type in validated data:', typeof validatedUpdates.status)
      
      const { data, error } = await supabase
        .from('zone_objects')
        .update(validatedUpdates)
        .eq('id', objectId)
        .select()
        .single()

      if (error) {
        console.error('Error updating zone object:', error)
        console.error('Error details:', error.message, error.details, error.hint)
        console.error('Error code:', error.code)
        console.error('Error hint:', error.hint)
        console.error('Error details:', error.details)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('=== ZONE OBJECT UPDATED SUCCESSFULLY ===')
      console.log('Updated object:', data)
      console.log('Status in database:', data.status)
      console.log('Priority in database:', data.priority)

      return data
    } catch (err) {
      console.error('Error updating zone object:', err)
      if (err instanceof Error) {
        throw err
      } else {
        throw new Error('Unknown error occurred while updating zone object')
      }
    }
  },

  // Удалить объект зоны
  async deleteZoneObject(objectId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning false')
      return false
    }

    try {
      const { error } = await supabase
        .from('zone_objects')
        .delete()
        .eq('id', objectId)

      if (error) {
        console.error('Error deleting zone object:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Error deleting zone object:', err)
      return false
    }
  },

  // Тестовая функция для проверки обновления
  async testUpdateZoneObject(objectId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning null')
      return null
    }

    try {
      console.log('=== TESTING UPDATE ZONE OBJECT ===')
      console.log('Object ID:', objectId)
      
      const testUpdate = {
        title: 'Test Update',
        status: 'in_progress',
        priority: 'medium',
        updated_at: new Date().toISOString()
      }
      
      console.log('Test update data:', testUpdate)
      
      const { data, error } = await supabase
        .from('zone_objects')
        .update(testUpdate)
        .eq('id', objectId)
        .select()
        .single()

      if (error) {
        console.error('Test update error:', error)
        console.error('Error details:', error.message, error.details, error.hint)
        return null
      }

      console.log('Test update successful:', data)
      return data
    } catch (err) {
      console.error('Test update exception:', err)
      return null
    }
  },

  // Обновить позицию объекта зоны на основе центра зоны
  async updateZoneObjectPosition(zoneId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, returning false')
      return false
    }

    try {
      console.log('=== UPDATING ZONE OBJECT POSITION ===')
      console.log('Zone ID:', zoneId)

      // 1. Получаем все ячейки зоны
      const { data: zoneCells, error: cellsError } = await supabase
        .from('zone_cells')
        .select('q, r')
        .eq('zone_id', zoneId)

      if (cellsError) {
        console.error('Error fetching zone cells:', cellsError)
        return false
      }

      if (!zoneCells || zoneCells.length === 0) {
        console.warn('No cells found for zone:', zoneId)
        return false
      }

      // 2. Используем новый правильный алгоритм центрирования
      const center = calculateHexZoneCenter(zoneCells)
      if (!center) {
        console.error(`Could not calculate center for zone ${zoneId}`)
        return false
      }

      const [newCenterQ, newCenterR] = center

      console.log('Calculated center using new algorithm:', { newCenterQ, newCenterR })

      // 4. Обновляем позицию всех объектов зоны
      const { error: updateError } = await supabase
        .from('zone_objects')
        .update({ q: newCenterQ, r: newCenterR })
        .eq('zone_id', zoneId)

      if (updateError) {
        console.error('Error updating zone object positions:', updateError)
        return false
      }

      console.log('✅ Zone object positions updated successfully')
      return true
    } catch (err) {
      console.error('Exception updating zone object positions:', err)
      return false
    }
  }
}

// Service for tickets inside zone objects
export const ticketService = {
  // Get tickets for a specific zone object
  async getTicketsByZoneObject(zoneObjectId: string): Promise<Array<any>> {
    console.log('🔍 getTicketsByZoneObject called with zoneObjectId:', zoneObjectId)
    console.log('🔍 isSupabaseConfigured():', isSupabaseConfigured())
    console.log('🔍 supabaseUrl:', supabaseUrl)
    console.log('🔍 supabaseAnonKey exists:', !!supabaseAnonKey)
    
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured, returning empty array')
      return []
    }
    
    try {
      console.log('🔍 Fetching tickets for zone object:', zoneObjectId)
      console.log('🔍 About to make Supabase query...')
      
      const { data, error } = await supabase
        .from('object_tickets')
        .select('*')
        .eq('zone_object_id', zoneObjectId)
        .neq('board_column', 'archived')
        .order('created_at', { ascending: false })
      
      console.log('🔍 Supabase query completed')
      console.log('🔍 Query result - data:', data)
      console.log('🔍 Query result - error:', error)
      
      if (error) {
        console.error('❌ Error fetching tickets:', error)
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return []
      }
      
      console.log('✅ Tickets loaded from database:', data)
      return data || []
    } catch (err) {
      console.warn('⚠️ Table object_tickets might not exist yet, returning empty array')
      return []
    }
  },

  // Create a new ticket
  async createTicket(ticket: {
    zone_object_id: string
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
  }): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      
      const ticketData = {
        ...ticket,
        status: ticket.status || 'open',
        priority: ticket.priority || 'medium',
        // Если assignee_id не указан, назначаем создателя
        assignee_id: ticket.assignee_id || user?.id || null,
        checklist: ticket.checklist || [],
        links: ticket.links || [],
        comments: ticket.comments || [],
        attachments: ticket.attachments || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('object_tickets')
        .insert(ticketData)
        .select()
        .single()
      
      if (error) {
        console.error('Error creating ticket:', error)
        return null
      }
      return data
    } catch (err) {
      console.error('Error creating ticket:', err)
      return null
    }
  },

  async updateTicket(ticketId: string, updates: Partial<{
    title: string
    status: 'open' | 'in_progress' | 'done'
    priority: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'
    assignee_id: string | null
    description: string
    checklist: any
    links: any
    comments: any
    attachments: any
  }>): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      console.log('🔄 ticketService.updateTicket called with:', { ticketId, updates })
      
      // Добавляем timestamp обновления
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      console.log('📝 Updates with timestamp:', updatesWithTimestamp)
      
      const { data, error } = await supabase
        .from('object_tickets')
        .update(updatesWithTimestamp)
        .eq('id', ticketId)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error updating ticket:', error)
        return null
      }
      
      console.log('✅ Ticket updated successfully:', data)
      return data
    } catch (err) {
      console.error('❌ Exception in updateTicket:', err)
      return null
    }
  }
  ,
  async moveTicketToZoneObject(ticketId: string, toZoneObjectId: string): Promise<any | null> {
    console.log('🗄️ moveTicketToZoneObject called with:', { ticketId, toZoneObjectId })
    
    if (!isSupabaseConfigured()) {
      console.log('❌ Supabase not configured')
      return null
    }
    
    try {
      console.log('📡 Sending update request to Supabase...')
      const { data, error } = await supabase
        .from('object_tickets')
        .update({ zone_object_id: toZoneObjectId })
        .eq('id', ticketId)
        .select()
        .single()
        
      if (error) {
        console.error('❌ Supabase error moving ticket:', error)
        return null
      }
      
      console.log('✅ Ticket moved successfully in database:', data)
      return data
    } catch (err) {
      console.error('❌ Exception moving ticket:', err)
      return null
    }
  },

  async assignTicketsToSprint(ticketIds: string[], sprintId: string | null, options?: { boardColumn?: 'planned' | 'in_sprint' }): Promise<number> {
    if (!isSupabaseConfigured()) return 0
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) return 0

    try {
      const nowIso = new Date().toISOString()
      const updates: Record<string, any> = {
        updated_at: nowIso,
        sprint_id: sprintId
      }

      if (options?.boardColumn) {
        updates.board_column = options.boardColumn
      } else if (sprintId) {
        updates.board_column = 'in_sprint'
      }

      const query = supabase
        .from('object_tickets')
        .update(updates)
        .in('id', ticketIds)
        .select('id')

      const { data, error } = await query
      if (error) {
        console.error('❌ assignTicketsToSprint error:', error)
        return 0
      }
      return Array.isArray(data) ? data.length : 0
    } catch (err) {
      console.error('❌ assignTicketsToSprint exception:', err)
      return 0
    }
  },

  async removeTicketsFromSprint(ticketIds: string[]): Promise<number> {
    if (!isSupabaseConfigured()) return 0
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) return 0

    try {
      const nowIso = new Date().toISOString()
      const { data, error } = await supabase
        .from('object_tickets')
        .update({
          sprint_id: null,
          board_column: 'planned',
          updated_at: nowIso
        })
        .in('id', ticketIds)
        .select('id')

      if (error) {
        console.error('❌ removeTicketsFromSprint error:', error)
        return 0
      }
      return Array.isArray(data) ? data.length : 0
    } catch (err) {
      console.error('❌ removeTicketsFromSprint exception:', err)
      return 0
    }
  },

  async markTicketsDone(ticketIds: string[], sprintId: string | null): Promise<number> {
    if (!isSupabaseConfigured()) return 0
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) return 0

    try {
      const nowIso = new Date().toISOString()
      const updates: Record<string, any> = {
        status: 'done',
        board_column: 'archived',
        archived_at: nowIso,
        updated_at: nowIso
      }
      if (sprintId !== undefined) {
        updates.sprint_id = sprintId
      }

      const { data, error } = await supabase
        .from('object_tickets')
        .update(updates)
        .in('id', ticketIds)
        .select('id')

      if (error) {
        console.error('❌ markTicketsDone error:', error)
        return 0
      }
      return Array.isArray(data) ? data.length : 0
    } catch (err) {
      console.error('❌ markTicketsDone exception:', err)
      return 0
    }
  }
}

// Sprint service
type SprintStatus = 'draft' | 'active' | 'completed'

export class SaveSprintStateError extends Error {
  readonly reason: 'rls_denied' | 'not_found' | 'missing_zone' | 'unknown'

  constructor(reason: 'rls_denied' | 'not_found' | 'missing_zone' | 'unknown', message: string) {
    super(message)
    this.name = 'SaveSprintStateError'
    this.reason = reason
  }
}

interface SaveSprintStateParams {
  sprintId?: string | null
  projectId?: string
  zoneObjectId?: string | null
  name?: string
  weeks?: number
  plannedTicketIds?: string[]
  doneTicketIds?: string[]
  status?: SprintStatus
  startedAt?: string | null
  finishedAt?: string | null
}

const isRlsDeniedError = (error: { code?: string | null; message?: string | null } | null | undefined): boolean => {
  if (!error) return false
  if ((error.code ?? '') === '42501') return true
  const message = (error.message ?? '').toLowerCase()
  return message.includes('row-level security')
}

const buildSprintPermissionError = () =>
  new SaveSprintStateError('rls_denied', 'You do not have permission to plan sprints in this project.')

const syncSprintZoneObjectName = async (zoneObjectId: string | null | undefined, name?: string) => {
  if (!zoneObjectId || !name || !isSupabaseConfigured()) return
  try {
    const { error } = await supabase
      .from('zone_objects')
      .update({ title: name, updated_at: new Date().toISOString() })
      .eq('id', zoneObjectId)
      .in('object_type', ['mountain', 'sprint'])
    if (error) {
      console.error('syncSprintZoneObjectName error', error)
    }
  } catch (err) {
    console.error('syncSprintZoneObjectName exception', err)
  }
}

export const sprintService = {
  async invokeSaveSprintStateFunction(params: SaveSprintStateParams): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase.functions.invoke('save-sprint-state', {
        body: { params }
      })

      if (error) {
        console.error('saveSprintState function error', error)
        return null
      }

      const payload = (data as { data?: any } | null) ?? null
      return payload?.data ?? payload
    } catch (err) {
      console.error('saveSprintState function exception', err)
      return null
    }
  },

  async saveSprintState(params: SaveSprintStateParams): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    const {
      sprintId = null,
      projectId,
      zoneObjectId = null,
      name,
      weeks,
      plannedTicketIds,
      doneTicketIds,
      status,
      startedAt,
      finishedAt
    } = params

    if (!sprintId && (!projectId || !zoneObjectId)) {
      console.warn('saveSprintState requires sprintId or (projectId and zoneObjectId)')
      throw new SaveSprintStateError('missing_zone', 'A sprint must be linked to a sprint zone in this project.')
    }

    const nowIso = new Date().toISOString()

    try {
      const client = supabaseService ?? supabase
      const allowFallback = !supabaseService
      let targetId = sprintId

      if (!targetId && projectId && zoneObjectId) {
        const { data: existing, error: existingError } = await client
          .from('sprints')
          .select('*')
          .eq('project_id', projectId)
          .eq('zone_object_id', zoneObjectId)
          .neq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)

        if (existingError) {
          console.error('saveSprintState lookup error', existingError)
          if (allowFallback && isRlsDeniedError(existingError)) {
            const fallback = await sprintService.invokeSaveSprintStateFunction(params)
            if (fallback) return fallback
          }
          if (isRlsDeniedError(existingError)) {
            throw buildSprintPermissionError()
          }
          return null
        }

        if (Array.isArray(existing) && existing[0]) {
          targetId = existing[0].id
        }
      }

      const applyStatus = status as SprintStatus | undefined

      if (targetId) {
        const updates: Record<string, any> = { updated_at: nowIso }
        if (name !== undefined) updates.name = name
        if (weeks !== undefined) updates.weeks = weeks
        if (plannedTicketIds !== undefined) updates.planned_ticket_ids = plannedTicketIds
        if (doneTicketIds !== undefined) updates.done_ticket_ids = doneTicketIds
        if (applyStatus) updates.status = applyStatus
        if (applyStatus === 'active') {
          updates.started_at = startedAt ?? nowIso
        } else if (applyStatus === 'completed') {
          updates.ended_at = finishedAt ?? nowIso
        } else {
          if (startedAt !== undefined) updates.started_at = startedAt
          if (finishedAt !== undefined) updates.ended_at = finishedAt
        }
        if (zoneObjectId) updates.zone_object_id = zoneObjectId

        const { data, error } = await client
          .from('sprints')
          .update(updates)
          .eq('id', targetId)
          .select('*')
          .single()

        if (error) {
          console.error('saveSprintState update error', error)
          if (allowFallback && isRlsDeniedError(error)) {
            const fallback = await sprintService.invokeSaveSprintStateFunction(params)
            if (fallback) return fallback
          }
          if (isRlsDeniedError(error)) {
            throw buildSprintPermissionError()
          }
          if (error.code === 'PGRST116') {
            throw new SaveSprintStateError('not_found', 'Sprint record is no longer available.')
          }
          return null
        }

        if (zoneObjectId && name !== undefined) {
          await syncSprintZoneObjectName(zoneObjectId, name)
        }

        return data
      }

      if (!projectId) {
        console.warn('saveSprintState: projectId is required to insert a sprint record')
        throw new SaveSprintStateError('missing_zone', 'Cannot create sprint without a project context.')
      }

      const { data: { user } } = await supabase.auth.getUser()
      const recordStatus: SprintStatus = applyStatus ?? 'draft'
      const insertPayload: Record<string, any> = {
        project_id: projectId as string,
        zone_object_id: zoneObjectId,
        name: name ?? 'Sprint',
        weeks: weeks ?? 2,
        status: recordStatus,
        planned_ticket_ids: plannedTicketIds ?? [],
        done_ticket_ids: doneTicketIds ?? [],
        started_at: recordStatus === 'active'
          ? (startedAt ?? nowIso)
          : (startedAt ?? null),
        ended_at: recordStatus === 'completed'
          ? (finishedAt ?? nowIso)
          : (finishedAt ?? null),
        created_by: user?.id ?? null,
        created_at: nowIso,
        updated_at: nowIso
      }

      const { data, error } = await client
        .from('sprints')
        .insert(insertPayload)
        .select('*')
        .single()

      if (error) {
        console.error('saveSprintState insert error', error)
        if (allowFallback && isRlsDeniedError(error)) {
          const fallback = await sprintService.invokeSaveSprintStateFunction(params)
          if (fallback) return fallback
        }
        if (isRlsDeniedError(error)) {
          throw buildSprintPermissionError()
        }
        return null
      }

      if (zoneObjectId && (name ?? insertPayload.name)) {
        await syncSprintZoneObjectName(zoneObjectId, name ?? insertPayload.name)
      }

      return data
    } catch (err) {
      console.error('saveSprintState exception', err)
      const allowFallback = !supabaseService
      const message = err instanceof Error ? err.message.toLowerCase() : ''
      if (allowFallback && (message.includes('row-level security') || message.includes('42501'))) {
        const fallback = await sprintService.invokeSaveSprintStateFunction(params)
        if (fallback) return fallback
      }
      if (err instanceof SaveSprintStateError) {
        throw err
      }
      if (message.includes('row-level security') || message.includes('42501')) {
        throw buildSprintPermissionError()
      }
      return null
    }
  },

  async createSprint(
    projectId: string,
    zoneObjectId: string,
    name: string,
    weeks: number,
    plannedTicketIds: string[] = [],
    doneTicketIds: string[] = []
  ): Promise<any | null> {
    return await sprintService.saveSprintState({
      projectId,
      zoneObjectId,
      name,
      weeks,
      plannedTicketIds,
      doneTicketIds,
      status: 'active',
      startedAt: new Date().toISOString()
    })
  },

  async activateSprint(params: {
    projectId: string
    zoneObjectId: string | null
    name: string
    weeks: number
    plannedTicketIds?: string[]
    doneTicketIds?: string[]
    sprintId?: string | null
  }): Promise<any | null> {
    return await sprintService.saveSprintState({
      sprintId: params.sprintId,
      projectId: params.projectId,
      zoneObjectId: params.zoneObjectId,
      name: params.name,
      weeks: params.weeks,
      plannedTicketIds: params.plannedTicketIds ?? [],
      doneTicketIds: params.doneTicketIds ?? [],
      status: 'active',
      startedAt: new Date().toISOString()
    })
  },

  async finishSprint(sprintId: string, updates?: { plannedTicketIds?: string[]; doneTicketIds?: string[]; finishedAt?: string | null; zoneObjectId?: string | null }): Promise<any | null> {
    return await sprintService.saveSprintState({
      sprintId,
      plannedTicketIds: updates?.plannedTicketIds,
      doneTicketIds: updates?.doneTicketIds,
      finishedAt: updates?.finishedAt ?? new Date().toISOString(),
      status: 'completed',
      zoneObjectId: updates?.zoneObjectId ?? null
    })
  },

  async updateSprintName(sprintId: string, name: string, zoneObjectId?: string | null): Promise<boolean> {
    const result = await sprintService.saveSprintState({ sprintId, name, zoneObjectId: zoneObjectId ?? null })
    return Boolean(result)
  },

  async getActiveSprint(projectId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
      if (error) { console.error('getActiveSprint error', error); return null }
      return (data && data[0]) || null
    } catch (err) { console.error('getActiveSprint exception', err); return null }
  },

  async getActiveSprintForObject(projectId: string, zoneObjectId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('project_id', projectId)
        .eq('zone_object_id', zoneObjectId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
      if (error) { console.error('getActiveSprintForObject error', error); return null }
      return (data && data[0]) || null
    } catch (err) { console.error('getActiveSprintForObject exception', err); return null }
  },

  async getCurrentSprintForObject(projectId: string, zoneObjectId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('project_id', projectId)
        .eq('zone_object_id', zoneObjectId)
        .neq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(1)
      if (error) { console.error('getCurrentSprintForObject error', error); return null }
      return (data && data[0]) || null
    } catch (err) { console.error('getCurrentSprintForObject exception', err); return null }
  },

  async attachTicketToSprint(ticketId: string, sprintId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false
    try {
      const { error } = await supabase
        .from('object_tickets')
        .update({ board_column: 'in_sprint', sprint_id: sprintId, updated_at: new Date().toISOString() })
        .eq('id', ticketId)
      if (error) { console.error('attachTicketToSprint error', error); return false }
      return true
    } catch (err) { console.error('attachTicketToSprint exception', err); return false }
  },

  async attachTicketsInObjectToSprint(zoneObjectId: string, sprintId: string): Promise<number> {
    if (!isSupabaseConfigured()) return 0
    try {
      const { data, error } = await supabase
        .from('object_tickets')
        .update({ board_column: 'in_sprint', sprint_id: sprintId, updated_at: new Date().toISOString() })
        .eq('zone_object_id', zoneObjectId)
        .neq('board_column', 'archived')
        .select('id')
      if (error) { console.error('attachTicketsInObjectToSprint error', error); return 0 }
      return Array.isArray(data) ? data.length : 0
    } catch (err) { console.error('attachTicketsInObjectToSprint exception', err); return 0 }
  },

  async completeSprint(sprintId: string): Promise<{ archived_count: number } | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase.rpc('complete_sprint', { p_sprint_id: sprintId })
      if (error) { console.error('completeSprint error', error); return null }
      const first = Array.isArray(data) ? data[0] : data
      return first || { archived_count: 0 }
    } catch (err) { console.error('completeSprint exception', err); return null }
  },

  async archiveSprintTickets(projectId: string, sprintId: string | null, sprintObjectId: string | null): Promise<number> {
    if (!isSupabaseConfigured()) return 0
    try {
      const orClauses: string[] = []
      if (sprintId) orClauses.push(`sprint_id.eq.${sprintId}`)
      if (sprintObjectId) orClauses.push(`zone_object_id.eq.${sprintObjectId}`)
      if (orClauses.length === 0) return 0
      const { data, error } = await supabase
        .from('object_tickets')
        .update({ board_column: 'archived', updated_at: new Date().toISOString() })
        .neq('board_column', 'archived')
        .or(orClauses.join(','))
        .select('id')
      if (error) { console.error('archiveSprintTickets error', error); return 0 }
      return Array.isArray(data) ? data.length : 0
    } catch (err) { console.error('archiveSprintTickets exception', err); return 0 }
  },

  async incrementProjectCrystals(projectId: string, amount: number): Promise<number | null> {
    if (!isSupabaseConfigured()) return null
    if (!projectId || !amount) return null

    try {
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('crystals')
        .eq('id', projectId)
        .single()

      if (fetchError) {
        console.error('incrementProjectCrystals fetch error:', fetchError)
        return null
      }

      const current = typeof project?.crystals === 'number' ? project.crystals : 0
      const nextValue = current + amount

      const { data: updated, error: updateError } = await supabase
        .from('projects')
        .update({ crystals: nextValue })
        .eq('id', projectId)
        .select('crystals')
        .single()

      if (updateError) {
        console.error('incrementProjectCrystals update error:', updateError)
        return null
      }

      return typeof updated?.crystals === 'number' ? updated.crystals : nextValue
    } catch (err) {
      console.error('incrementProjectCrystals exception:', err)
      return null
    }
  },

  async getProject(projectId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single()
      if (error) { console.error('getProject error', error); return null }
      return data
    } catch (err) { console.error('getProject exception', err); return null }
  }
}

// Сервис для работы со связями между объектами
export const linkService = {
  // Получить все связи для проекта
  async getLinks(projectId: string): Promise<Array<{
    id: string
    from_object_id: string
    to_object_id: string
    link_type: 'primary' | 'secondary'
    created_at: string
  }>> {
    if (!isSupabaseConfigured()) return []
    try {
      if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(projectId)) {
        console.warn('getLinks: non-UUID projectId, returning empty array:', projectId)
        return []
      }
      console.log('🔗 Fetching links for project:', projectId)
      
      // Получаем связи напрямую по project_id
      const { data, error } = await supabase
        .from('zone_object_links')
        .select('*')
        .eq('project_id', projectId)
      
      if (error) {
        console.error('🔗 Error fetching links:', error)
        console.error('🔗 Error details:', error.message, error.details, error.hint)
        return []
      }
      
      console.log('🔗 Found links:', data)
      console.log('🔗 Links count:', data?.length || 0)
      return data || []
    } catch (err) {
      console.warn('🔗 Table zone_object_links might not exist yet, returning empty array')
      return []
    }
  },

  // Создать новую связь
  async createLink(fromObjectId: string, toObjectId: string, linkType: 'primary' | 'secondary' = 'primary'): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      console.log('🔗 Creating link:', { fromObjectId, toObjectId, linkType })
      console.log('🔗 LinkType type:', typeof linkType, 'value:', linkType)
      
      // Сначала проверим, существует ли уже такая связь
      const { data: existingLink, error: checkError } = await supabase
        .from('zone_object_links')
        .select('*')
        .eq('from_object_id', fromObjectId)
        .eq('to_object_id', toObjectId)
        .single()
      
      if (existingLink) {
        console.log('🔗 Link already exists:', existingLink)
        return existingLink
      }
      
      // Сначала получим project_id из одного из объектов
      const { data: fromObject, error: fromError } = await supabase
        .from('zone_objects')
        .select('zone_id')
        .eq('id', fromObjectId)
        .single()
      
      if (fromError) {
        console.error('Error fetching from object:', fromError)
        return null
      }
      
      const { data: zone, error: zoneError } = await supabase
        .from('zones')
        .select('project_id')
        .eq('id', fromObject.zone_id)
        .single()
      
      if (zoneError) {
        console.error('Error fetching zone:', zoneError)
        return null
      }
      
      console.log('Found project_id:', zone.project_id)
      
      const { data, error } = await supabase
        .from('zone_object_links')
        .insert({
          from_object_id: fromObjectId,
          to_object_id: toObjectId,
          project_id: zone.project_id
          // Временно убираем link_type чтобы использовать DEFAULT
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating link:', error)
        console.error('Error details:', error.message, error.details, error.hint)
        return null
      }
      
      console.log('Link created successfully:', data)
      return data
    } catch (err) {
      console.error('Error creating link:', err)
      return null
    }
  },

  // Удалить связь
  async deleteLink(linkId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false
    try {
      const { error } = await supabase
        .from('zone_object_links')
        .delete()
        .eq('id', linkId)
      if (error) {
        console.error('Error deleting link:', error)
        return false
      }
      return true
    } catch (err) {
      console.error('Error deleting link:', err)
      return false
    }
  },

  // Получить основную связь для объекта (куда тикеты должны переходить)
  async getPrimaryLink(fromObjectId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase
        .from('zone_object_links')
        .select('*')
        .eq('from_object_id', fromObjectId)
        .eq('link_type', 'primary')
        .single()
      if (error) {
        console.error('Error fetching primary link:', error)
        return null
      }
      return data
    } catch (err) {
      console.error('Error fetching primary link:', err)
      return null
    }
  }
  ,
  // Получить первую попавшуюся исходящую связь от объекта (fallback, если нет primary)
  async getFirstLinkFrom(fromObjectId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase
        .from('zone_object_links')
        .select('*')
        .eq('from_object_id', fromObjectId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      if (error) {
        // когда нет строк, supabase вернёт ошибку — превратим в null
        return null
      }
      return data
    } catch {
      return null
    }
  }
  ,
  // Получить первую входящую связь (кто ведет в текущий объект)
  async getFirstIncomingTo(toObjectId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase
        .from('zone_object_links')
        .select('*')
        .eq('to_object_id', toObjectId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      if (error) {
        return null
      }
      return data
    } catch {
      return null
    }
  }
}

// Функция для проверки, что актуальное поле цвета доступно (сейчас хранится в таблице zones)
let colorFieldCheckLogged = false
let colorFieldCheckResult: boolean | null = null

export const checkColorFieldExists = async (): Promise<boolean> => {
  if (colorFieldCheckResult !== null) {
    return colorFieldCheckResult
  }

  if (!isSupabaseConfigured()) {
    if (!colorFieldCheckLogged) {
      console.warn('Supabase not configured, returning false')
      colorFieldCheckLogged = true
    }
    colorFieldCheckResult = false
    return false
  }

  try {
    const client = supabaseService ?? supabase
    const { error } = await client
      .from('zones')
      .select('color')
      .limit(1)

    if (error) {
      if (!colorFieldCheckLogged) {
        console.warn('🎨 zones.color column is unavailable, fallback colors will be used', error)
        colorFieldCheckLogged = true
      }
      colorFieldCheckResult = false
      return false
    }

    if (!colorFieldCheckLogged) {
      console.log('🎨 Zone colors are managed through zones.color (column detected)')
      colorFieldCheckLogged = true
    }

    colorFieldCheckResult = true
    return true
  } catch (err) {
    if (!colorFieldCheckLogged) {
      console.error('🎨 Exception verifying zones.color column', err)
      colorFieldCheckLogged = true
    }
    colorFieldCheckResult = false
    return false
  }
}

// Функция для получения количества назначенных тикетов пользователю в проекте
let assignedTicketsRpcWarningLogged = false
let assignedTicketsFallbackWarningLogged = false

const isRpcMissingError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string; details?: string }
  const message = candidate.message?.toLowerCase() || ''
  const details = candidate.details?.toLowerCase() || ''
  return candidate.code === 'PGRST100'
    || candidate.code === 'PGRST201'
    || message.includes('not found')
    || message.includes('does not exist')
    || message.includes('no function')
    || details.includes('function')
}

const getAssignedTicketsFallback = async (projectId: string, userId: string): Promise<number> => {
  try {
    const client = supabaseService ?? supabase
    const zonesResponse = await client
      .from('zones')
      .select('id')
      .eq('project_id', projectId)

    if (zonesResponse.error) {
      console.error('❌ Fallback: failed to load zones for assigned ticket count', zonesResponse.error)
      return 0
    }

    const zoneIds = (zonesResponse.data ?? [])
      .map((zone) => zone.id)
      .filter((id): id is string => Boolean(id))

    if (zoneIds.length === 0) {
      return 0
    }

    const uniqueZoneIds = Array.from(new Set(zoneIds))

    const zoneObjectsResponse = await client
      .from('zone_objects')
      .select('id')
      .in('zone_id', uniqueZoneIds)

    if (zoneObjectsResponse.error) {
      console.error('❌ Fallback: failed to load zone objects for assigned ticket count', zoneObjectsResponse.error)
      return 0
    }

    const zoneObjectIds = (zoneObjectsResponse.data ?? [])
      .map((zo) => zo.id)
      .filter((id): id is string => Boolean(id))

    if (zoneObjectIds.length === 0) {
      return 0
    }

    const uniqueZoneObjectIds = Array.from(new Set(zoneObjectIds))

    const ticketsResponse = await client
      .from('object_tickets')
      .select('id', { count: 'exact', head: true })
      .in('zone_object_id', uniqueZoneObjectIds)
      .eq('assignee_id', userId)
      .neq('status', 'done')

    if (ticketsResponse.error) {
      console.error('❌ Fallback: failed to count tickets for assigned ticket count', ticketsResponse.error)
      return 0
    }

    return ticketsResponse.count ?? 0
  } catch (error) {
    console.error('❌ Fallback: exception while counting assigned tickets', error)
    return 0
  }
}

export const getUserAssignedTicketsCount = async (projectId: string, userId: string): Promise<number> => {
  console.log('🔍 getUserAssignedTicketsCount called with:', { projectId, userId })

  if (!isSupabaseConfigured()) {
    console.warn('❌ Supabase not configured, returning 0')
    return 0
  }

  try {
    console.log('📡 Calling RPC function get_user_assigned_tickets_count...')
    const { data, error } = await supabase.rpc('get_user_assigned_tickets_count', {
      project_uuid: projectId,
      user_uuid: userId
    })

    console.log('📡 RPC response:', { data, error })

    if (!error && typeof data === 'number') {
      console.log('✅ Successfully got assigned tickets count via RPC:', data)
      return data ?? 0
    }

    if (error && isRpcMissingError(error)) {
      if (!assignedTicketsRpcWarningLogged) {
        console.warn('📡 RPC function get_user_assigned_tickets_count unavailable, using SQL fallback')
        assignedTicketsRpcWarningLogged = true
      }
      return await getAssignedTicketsFallback(projectId, userId)
    }

    if (error) {
      console.error('❌ Error getting user assigned tickets count via RPC:', error)
      if (!assignedTicketsFallbackWarningLogged) {
        console.warn('📡 Falling back to client-side count for assigned tickets')
        assignedTicketsFallbackWarningLogged = true
      }
      return await getAssignedTicketsFallback(projectId, userId)
    }

    // Unexpected RPC payload, fallback to client-side computation
    return await getAssignedTicketsFallback(projectId, userId)
  } catch (err) {
    console.error('❌ Exception getting user assigned tickets count:', err)
    if (!assignedTicketsFallbackWarningLogged) {
      console.warn('📡 Falling back to client-side count for assigned tickets after exception')
      assignedTicketsFallbackWarningLogged = true
    }
    return await getAssignedTicketsFallback(projectId, userId)
  }
}
