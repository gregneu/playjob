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

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Missing bearer token', { status: 401 })

    const jwt = authHeader.replace('Bearer ', '')
    const {
      data: { user }
    } = await supabase.auth.getUser(jwt)

    if (!user) return new Response('Unauthorized', { status: 401 })

    const { projectId } = await req.json()
    if (!projectId) return new Response('Missing projectId', { status: 400 })

    const { data: membership, error: membershipError } = await supabase
      .from('project_memberships')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.error('[list-project-members] membershipError', membershipError)
      return new Response('Failed to verify membership', { status: 500 })
    }

    if (!membership) {
      return new Response('Forbidden', { status: 403 })
    }

    const { data, error } = await supabase
      .from('project_member_overview')
      .select('*')
      .eq('project_id', projectId)
      .order('status', { ascending: false })

    if (error) {
      console.error('[list-project-members] query error', error)
      return new Response('Failed to load team members', { status: 500 })
    }

    return new Response(JSON.stringify(data ?? []), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[list-project-members] unexpected error', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

