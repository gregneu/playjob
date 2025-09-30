"use client"

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export const getBrowserClient = () => {
  if (cachedClient) {
    return cachedClient
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are missing')
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey)
  return cachedClient
}

const getRedirectTo = () => {
  if (typeof window === 'undefined') {
    return undefined
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5173/auth/callback'
  }

  const origin = window.location.origin.replace(/\/$/, '')
  if (origin === 'https://playjob.vercel.app') {
    return 'https://playjob.vercel.app/auth/callback'
  }

  return `${origin}/auth/callback`
}

export const signInWithGoogle = async () => {
  const supabase = getBrowserClient()
  const redirectTo = getRedirectTo()

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

