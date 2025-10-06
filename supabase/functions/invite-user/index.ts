import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const INVITE_BASE_URL = (Deno.env.get('INVITE_BASE_URL') ?? 'https://playjoob.com').replace(/\/$/, '')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'PlayJoob <invitations@playjoob.com>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase configuration in Edge Function environment')
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false }
})

const buildInviteEmail = (projectName: string, acceptUrl: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Inter, Arial, sans-serif; background: #f3f4f6; padding: 32px;">
    <tr>
      <td align="center">
        <table width="560" style="background:#ffffff;border-radius:16px;padding:40px;text-align:left;">
          <tr>
            <td>
              <img src="https://playjoob.com/assets/mail-logo.png" alt="PlayJoob" width="72" height="72" style="display:block;margin-bottom:24px;" />
              <h1 style="font-size:24px;margin:0 0 16px;color:#17162B;">You’ve been invited to ${projectName}</h1>
              <p style="font-size:16px;line-height:1.5;color:#4b5563;">Collaborate with your team in PlayJoob. Use the button below to accept the invitation.</p>
              <p style="margin:32px 0;">
                <a href="${acceptUrl}" style="display:inline-block;background:#17162B;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-weight:600;">Accept invitation</a>
              </p>
              <p style="font-size:14px;color:#6b7280;">This invitation expires in 7 days.</p>
              <p style="font-size:14px;color:#9ca3af;margin-top:32px;">If you did not expect this invitation, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    console.log('[invite-user] env snapshot', {
      hasApiKey: !!RESEND_API_KEY,
      from: RESEND_FROM_EMAIL,
      baseUrl: INVITE_BASE_URL,
      hasServiceRole: !!SUPABASE_SERVICE_ROLE_KEY
    })

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

    const { projectId, email, role } = await req.json()

    if (!projectId || !email || !role) {
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return new Response('Invalid role', { status: 400, headers: corsHeaders })
    }

    const { data: membership, error: membershipError } = await supabase
      .from('project_memberships')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.error('[invite-user] membershipError', membershipError)
      return new Response('Failed to verify permissions', { status: 500, headers: corsHeaders })
    }

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    const { data: inviteDataRaw, error: inviteError } = await supabase.rpc('create_project_invite', {
      p_project_id: projectId,
      p_inviter_id: user.id,
      p_invitee_email: email,
      p_role: role
    })

    if (inviteError) {
      console.error('[invite-user] inviteError', inviteError)
      return new Response(JSON.stringify({ error: inviteError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const inviteRecord = Array.isArray(inviteDataRaw) ? inviteDataRaw[0] : inviteDataRaw

    if (!inviteRecord) {
      console.error('[invite-user] inviteData missing after RPC', inviteDataRaw)
      return new Response(JSON.stringify({ error: 'Invite data missing from RPC response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (RESEND_API_KEY) {
      const acceptUrl = `${INVITE_BASE_URL}/invite/${inviteRecord.invite_token}`
      console.log('[invite-user] Ready to send via Resend', {
        hasApiKey: !!RESEND_API_KEY,
        from: RESEND_FROM_EMAIL,
        to: email,
        acceptUrl
      })

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: email,
          subject: `You’ve been invited to ${inviteRecord.project_name ?? 'PlayJoob'}`,
          html: `<p>You have been invited to join ${inviteRecord.project_name ?? 'PlayJoob'}</p><a href="${acceptUrl}">Accept invitation</a>`
        })
      })

      console.log('[invite-user] Resend response', resendResponse.status, await resendResponse.clone().text())

      if (!resendResponse.ok) {
        const body = await resendResponse.text()
        console.error('[invite-user] Resend error', resendResponse.status, body)
        return new Response(
          JSON.stringify({
            error: 'ResendError',
            status: resendResponse.status,
            body
          }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        )
      }
    }

    return new Response(JSON.stringify(inviteRecord), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 201
    })
  } catch (error) {
    console.error('[invite-user] unexpected error', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})
