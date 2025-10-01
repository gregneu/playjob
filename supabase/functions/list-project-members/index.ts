import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Missing bearer token', { status: 401, headers: corsHeaders })

    const jwt = authHeader.replace('Bearer ', '')
    const {
      data: { user }
    } = await supabase.auth.getUser(jwt)

    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { projectId } = await req.json()
    if (!projectId) return new Response('Missing projectId', { status: 400, headers: corsHeaders })

    const { data: membership, error: membershipError } = await supabase
      .from('project_memberships')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.error('[list-project-members] membershipError', membershipError)
      return new Response('Failed to verify membership', { status: 500, headers: corsHeaders })
    }

    if (!membership) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    const membersPromise = supabase
      .from('project_memberships')
      .select('user_id, role, profiles:profiles(display_name, email)')
      .eq('project_id', projectId)

    const invitesPromise = supabase
      .from('project_invites')
      .select('id, invite_token, invitee_email, role, status, expires_at')
      .eq('project_id', projectId)

    const [{ data: memberRows, error: membersError }, { data: inviteRows, error: invitesError }] = await Promise.all([
      membersPromise,
      invitesPromise
    ])

    if (membersError || invitesError) {
      console.error('[list-project-members] query error', membersError ?? invitesError)
      return new Response('Failed to load team members', { status: 500, headers: corsHeaders })
    }

    const combined = [
      ...((memberRows ?? []).map((row: any) => ({
        invite_id: null,
        invite_token: null,
        member_id: row.user_id,
        display_name: row.profiles?.display_name ?? null,
        email: row.profiles?.email ?? '',
        role: row.role as any,
        status: 'active',
        expires_at: null
      }))),
      ...((inviteRows ?? []).map((row) => ({
        invite_id: row.id,
        invite_token: row.invite_token,
        member_id: null,
        display_name: null,
        email: row.invitee_email,
        role: row.role as any,
        status: row.status as any,
        expires_at: row.expires_at
      })))
    ]

    return new Response(JSON.stringify(combined), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (error) {
    console.error('[list-project-members] unexpected error', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})

