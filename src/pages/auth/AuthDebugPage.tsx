import { useEffect, useState } from 'react'
import { getBrowserClient } from '../../lib/supabase-browser'

type SessionResponse = Awaited<ReturnType<ReturnType<typeof getBrowserClient>['auth']['getSession']>>

const AuthDebugPage = () => {
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const supabase = getBrowserClient()
        const currentSession = await supabase.auth.getSession()
        setSession(currentSession)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load session'
        setError(message)
      }
    }

    loadSession()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold mb-6">Auth Session Debug</h1>
        <p className="text-slate-300 mb-8">
          Inspect the current Supabase session data returned by <code>supabase.auth.getSession()</code>.
        </p>

        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        ) : (
          <pre className="rounded-2xl bg-slate-900/80 border border-slate-800/70 p-6 overflow-auto text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

export default AuthDebugPage


