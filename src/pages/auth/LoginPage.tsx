import { useEffect, useState } from 'react'
import { signInWithGoogle, getRedirectForDebug } from '../../lib/supabase-browser'

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M19.6 8.4h-1.02V8.35H10v3.3h5.49c-.8 2.06-2.7 3.48-4.99 3.48a5.44 5.44 0 0 1-5.51-5.37A5.44 5.44 0 0 1 10.5 4.4c1.38 0 2.63.5 3.6 1.32l2.32-2.25C14.89 1.86 12.85 1 10.5 1A7.99 7.99 0 0 0 1.53 5.86l2.77 2.01C5.03 5.81 7.55 4.4 10.5 4.4z" fill="#4285F4" />
    <path d="M1.53 5.862A7.976 7.976 0 0 0 2.5 12.3l2.8-2.18a4.61 4.61 0 0 1-.18-1.26c0-.44.07-.87.18-1.26L1.53 5.86z" fill="#FBBC05" />
    <path d="M10.5 4.4c1.38 0 2.63.5 3.6 1.32l2.32-2.25C14.89 1.86 12.85 1 10.5 1A7.99 7.99 0 0 0 1.53 5.86l2.77 2.01C5.03 5.81 7.55 4.4 10.5 4.4z" fill="#EA4335" />
    <path d="M10.5 16.72c2.3 0 4.19-.74 5.59-2.03l-2.74-2.13c-.73.5-1.66.79-2.85.79-2.29 0-4.2-1.42-4.99-3.48L2.5 12.3C3.9 15.42 7.02 17.72 10.5 17.72z" fill="#34A853" />
  </svg>
)

const LoginPage = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<{ origin: string; redirectTo: string | undefined }>({ origin: '', redirectTo: undefined })

  useEffect(() => {
    setDebugInfo({
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      redirectTo: getRedirectForDebug()
    })
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl bg-slate-800/90 shadow-xl p-8 backdrop-blur-xl text-white space-y-6">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-semibold">Welcome to PlayJob</h1>
            <p className="text-slate-300">Sign in to continue building your 3D projects.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-slate-900/80 border border-slate-700 px-4 py-3 text-xs text-slate-300">
            <p><span className="text-slate-400">origin:</span> {debugInfo.origin || 'N/A'}</p>
            <p><span className="text-slate-400">redirectTo:</span> {debugInfo.redirectTo || 'undefined'}</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white text-slate-900 font-medium py-3 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-3">
              <GoogleIcon />
              <span>{loading ? 'Connecting…' : 'Sign in with Google'}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage


