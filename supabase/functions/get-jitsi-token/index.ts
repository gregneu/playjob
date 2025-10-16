import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode, decode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

// JWT implementation using Web Crypto API
class JWT {
  private static base64UrlEncode(data: ArrayBuffer): string {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(data)))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  private static base64UrlDecode(str: string): ArrayBuffer {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
    const binary = atob(padded)
    return new Uint8Array(binary.split('').map(c => c.charCodeAt(0))).buffer
  }

  static async sign(payload: any, privateKey: string, keyId: string): Promise<string> {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: keyId
    }

    const encodedHeader = this.base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))
    const encodedPayload = this.base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))

    const data = `${encodedHeader}.${encodedPayload}`
    const dataBuffer = new TextEncoder().encode(data)

    // Import the private key
    const keyData = this.base64UrlDecode(privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ''))
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, dataBuffer)
    const encodedSignature = this.base64UrlEncode(signature)

    return `${data}.${encodedSignature}`
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
      },
    })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Get environment variables
    const appId = Deno.env.get('JITSI_APP_ID')
    const privateKey = Deno.env.get('JITSI_PRIVATE_KEY')
    const keyId = Deno.env.get('JITSI_KEY_ID') || 'SAMPLE_KEY_ID' // You can set this in your environment

    if (!appId || !privateKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Jitsi private key or App ID' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: "*",
      iat: now,
      exp: now + (2 * 60 * 60), // 2 hours
      nbf: now - 60, // 1 minute before now
      context: {
        user: {
          name: user.user_metadata?.full_name || user.email || 'Guest',
          email: user.email,
          moderator: true
        },
        features: {
          livestreaming: true,
          "file-upload": true,
          "outbound-call": true,
          "sip-outbound-call": false,
          transcription: true,
          "recording": true,
          "screen-sharing": true
        }
      }
    }

    // Sign the JWT
    const fullKeyId = `${appId}/${keyId}`
    const token = await JWT.sign(payload, privateKey, fullKeyId)

    return new Response(
      JSON.stringify({ token }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('Error generating Jitsi token:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
