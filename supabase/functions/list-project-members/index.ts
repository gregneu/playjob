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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

type NormalizedRole = 'viewer' | 'editor' | 'admin' | 'owner'

interface NormalizedProfile {
  full_name: string | null
  email: string | null
}

interface NormalizedMemberRow {
  id: string
  user_id: string | null
  role: NormalizedRole
  created_at: string | null
  profiles: NormalizedProfile
}

interface NormalizedInviteRow {
  id: string
  invitee_email: string | null
  role: NormalizedRole
  status: 'pending'
  created_at: string | null
}

const normalizeRole = (role: string | null | undefined): NormalizedRole => {
  const value = (role ?? '').toLowerCase()
  switch (value) {
    case 'owner':
      return 'owner'
    case 'admin':
      return 'admin'
    case 'viewer':
      return 'viewer'
    case 'editor':
      return 'editor'
    case 'member':
      return 'editor'
    default:
      return 'viewer'
  }
}

const isMissingRelationError = (error: unknown, relation: string) => {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { message?: string; details?: string }
  const message = candidate.message?.toLowerCase() ?? ''
  const details = candidate.details?.toLowerCase() ?? ''
  const relationSignature = `relation "${relation.toLowerCase()}"`
  return message.includes(`${relationSignature} does not exist`) || details.includes(`${relationSignature}`)
}

const fetchLegacyMemberDataset = async (projectId: string): Promise<{ memberRows: NormalizedMemberRow[]; inviteRows: NormalizedInviteRow[] }> => {
  console.warn('[list-project-members] Falling back to legacy project_members/project_invitations tables')

  const { data: legacyMembers, error: legacyMembersError } = await supabase
    .from('project_members')
    .select('id, user_id, role, status, invited_at, joined_at')
    .eq('project_id', projectId)

  if (legacyMembersError) {
    throw legacyMembersError
  }

  const acceptedMembers = (legacyMembers ?? []).filter((row) => {
    const normalizedRole = normalizeRole(row.role)
    const status = (row.status ?? '').toLowerCase()
    return normalizedRole === 'owner' || status === 'accepted'
  })

  const memberUserIds = Array.from(new Set(acceptedMembers
    .map((row) => row.user_id)
    .filter((id): id is string => Boolean(id))))

  const profileMap = new Map<string, NormalizedProfile>()

  if (memberUserIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', memberUserIds)

    if (profileError) {
      console.error('[list-project-members] legacy profile fetch error', profileError)
    } else {
      for (const profile of profileRows ?? []) {
        if (profile?.id) {
          profileMap.set(profile.id, {
            full_name: profile.full_name ?? null,
            email: profile.email ?? null
          })
        }
      }
    }
  }

  const memberRows: NormalizedMemberRow[] = acceptedMembers.map((row) => {
    const profile = profileMap.get(row.user_id ?? '') ?? { full_name: null, email: null }
    return {
      id: row.id,
      user_id: row.user_id ?? null,
      role: normalizeRole(row.role),
      created_at: row.joined_at ?? row.invited_at ?? new Date().toISOString(),
      profiles: profile
    }
  })

  const { data: legacyInvites, error: legacyInvitesError } = await supabase
    .from('project_invitations')
    .select('id, email, role, status, invited_at')
    .eq('project_id', projectId)

  if (legacyInvitesError) {
    if (isMissingRelationError(legacyInvitesError, 'project_invitations')) {
      console.warn('[list-project-members] legacy project_invitations table missing, skipping invites fallback')
      return { memberRows, inviteRows: [] }
    }
    throw legacyInvitesError
  }

  const inviteRows: NormalizedInviteRow[] = (legacyInvites ?? [])
    .filter((row) => (row.status ?? '').toLowerCase() === 'pending')
    .map((row) => ({
      id: row.id,
      invitee_email: (row.email ?? '').trim() || null,
      role: normalizeRole(row.role),
      status: 'pending' as const,
      created_at: row.invited_at ?? new Date().toISOString()
    }))

  return { memberRows, inviteRows }
}

