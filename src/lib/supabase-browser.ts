"use client"

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const globalForSupabaseBrowser = globalThis as typeof globalThis & {
  supabaseBrowserClient?: SupabaseClient
}

export const getBrowserClient = () => {
  if (globalForSupabaseBrowser.supabaseBrowserClient) {
    return globalForSupabaseBrowser.supabaseBrowserClient
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are missing')
  }

  const client = createClient(supabaseUrl, supabaseAnonKey)
  globalForSupabaseBrowser.supabaseBrowserClient = client
  return client
}

const getRedirectTo = () => {
  if (typeof window === 'undefined') {
    return undefined
  }

  return `${window.location.origin}/auth/callback`
}

export const getRedirectForDebug = () => getRedirectTo()

export const signInWithGoogle = async () => {
  const supabase = getBrowserClient()
  const redirectTo = getRedirectTo()

  console.log('[Auth] Google sign-in redirectTo:', redirectTo)

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account'
      }
    }
  })

  if (error) {
    throw error
  }
}
