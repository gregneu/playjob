import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { signInWithGoogle, getRedirectForDebug } from '../lib/supabase-browser'

export const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [debugInfo, setDebugInfo] = useState<{ origin: string; redirectTo: string | undefined }>({ origin: '', redirectTo: undefined })
  const { signIn, signUp } = useAuth()

  useEffect(() => {
    setDebugInfo({
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      redirectTo: getRedirectForDebug()
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) throw error
        setMessage('Welcome!')
      } else {
        const { error } = await signUp(email, password, fullName)
        if (error) throw error
        setMessage('Account created! Check your email for confirmation.')
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      setMessage('Google sign-in successful!')
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`Google sign-in error: ${error.message}`)
      } else {
        setMessage('An unknown error occurred during Google sign-in')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #87CEEB 0%, #4A90E2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>
            🎮 PlayJob
          </h1>
          <p style={{ color: '#666' }}>
            {isLogin ? 'Sign in to account' : 'Create account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="Your name"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#3498db',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '⏳ Loading...' : isLogin ? '🚀 Sign In' : '✨ Create Account'}
          </button>
        </form>

        {message && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: '8px',
            background: message.includes('Error') ? '#ffebee' : '#e8f5e8',
            color: message.includes('Error') ? '#c62828' : '#2e7d32',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isLogin ? 'No account? Create one' : 'Already have an account? Sign in'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#888', fontSize: '14px', justifyContent: 'center' }}>
            <span style={{ height: '1px', flex: 1, background: '#e0e0e0' }} />
            <span>or</span>
            <span style={{ height: '1px', flex: 1, background: '#e0e0e0' }} />
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              width: '100%',
              background: 'white',
              color: '#1f2937',
              border: '1px solid #d1d5db',
              borderRadius: '9999px',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
              opacity: googleLoading ? 0.7 : 1
            }}
          >
            <svg viewBox="0 0 20 20" style={{ height: '20px', width: '20px' }} aria-hidden="true">
              <path d="M19.6 8.4h-1.02V8.35H10v3.3h5.49c-.8 2.06-2.7 3.48-4.99 3.48a5.44 5.44 0 0 1-5.51-5.37A5.44 5.44 0 0 1 10.5 4.4c1.38 0 2.63.5 3.6 1.32l2.32-2.25C14.89 1.86 12.85 1 10.5 1 6.08 1 2.5 4.48 2.5 8.86s3.58 7.86 7.99 7.86c4.59 0 7.74-3.16 7.74-7.62 0-.63-.07-1.12-.17-1.71z" fill="#4285F4" />
              <path d="M1.53 5.862A7.976 7.976 0 0 0 2.5 12.3l2.8-2.18a4.61 4.61 0 0 1-.18-1.26c0-.44.07-.87.18-1.26L1.53 5.86z" fill="#FBBC05" />
              <path d="M10.5 4.4c1.38 0 2.63.5 3.6 1.32l2.32-2.25C14.89 1.86 12.85 1 10.5 1A7.99 7.99 0 0 0 1.53 5.86l2.77 2.01C5.03 5.81 7.55 4.4 10.5 4.4z" fill="#EA4335" />
              <path d="M10.5 16.72c2.3 0 4.19-.74 5.59-2.03l-2.74-2.13c-.73.5-1.66.79-2.85.79-2.29 0-4.2-1.42-4.99-3.48L2.5 12.3C3.9 15.42 7.02 17.72 10.5 17.72z" fill="#34A853" />
            </svg>
            {googleLoading ? 'Connecting…' : 'Sign in with Google'}
          </button>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '12px',
            color: '#475569',
            lineHeight: 1.5
          }}>
            <div><span style={{ color: '#94a3b8' }}>origin:</span> {debugInfo.origin || 'N/A'}</div>
            <div><span style={{ color: '#94a3b8' }}>redirectTo:</span> {debugInfo.redirectTo || 'undefined'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}