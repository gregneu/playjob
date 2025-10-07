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

const buildInviteEmail = (projectName: string | null | undefined, acceptUrl: string) => {
  const displayName = projectName?.trim() || 'PlayJoob'

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>You’ve been invited to PlayJoob</title>
    <style>
      body {
        background-color: #f9fafb;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
          Roboto, Helvetica, Arial, sans-serif;
        color: #111827;
        margin: 0;
        padding: 40px 16px;
      }
      .container {
        max-width: 440px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        padding: 40px 32px;
        text-align: center;
      }
      .logo {
        width: 48px;
        height: 48px;
        margin-bottom: 24px;
      }
      h2 {
        font-size: 22px;
        font-weight: 600;
        color: #0f172a;
        margin-bottom: 12px;
      }
      p {
        font-size: 15px;
        line-height: 1.6;
        color: #4b5563;
        margin-bottom: 28px;
      }
      .button {
        display: inline-block;
        background-color: #111827;
        color: #ffffff !important;
        padding: 12px 28px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 500;
        font-size: 15px;
      }
      .button:hover {
        background-color: #1f2937;
      }
      .footer {
        margin-top: 32px;
        font-size: 13px;
        color: #9ca3af;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <img
        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik02NC4wMDAxIDhDMzAuNTg5MiA4IDggMzAuNTg5MiA4IDY0QzggOTcuNDEwOCAzMC41ODkyIDEyMCA2NCAxMjBDOTcuNDEwOCAxMjAgMTIwIDk3LjQxMDggMTIwIDY0QzEyMCAzMC41ODkyIDk3LjQxMDggOCA2NC4wMDAxIDhaIiBmaWxsPSIjMTExODI3Ii8+CjxwYXRoIGQ9Ik01Ni4zNDA1IDg3LjAzNjZMMTguMzc0MyA1MC4xNDI2TDI5LjYyOTMgMzguOTI3N0w1Ni4zNDA1IDY1LjU5ODlMOTguMzI1MyAyMi45MDE0TDExMC4yOTcgMzQuODczMUw1Ni4zNDA1IDg3LjAzNjZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4="
        alt="PlayJoob"
        class="logo"
      />

      <h2>You’ve been invited to PlayJoob</h2>

      <p>
        Someone invited you to join the project <strong>${displayName}</strong> on <strong>PlayJoob</strong>.
        Click the button below to accept your invitation and get started.
      </p>

      <a href="${acceptUrl}" class="button">Accept invitation</a>

      <div class="footer">
        This invitation link will expire in 7 days.<br />
        If you weren’t expecting this email, you can safely ignore it.
      </div>
    </div>
  </body>
</html>`
}

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
      const displayProjectName = inviteRecord.project_name ?? 'PlayJoob'
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
          subject: `You’ve been invited to ${displayProjectName}`,
          html: buildInviteEmail(inviteRecord.project_name, acceptUrl),
          text: `You have been invited to join the project ${displayProjectName} on PlayJoob. Accept the invitation: ${acceptUrl}`
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
