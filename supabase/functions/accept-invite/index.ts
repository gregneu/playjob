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
    if (!authHeader) {
      return new Response('Missing bearer token', { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user }
    } = await supabase.auth.getUser(token)

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { inviteToken } = await req.json()
    if (!inviteToken) {
      return new Response('Missing invite token', { status: 400 })
    }

    const { data, error } = await supabase.rpc('accept_project_invite', {
      p_token: inviteToken,
      p_user_id: user.id
    })

    if (error) {
      console.error('[accept-invite] failure', error)
      return new Response(error.message, { status: 400 })
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[accept-invite] unexpected error', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

