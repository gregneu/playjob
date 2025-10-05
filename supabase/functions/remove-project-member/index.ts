import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[remove-project-member] Missing Supabase configuration')
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing bearer token', { status: 401, headers: corsHeaders })
    }

    const jwt = authHeader.replace('Bearer ', '')
    const {
      data: { user }
    } = await supabase.auth.getUser(jwt)

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { projectId, targetUserId, inviteEmail } = await req.json()

    if (!projectId) {
      return new Response('Missing projectId', { status: 400, headers: corsHeaders })
    }

    if (!targetUserId && !inviteEmail) {
      return new Response('Missing target identifier', { status: 400, headers: corsHeaders })
    }

    if (targetUserId) {
      const { error } = await supabase.rpc('remove_project_member', {
        p_project_id: projectId,
        p_target_user_id: targetUserId,
        p_requested_by: user.id
      })

      if (error) {
        console.error('[remove-project-member] remove_project_member error', error)
        return new Response(JSON.stringify({ error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
    } else if (inviteEmail) {
      const { error } = await supabase.rpc('remove_project_invite', {
        p_project_id: projectId,
        p_invitee_email: inviteEmail,
        p_requested_by: user.id
      })

      if (error) {
        console.error('[remove-project-member] remove_project_invite error', error)
        return new Response(JSON.stringify({ error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (error) {
    console.error('[remove-project-member] unexpected error', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})