const fetchMemberDataset = async (projectId: string): Promise<{ memberRows: NormalizedMemberRow[]; inviteRows: NormalizedInviteRow[] }> => {
  const [{ data: memberRowsRaw, error: membersError }, { data: inviteRowsRaw, error: invitesError }] = await Promise.all([
    supabase
      .from('project_memberships')
      .select('id, user_id, role, created_at, profiles:profiles(full_name, email)')
      .eq('project_id', projectId),
    supabase
      .from('project_invites')
      .select('id, invitee_email, role, status, created_at')
      .eq('project_id', projectId)
      .eq('status', 'pending')
  ])

  if (!membersError && !invitesError) {
    const memberRows: NormalizedMemberRow[] = (memberRowsRaw ?? []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id ?? null,
      role: normalizeRole(row.role),
      created_at: row.created_at ?? new Date().toISOString(),
      profiles: {
        full_name: row.profiles?.full_name ?? null,
        email: row.profiles?.email ?? null
      }
    }))

    const inviteRows: NormalizedInviteRow[] = (inviteRowsRaw ?? []).map((row: any) => ({
      id: row.id,
      invitee_email: (row.invitee_email ?? '').trim() || null,
      role: normalizeRole(row.role),
      status: 'pending',
      created_at: row.created_at ?? new Date().toISOString()
    }))

    return { memberRows, inviteRows }
  }

  if (isMissingRelationError(membersError, 'project_memberships') || isMissingRelationError(invitesError, 'project_invites')) {
    return await fetchLegacyMemberDataset(projectId)
  }

  throw membersError ?? invitesError ?? new Error('Failed to load project members or invites')
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

    const { data: projectRow, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id, created_at')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError) {
      console.error('[list-project-members] projectError', projectError)
      return new Response('Failed to load project', { status: 500, headers: corsHeaders })
    }

    if (!projectRow) {
      return new Response('Project not found', { status: 404, headers: corsHeaders })
    }

    // Resolve member profile id (project_memberships links to profiles)
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[list-project-members] profileError', profileError)
      return new Response('Failed to resolve profile', { status: 500, headers: corsHeaders })
    }

    let profileId = profileRow?.id ?? null

    if (!profileId && user.email) {
      const { data: profileByEmail, error: profileByEmailError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email.toLowerCase())
        .maybeSingle()

      if (profileByEmailError) {
        console.error('[list-project-members] profileByEmailError', profileByEmailError)
        return new Response('Failed to resolve profile', { status: 500, headers: corsHeaders })
      }

      profileId = profileByEmail?.id ?? null
    }

    // Fall back to auth.users identifier when profile record is missing.
    // Older data stored members against auth user IDs instead of profile IDs.
    if (!profileId) {
      console.warn('[list-project-members] profile missing for user, falling back to auth id', user.id)
      profileId = user.id
    }

    const candidateUserIds = Array.from(
      new Set([profileId, user.id].filter((value): value is string => Boolean(value)))
    )

    let membership: { user_id: string; role: NormalizedRole } | null = null
    let membershipError: unknown = null

    if (candidateUserIds.length > 0) {
      const query = supabase
        .from('project_memberships')
        .select('user_id, role')
        .eq('project_id', projectId)

      const finalQuery = candidateUserIds.length === 1
        ? query.eq('user_id', candidateUserIds[0])
        : query.in('user_id', candidateUserIds)

      const { data: membershipRows, error } = await finalQuery
      membershipError = error
      const membershipRow = membershipRows?.[0] ?? null
      if (membershipRow) {
        membership = {
          user_id: membershipRow.user_id,
          role: normalizeRole(membershipRow.role)
        }
      }
    }

    if (membershipError && isMissingRelationError(membershipError, 'project_memberships')) {
      const legacyQuery = supabase
        .from('project_members')
        .select('user_id, role, status')
        .eq('project_id', projectId)

      const finalLegacyQuery = candidateUserIds.length === 1
        ? legacyQuery.eq('user_id', candidateUserIds[0])
        : legacyQuery.in('user_id', candidateUserIds)

      const { data: legacyMembershipRows, error: legacyMembershipError } = await finalLegacyQuery

      if (legacyMembershipError) {
        console.error('[list-project-members] legacyMembershipError', legacyMembershipError)
        return new Response('Failed to verify membership', { status: 500, headers: corsHeaders })
      }

      const acceptedLegacyMembership = (legacyMembershipRows ?? []).find((row: any) => {
        const normalizedRole = normalizeRole(row.role)
        const status = (row.status ?? '').toLowerCase()
        return normalizedRole === 'owner' || status === 'accepted'
      })

      membership = acceptedLegacyMembership
        ? { user_id: acceptedLegacyMembership.user_id, role: normalizeRole(acceptedLegacyMembership.role) }
        : null
      membershipError = null
    }

    if (membershipError) {
      console.error('[list-project-members] membershipError', membershipError)
      return new Response('Failed to verify membership', { status: 500, headers: corsHeaders })
    }

    const ownerId = projectRow.owner_id ?? (projectRow as any).created_by ?? null
    const isOwner = ownerId !== null && candidateUserIds.includes(ownerId)

    if (!membership && !isOwner) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    let memberRows: NormalizedMemberRow[] = []
    let inviteRows: NormalizedInviteRow[] = []

    try {
      const datasets = await fetchMemberDataset(projectId)
      memberRows = datasets.memberRows
      inviteRows = datasets.inviteRows
    } catch (datasetError) {
      console.error('[list-project-members] query error', datasetError)
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

    for (const row of memberRows) {
      const email = row.profiles.email ?? ''
      const emailLower = email.trim().toLowerCase()
      if (emailLower) {
        membershipEmails.add(emailLower)
      }
      if (row.role === 'owner') {
        ownerPresent = true
      }

      result.push({
        id: `member_${row.id}`,
        membership_id: row.id ?? null,
        invite_id: null,
        user_id: row.user_id ?? null,
        display_name: row.profiles.full_name ?? null,
        email,
        role: row.role,
        status: 'member',
        created_at: row.created_at ?? new Date().toISOString(),
        source: 'membership'
      })
    }

    if (!ownerPresent) {
      console.warn(`[list-project-members] Owner membership missing for project ${projectId}, synthesizing fallback row`)
      let fallbackEmail = ''
      let fallbackName: string | null = null

      if (ownerId) {
        const { data: ownerProfile, error: ownerProfileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', ownerId)
          .maybeSingle()

        if (ownerProfileError) {
          console.error('[list-project-members] ownerProfileError', ownerProfileError)
        }

        fallbackEmail = ownerProfile?.email ?? ''
        fallbackName = ownerProfile?.full_name ?? null
      }

      const { data: membershipOwner } = await supabase
        .from('project_memberships')
        .select('id, user_id, created_at, profiles:profiles(full_name, email)')
        .eq('project_id', projectId)
        .eq('role', 'owner')
        .maybeSingle()

      if (membershipOwner) {
        fallbackEmail = membershipOwner.profiles?.email ?? fallbackEmail
        fallbackName = membershipOwner.profiles?.full_name ?? fallbackName
      }

      const fallbackEmailLower = fallbackEmail.trim().toLowerCase()
      if (fallbackEmailLower) {
        membershipEmails.add(fallbackEmailLower)
      }

      result.push({
        id: `owner_${ownerId ?? membershipOwner?.user_id ?? 'unknown'}`,
        membership_id: membershipOwner?.id ?? null,
        invite_id: null,
        user_id: membershipOwner?.user_id ?? ownerId ?? null,
        display_name: fallbackName ?? 'Owner',
        email: fallbackEmail || 'owner@unknown.local',
        role: 'owner',
        status: 'member',
        created_at: membershipOwner?.created_at ?? projectRow.created_at ?? new Date().toISOString(),
        source: 'synthetic_owner'
      })
      ownerPresent = true
    }

    for (const row of inviteRows) {
      const email = (row.invitee_email ?? '').trim()
      const emailLower = email.toLowerCase()

      if (emailLower && membershipEmails.has(emailLower)) {
        continue
      }

      result.push({
        id: `invite_${row.id}`,
        membership_id: null,
        invite_id: row.id,
        user_id: null,
        display_name: null,
        email,
        role: row.role,
        status: 'invited',
        created_at: row.created_at ?? new Date().toISOString(),
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
