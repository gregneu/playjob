import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { getBrowserClient, signInWithGoogle } from '@/lib/supabase-browser'

const INVALID_INVITE_MESSAGE = 'This invitation is invalid or has expired.'
const TOAST_INVALID_MESSAGE = 'Invite invalid or already used.'
const INVITE_STORAGE_KEY = 'playjoob.pendingInvite'

type Step = 'loading' | 'needs-auth' | 'ready' | 'accepting' | 'accepted' | 'error'

interface InviteRouteProps {
  currentUser: User | null
}

interface InviteDetails {
  token: string
  projectName: string
  projectId?: string | null
  inviterName?: string | null
  role?: string | null
}

interface VerifyResponse {
  project_id?: string
  projectId?: string
  project_name?: string
  projectName?: string
  inviter_name?: string | null
  inviterName?: string | null
  role?: string | null
}

interface AcceptResponse {
  project_id?: string
  projectId?: string
  project_name?: string
  projectName?: string
  role?: string | null
}

const parseInviteDetails = (token: string, payload: VerifyResponse): InviteDetails => {
  const projectName = payload.project_name ?? payload.projectName

  if (!projectName) {
    throw new Error(INVALID_INVITE_MESSAGE)
  }

  return {
    token,
    projectName,
    projectId: payload.project_id ?? payload.projectId ?? null,
    inviterName: payload.inviter_name ?? payload.inviterName ?? null,
    role: payload.role ?? null
  }
}

const readStoredInvite = (expectedToken: string): InviteDetails | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(INVITE_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as InviteDetails | null

    if (!parsed || parsed.token !== expectedToken) {
      return null
    }

    return parsed
  } catch (error) {
    console.warn('[InviteRoute] Failed to parse stored invite', error)
    return null
  }
}

const persistInvite = (details: InviteDetails) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(details))
  } catch (error) {
    console.warn('[InviteRoute] Failed to persist invite', error)
  }
}

const clearStoredInvite = () => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(INVITE_STORAGE_KEY)
  } catch (error) {
    console.warn('[InviteRoute] Failed to clear stored invite', error)
  }
}

const parseJsonSafely = (text: string) => {
  try {
    return JSON.parse(text)
  } catch (_error) {
    return null
  }
}

