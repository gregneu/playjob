import { useState } from 'react'
import { signInWithGoogle } from '../../lib/supabase-browser'

const googleIconPath =
  'M19.6 10.23H12v3.54h4.28c-.18 1-.74 1.84-1.58 2.4v2.01h2.56c1.5-1.38 2.36-3.42 2.36-5.85 0-.56-.05-1.1-.12-1.61z M12 20.4c2.14 0 3.93-.71 5.24-1.93l-2.56-2.01c-.71.48-1.61.76-2.68.76-2.06 0-3.81-1.39-4.43-3.29H5.88v2.07c1.31 2.58 3.99 4.4 6.92 4.4z M7.57 11.93c-.16-.48-.25-.99-.25-1.52s.09-1.04.25-1.52V6.82H5.88A8.4 8.4 0 0 0 4.8 10.4c0 1.31.31 2.55.88 3.58l2.33-1.81z M12 5.6c1.16 0 2.21.4 3.04 1.16l2.28-2.28C15.92 3.04 14.14 2.4 12 2.4 9.07 2.4 6.4 4.22 5.08 6.8l2.49 1.87C8.19 7 9.94 5.6 12 5.6z'

const LoginPage = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl bg-slate-800/90 shadow-xl p-8 backdrop-blur-xl text-white">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold">Welcome to PlayJob</h1>
            <p className="text-slate-300">Sign in to continue building your 3D projects.</p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-xl bg-white text-slate-900 font-medium py-3 shadow-md transition hover:bg-slate-100 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d={googleIconPath} fill="#4285F4" />
            </svg>
            {loading ? 'Connecting…' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage


