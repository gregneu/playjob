import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[verify-project-invite] Missing Supabase environment variables')
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const INVALID_MESSAGE = 'Invite invalid or expired'

type InviteRow = {
  project_id: string
  role: string
  status: string
  expires_at: string | null
  project: { name: string | null } | null
  inviter: { full_name?: string | null; display_name?: string | null; email?: string | null } | null
}

const normalizeInviterName = (inviter: InviteRow['inviter']) => {
  if (!inviter) return null
  return inviter.full_name?.trim()
    || inviter.display_name?.trim()
    || inviter.email?.trim()
    || null
}

const isUuid = (value: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const rawToken = (body?.inviteToken ?? body?.token ?? '').toString().trim()

    console.log('[verify-project-invite] incoming request', { hasBody: !!body, rawToken })

    if (!rawToken) {
      return new Response(JSON.stringify({ error: 'Missing invite token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (!isUuid(rawToken)) {
      console.warn('[verify-project-invite] token failed uuid validation', { rawToken })
      return new Response(JSON.stringify({ error: INVALID_MESSAGE }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const { data: inviteData, error: inviteError } = await supabase
      .from('project_invites')
      .select(`
        project_id,
        role,
        status,
        expires_at,
        project:projects(name),
        inviter:profiles!project_invites_inviter_id_fkey(full_name, display_name, email)
      `)
      .eq('invite_token', rawToken)
      .maybeSingle()

    if (inviteError) {
      console.error('[verify-project-invite] Supabase query failed', inviteError)
      return new Response(JSON.stringify({ error: INVALID_MESSAGE }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (!inviteData) {
      console.warn('[verify-project-invite] invite not found', { rawToken })
      return new Response(JSON.stringify({ error: INVALID_MESSAGE }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const inviteRow = inviteData as InviteRow
    console.log('[verify-project-invite] invite loaded', {
      project_id: inviteRow.project_id,
      status: inviteRow.status,
      expires_at: inviteRow.expires_at,
      project_name: inviteRow.project?.name ?? null
    })

    const expiresAt = inviteRow.expires_at ? new Date(inviteRow.expires_at) : null
    const now = new Date()
    const isExpired = expiresAt !== null && expiresAt.getTime() < now.getTime()

    if (inviteRow.status !== 'pending' || isExpired) {
      console.warn('[verify-project-invite] invite unusable', {
        status: inviteRow.status,
        isExpired,
        expires_at: inviteRow.expires_at,
        now: now.toISOString()
      })
      if (inviteRow.status === 'pending' && isExpired) {
        const { error: expireError } = await supabase
          .from('project_invites')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('invite_token', rawToken)

        if (expireError) {
          console.warn('[verify-project-invite] Failed to mark invite expired', expireError)
        }
      }

      return new Response(JSON.stringify({ error: INVALID_MESSAGE }), {
        status: 410,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const payload = {
      token: rawToken,
      project_id: inviteRow.project_id,
      project_name: inviteRow.project?.name ?? null,
      inviter_name: normalizeInviterName(inviteRow.inviter),
      role: inviteRow.role,
      expires_at: inviteRow.expires_at
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (error) {
    console.error('[verify-project-invite] Unexpected error', error)
    return new Response(JSON.stringify({ error: INVALID_MESSAGE }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
