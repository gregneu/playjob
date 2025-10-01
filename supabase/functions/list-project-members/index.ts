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

    const { data: projectRow, error: projectError } = await supabase
      .from('projects')
      .select('id, created_by, created_at')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) {
      console.error('[list-project-members] projectError', projectError)
      return new Response('Failed to load project', { status: 500, headers: corsHeaders })
    }

    if (!projectRow) {
      return new Response('Project not found', { status: 404, headers: corsHeaders })
    }

    const [{ data: memberRows, error: membersError }, { data: inviteRows, error: invitesError }] = await Promise.all([
      supabase
        .from('project_memberships')
        .select('id, user_id, role, created_at, profiles:profiles(display_name, email)')
        .eq('project_id', projectId),
      supabase
        .from('project_invites')
        .select('id, invitee_email, role, status, created_at')
        .eq('project_id', projectId)
    ])

    if (membersError || invitesError) {
      console.error('[list-project-members] query error', membersError ?? invitesError)
      return new Response('Failed to load team members', { status: 500, headers: corsHeaders })
    }

    const membershipEmails = new Set<string>()
    const result: Array<{
      id: string
      membership_id: string | null
      invite_id: string | null
      user_id: string | null
      display_name: string | null
      email: string
      role: string
      status: 'member' | 'invited'
      created_at: string
      source: 'membership' | 'invite' | 'synthetic_owner'
    }> = []

    let ownerPresent = false

    for (const row of memberRows ?? []) {
      const email = (row as any).profiles?.email ?? ''
      const emailLower = email.trim().toLowerCase()
      if (emailLower) {
        membershipEmails.add(emailLower)
      }
      if ((row as any).role === 'owner') {
        ownerPresent = true
      }

      result.push({
        id: `member_${(row as any).id}`,
        membership_id: (row as any).id ?? null,
        invite_id: null,
        user_id: (row as any).user_id ?? null,
        display_name: (row as any).profiles?.display_name ?? null,
        email,
        role: (row as any).role,
        status: 'member',
        created_at: (row as any).created_at ?? new Date().toISOString(),
        source: 'membership'
      })
    }

    if (!ownerPresent) {
      console.warn(`[list-project-members] Owner membership missing for project ${projectId}, synthesizing fallback row`)
      let fallbackEmail = ''
      let fallbackName: string | null = null

      if (projectRow.created_by) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, display_name')
          .eq('id', projectRow.created_by)
          .maybeSingle()

        fallbackEmail = ownerProfile?.email ?? ''
        fallbackName = ownerProfile?.display_name ?? null
      }

      const fallbackEmailLower = fallbackEmail.trim().toLowerCase()
      if (fallbackEmailLower) {
        membershipEmails.add(fallbackEmailLower)
      }

      result.push({
        id: `owner_${projectRow.created_by ?? 'unknown'}`,
        membership_id: null,
        invite_id: null,
        user_id: projectRow.created_by ?? null,
        display_name: fallbackName ?? 'Owner',
        email: fallbackEmail || 'owner@unknown.local',
        role: 'owner',
        status: 'member',
        created_at: projectRow.created_at ?? new Date().toISOString(),
        source: 'synthetic_owner'
      })
      ownerPresent = true
    }

    for (const row of inviteRows ?? []) {
      if ((row as any).status !== 'pending') {
        continue
      }

      const email = ((row as any).invitee_email ?? '').trim()
      const emailLower = email.toLowerCase()

      if (emailLower && membershipEmails.has(emailLower)) {
        continue
      }

      result.push({
        id: `invite_${(row as any).id}`,
        membership_id: null,
        invite_id: (row as any).id,
        user_id: null,
        display_name: null,
        email,
        role: (row as any).role,
        status: 'invited',
        created_at: (row as any).created_at ?? new Date().toISOString(),
        source: 'invite'
      })
    }

    const rolePriority: Record<string, number> = {
      owner: 0,
      admin: 1,
      editor: 2,
      viewer: 3
    }

    const statusPriority: Record<'member' | 'invited', number> = {
      member: 0,
      invited: 1
    }

    result.sort((a, b) => {
      const statusDelta = statusPriority[a.status] - statusPriority[b.status]
      if (statusDelta !== 0) return statusDelta

      const roleDelta = (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99)
      if (roleDelta !== 0) return roleDelta

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    return new Response(
      JSON.stringify({
        members: result,
        missing_owner: !ownerPresent
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  } catch (error) {
    console.error('[list-project-members] unexpected error', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})

