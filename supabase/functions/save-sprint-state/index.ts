import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[save-sprint-state] Missing Supabase environment variables')
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') ?? '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, X-Client-Info, apikey, content-type, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  }
}

type SprintStatus = 'draft' | 'active' | 'completed'

interface SaveSprintStatePayload {
  sprintId?: string | null
  projectId: string
  zoneObjectId?: string | null
  name?: string
  weeks?: number
  plannedTicketIds?: string[]
  doneTicketIds?: string[]
  status?: SprintStatus
  startedAt?: string | null
  finishedAt?: string | null
}

const errorResponse = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(req)
    }
  })

const okResponse = (req: Request, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(req)
    }
  })

const isNil = (value: unknown): value is null | undefined => value === null || typeof value === 'undefined'

const ensureProjectMembership = async (client: SupabaseClient, projectId: string, userId: string) => {
  const { count, error } = await client
    .from('project_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) {
    console.error('[save-sprint-state] membership lookup error', error)
    throw error
  }

  if ((count ?? 0) === 0) {
    throw new Error('not_project_member')
  }
}

const loadExistingSprint = async (projectId: string, zoneObjectId: string | null | undefined) => {
  if (!zoneObjectId) return null
  const { data, error } = await supabase
    .from('sprints')
    .select('id')
    .eq('project_id', projectId)
    .eq('zone_object_id', zoneObjectId)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw error
  }

  if (Array.isArray(data) && data.length > 0) {
    return data[0]
  }

  return null
}

const updateSprintRecord = async (params: SaveSprintStatePayload, targetId: string) => {
  const nowIso = new Date().toISOString()
  const updates: Record<string, unknown> = {
    updated_at: nowIso
  }

  if (!isNil(params.name)) updates.name = params.name
  if (!isNil(params.weeks)) updates.weeks = params.weeks
  if (!isNil(params.plannedTicketIds)) updates.planned_ticket_ids = params.plannedTicketIds
  if (!isNil(params.doneTicketIds)) updates.done_ticket_ids = params.doneTicketIds
  if (!isNil(params.zoneObjectId)) updates.zone_object_id = params.zoneObjectId

  const applyStatus = params.status
  if (applyStatus) {
    updates.status = applyStatus
    if (applyStatus === 'active') {
      updates.started_at = params.startedAt ?? nowIso
    } else if (applyStatus === 'completed') {
      updates.ended_at = params.finishedAt ?? nowIso
    } else {
      if (!isNil(params.startedAt)) updates.started_at = params.startedAt
      if (!isNil(params.finishedAt)) updates.ended_at = params.finishedAt
    }
  } else {
    if (!isNil(params.startedAt)) updates.started_at = params.startedAt
    if (!isNil(params.finishedAt)) updates.ended_at = params.finishedAt
  }

  const { data, error } = await supabase
    .from('sprints')
    .update(updates)
    .eq('id', targetId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

const insertSprintRecord = async (params: SaveSprintStatePayload, userId: string) => {
  const nowIso = new Date().toISOString()
  const recordStatus: SprintStatus = params.status ?? 'draft'

  const payload = {
    project_id: params.projectId,
    zone_object_id: params.zoneObjectId ?? null,
    name: params.name ?? 'Sprint',
    weeks: params.weeks ?? 2,
    status: recordStatus,
    planned_ticket_ids: params.plannedTicketIds ?? [],
    done_ticket_ids: params.doneTicketIds ?? [],
    started_at: recordStatus === 'active'
      ? (params.startedAt ?? nowIso)
      : (params.startedAt ?? null),
    ended_at: recordStatus === 'completed'
      ? (params.finishedAt ?? nowIso)
      : (params.finishedAt ?? null),
    created_by: userId,
    created_at: nowIso,
    updated_at: nowIso
  }

  const { data, error } = await supabase
    .from('sprints')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 405, { error: 'method_not_allowed' })
  }

  try {
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return errorResponse(req, 401, { error: 'missing_token' })
    }

    const token = authHeader.slice('bearer '.length)
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user?.id) {
      return errorResponse(req, 401, { error: 'invalid_token' })
    }

    const body = await req.json() as { params?: SaveSprintStatePayload }
    const params = body?.params
    if (!params || !params.projectId) {
      return errorResponse(req, 400, { error: 'invalid_payload' })
    }

    await ensureProjectMembership(supabase, params.projectId, userData.user.id)

    let targetId = params.sprintId ?? null
    if (!targetId) {
      const existing = await loadExistingSprint(params.projectId, params.zoneObjectId ?? null)
      if (existing?.id) {
        targetId = existing.id
      }
    }

    const result = targetId
      ? await updateSprintRecord(params, targetId)
      : await insertSprintRecord(params, userData.user.id)

    return okResponse(req, { data: result })
  } catch (err) {
    console.error('[save-sprint-state] unexpected error', err)
    const message = err instanceof Error ? err.message : 'unknown_error'
    if (message === 'not_project_member') {
      return errorResponse(req, 403, { error: 'forbidden' })
    }
    return errorResponse(req, 500, { error: message })
  }
})