const fetchInviteViaApi = async (token: string): Promise<VerifyResponse> => {
  const response = await fetch(`/api/invites/verify?token=${encodeURIComponent(token)}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  })

  const text = await response.text()

  if (!response.ok) {
    const payload = parseJsonSafely(text)
    const message = typeof payload?.error === 'string' ? payload.error : text || INVALID_INVITE_MESSAGE
    throw new Error(message)
  }

  const payload = parseJsonSafely(text)
  return (payload ?? {}) as VerifyResponse
}

const verifyViaSupabase = async (client: SupabaseClient, token: string): Promise<VerifyResponse> => {
  const { data, error } = await client.functions.invoke('verify-project-invite', {
    body: { inviteToken: token }
  })

  if (error) {
    throw new Error(error.message || INVALID_INVITE_MESSAGE)
  }

  if (!data) {
    throw new Error(INVALID_INVITE_MESSAGE)
  }

  const payload = Array.isArray(data) ? data[0] : data
  return (payload ?? {}) as VerifyResponse
}

const acceptViaApi = async (accessToken: string, token: string): Promise<AcceptResponse> => {
  const response = await fetch('/api/invites/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ token, inviteToken: token })
  })

  const text = await response.text()

  if (!response.ok) {
    const payload = parseJsonSafely(text)
    const message = typeof payload?.error === 'string' ? payload.error : text || TOAST_INVALID_MESSAGE
    throw new Error(message)
  }

  const payload = parseJsonSafely(text)
  return (payload ?? {}) as AcceptResponse
}

const acceptViaSupabaseFunction = async (client: SupabaseClient, token: string): Promise<AcceptResponse> => {
  const { data, error } = await client.functions.invoke('accept-invite', {
    body: { inviteToken: token }
  })

  if (error) {
    throw new Error(error.message || TOAST_INVALID_MESSAGE)
  }

  const payload = Array.isArray(data) ? data[0] : data
  return (payload ?? {}) as AcceptResponse
}

const acceptViaRpc = async (client: SupabaseClient, token: string, userId: string): Promise<AcceptResponse> => {
  const { data, error } = await client.rpc('accept_project_invite', {
    p_token: token,
    p_user_id: userId
  })

  if (error) {
    throw new Error(error.message || TOAST_INVALID_MESSAGE)
  }

  if (!data) {
    throw new Error(TOAST_INVALID_MESSAGE)
  }

  const payload = Array.isArray(data) ? data[0] : data

  if (!payload) {
    throw new Error(TOAST_INVALID_MESSAGE)
  }

  return payload as AcceptResponse
}

export default function InviteRoute({ currentUser }: InviteRouteProps) {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const supabase = useMemo(() => getBrowserClient(), [])

  const [step, setStep] = useState<Step>('loading')
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null)
  const [errorMessage, setErrorMessage] = useState(INVALID_INVITE_MESSAGE)
  const [emailMode, setEmailMode] = useState(false)
  const [emailAuthMode, setEmailAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [emailAuthError, setEmailAuthError] = useState<string | null>(null)
  const [emailAuthLoading, setEmailAuthLoading] = useState(false)
  const autoAcceptTriggered = useRef(false)
  const authSnapshot = useRef<User | null>(currentUser)

  useEffect(() => {
    authSnapshot.current = currentUser
  }, [currentUser])

  const projectLabel = inviteDetails?.projectName ?? 'this project'
  const inviterLabel = inviteDetails?.inviterName?.trim() || null

  const handleAccept = useCallback(async (auto = false) => {
    if (!token) {
      setStep('error')
      setErrorMessage('Invite token is missing.')
      return
    }

    setStep('accepting')

    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      const userId = session?.user?.id ?? currentUser?.id ?? null

      if (!userId) {
        throw new Error('AUTH_REQUIRED')
      }

      const accessToken = session?.access_token ?? null
      let acceptPayload: AcceptResponse | null = null

      try {
        acceptPayload = await acceptViaRpc(supabase, token, userId)
      } catch (rpcError) {
        console.warn('[InviteRoute] Accept via RPC failed, trying API', rpcError)
        if (accessToken) {
          try {
            acceptPayload = await acceptViaApi(accessToken, token)
          } catch (apiError) {
            console.warn('[InviteRoute] Accept via API failed, falling back to Edge Function', apiError)
          }
        }

        if (!acceptPayload) {
          acceptPayload = await acceptViaSupabaseFunction(supabase, token)
        }
      }

      const projectId = acceptPayload?.project_id ?? acceptPayload?.projectId ?? inviteDetails?.projectId ?? null
      const projectName = acceptPayload?.project_name ?? acceptPayload?.projectName ?? inviteDetails?.projectName ?? 'your project'

      clearStoredInvite()
      toast.success(`Welcome to ${projectName}!`)
      setStep('accepted')
      navigate(projectId ? `/project/${projectId}` : '/', { replace: true })
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
        if (!auto) {
          toast.error('Please sign in to accept this invite.')
        }
        setStep('needs-auth')
        return
      }

      console.error('[InviteRoute] Failed to accept invite', error)
      toast.error(TOAST_INVALID_MESSAGE)
      setStep(currentUser ? 'ready' : 'needs-auth')
    }
  }, [token, supabase, inviteDetails, currentUser, navigate])

  useEffect(() => {
    if (!token) {
      setStep('error')
      setErrorMessage('Invite token is missing.')
      return
    }

    autoAcceptTriggered.current = false

    const stored = readStoredInvite(token)
    if (stored) {
      setInviteDetails(stored)
    }

    let cancelled = false

    const verifyInvite = async () => {
      setStep('loading')
      setErrorMessage('')

      try {
        let payload: VerifyResponse | null = null

        try {
          payload = await fetchInviteViaApi(token)
        } catch (apiError) {
          console.warn('[InviteRoute] Verify via API failed, falling back to Supabase function', apiError)
          payload = await verifyViaSupabase(supabase, token)
        }

        if (cancelled) {
          return
        }

        const details = parseInviteDetails(token, payload ?? {})
        setInviteDetails(details)
        persistInvite(details)
        setStep(authSnapshot.current ? 'ready' : 'needs-auth')
        setErrorMessage('')
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('[InviteRoute] Failed to verify invite', error)
        setInviteDetails(null)
        clearStoredInvite()
        setErrorMessage(INVALID_INVITE_MESSAGE)
        setStep('error')
      }
    }

    verifyInvite()

    return () => {
      cancelled = true
    }
  }, [token, supabase])

  useEffect(() => {
    if (!currentUser || step !== 'needs-auth' || !inviteDetails || autoAcceptTriggered.current) {
      return
    }

    autoAcceptTriggered.current = true
    void handleAccept(true)
  }, [currentUser, step, inviteDetails, handleAccept])

  const handleDecline = () => {
    clearStoredInvite()
    navigate('/', { replace: true })
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('[InviteRoute] Google sign-in failed', error)
      toast.error('Google sign-in failed. Please try again.')
    }
  }

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setEmailAuthError(null)
    setEmailAuthLoading(true)

    try {
      if (emailAuthMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          throw error
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: fullName ? { full_name: fullName } : undefined
          }
        })

        if (error) {
          throw error
        }

        toast.success('Account created! Please check your inbox to verify your email if required.')
      }
    } catch (error) {
      console.error('[InviteRoute] Email auth failed', error)
      const message = error instanceof Error ? error.message : 'Authentication failed.'
      setEmailAuthError(message)
    } finally {
      setEmailAuthLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 text-white">
        {step === 'loading' && (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold">Processing invitation…</h1>
            <p className="text-white/70">We are verifying your invite details.</p>
          </div>
        )}

        {step === 'needs-auth' && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <h1 className="text-2xl font-semibold">You are invited</h1>
              <p className="text-white/70">
                You’ve been invited to join {projectLabel} on PlayJoob. Please sign up or log in to continue.
              </p>
              {inviterLabel && (
                <p className="text-sm text-white/60">Invitation sent by {inviterLabel}.</p>
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full rounded-xl bg-white text-slate-900 py-3 font-medium hover:bg-slate-100 transition"
              >
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => setEmailMode((value) => !value)}
                className="w-full rounded-xl border border-white/20 py-3 font-medium hover:bg-white/10 transition"
              >
                {emailMode ? 'Hide email options' : 'Continue with Email'}
              </button>
            </div>

            {emailMode && (
              <div className="rounded-2xl bg-white/5 p-5 space-y-4">
                <div className="flex gap-2 rounded-full bg-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => setEmailAuthMode('login')}
                    className={`flex-1 rounded-full py-2 text-sm font-medium transition ${emailAuthMode === 'login' ? 'bg-white text-slate-900' : 'text-white/80'}`}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailAuthMode('signup')}
                    className={`flex-1 rounded-full py-2 text-sm font-medium transition ${emailAuthMode === 'signup' ? 'bg-white text-slate-900' : 'text-white/80'}`}
                  >
                    Sign up
                  </button>
                </div>

                <form className="space-y-3" onSubmit={handleEmailSubmit}>
                  {emailAuthMode === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-sm text-white/70" htmlFor="invite-full-name">Full name</label>
                      <input
                        id="invite-full-name"
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-white/40 focus:outline-none"
                        placeholder="Your name"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm text-white/70" htmlFor="invite-email">Email</label>
                    <input
                      id="invite-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-white/40 focus:outline-none"
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-white/70" htmlFor="invite-password">Password</label>
                    <input
                      id="invite-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-white/40 focus:outline-none"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  {emailAuthError && (
                    <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{emailAuthError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={emailAuthLoading}
                    className="w-full rounded-xl bg-white text-slate-900 py-3 font-medium hover:bg-slate-100 transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {emailAuthLoading ? 'Please wait…' : emailAuthMode === 'login' ? 'Log in with email' : 'Sign up with email'}
                  </button>
                </form>
              </div>
            )}

            <button
              type="button"
              onClick={handleDecline}
              className="w-full text-sm text-white/50 hover:text-white/80 transition"
            >
              Decline invitation
            </button>
          </div>
        )}

        {step === 'ready' && inviteDetails && (
          <div className="space-y-6 text-center">
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold">Join “{inviteDetails.projectName}”</h1>
              <p className="text-white/70">
                You’ve been invited to join {inviteDetails.projectName}
                {inviterLabel ? ` by ${inviterLabel}` : ''}.
              </p>
              {inviteDetails.role && (
                <p className="text-sm text-white/60">Role: {inviteDetails.role}</p>
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleAccept(false)}
                className="w-full rounded-xl bg-white text-slate-900 py-3 font-medium hover:bg-slate-100 transition"
              >
                Accept invitation
              </button>

              <button
                type="button"
                onClick={handleDecline}
                className="w-full rounded-xl border border-white/20 py-3 font-medium hover:bg-white/10 transition"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {step === 'accepting' && (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold">Accepting invitation…</h1>
            <p className="text-white/70">Adding you to the project.</p>
          </div>
        )}

        {step === 'accepted' && (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold">You’re in! 🎉</h1>
            <p className="text-white/70">Redirecting you to your workspace…</p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-semibold">Invite unavailable</h1>
            <p className="text-red-300">{errorMessage}</p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition"
            >
              Go to PlayJoob
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
