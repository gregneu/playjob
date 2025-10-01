import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBrowserClient } from '@/lib/supabase-browser'

type Step = 'loading' | 'ready' | 'accepted' | 'error'

export default function InviteRoute() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const supabase = useMemo(() => getBrowserClient(), [])

  const [step, setStep] = useState<Step>('loading')
  const [projectName, setProjectName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStep('error')
      setError('Invite token is missing.')
      return
    }

    const fetchInvite = async () => {
      setStep('loading')
      const { data, error } = await supabase
        .from('project_invites')
        .select('project_id, status, expires_at, projects(name)')
        .eq('invite_token', token)
        .maybeSingle()

      if (error || !data) {
        setStep('error')
        setError('Invite not found.')
        return
      }

      if (data.status !== 'pending') {
        setStep('error')
        setError('Invite already processed.')
        return
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setStep('error')
        setError('Invite expired.')
        return
      }

      setProjectName(data.projects?.name ?? 'Project')
      setStep('ready')
    }

    fetchInvite()
  }, [token, supabase])

  const handleAccept = async () => {
    if (!token) return
    setStep('loading')
    const { error } = await supabase.functions.invoke('accept-invite', {
      body: { inviteToken: token }
    })

    if (error) {
      setStep('error')
      setError(error.message)
      return
    }

    setStep('accepted')
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 text-white text-center">
        {step === 'loading' && <p>Processing invitation…</p>}

        {step === 'ready' && (
          <>
            <h1 className="text-2xl font-semibold mb-3">Join “{projectName}”</h1>
            <p className="text-white/70 mb-6">
              You’ve been invited to collaborate on this project. Accept to join PlayJoob.
            </p>
            <button
              onClick={handleAccept}
              className="w-full rounded-xl bg-white text-slate-900 py-3 font-medium hover:bg-slate-100 transition"
            >
              Accept invitation
            </button>
          </>
        )}

        {step === 'accepted' && (
          <>
            <h1 className="text-2xl font-semibold mb-3">You’re in! 🎉</h1>
            <p className="text-white/70">Redirecting you to your workspace…</p>
          </>
        )}

        {step === 'error' && (
          <>
            <h1 className="text-2xl font-semibold mb-3">Invite unavailable</h1>
            <p className="text-red-300">{error}</p>
          </>
        )}
      </div>
    </div>
  )
}

