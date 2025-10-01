import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getBrowserClient } from '@/lib/supabase-browser'

type Role = 'viewer' | 'editor' | 'admin'
type MemberStatus = 'pending' | 'accepted' | 'expired' | 'active'

interface MemberRow {
  invite_id: string | null
  invite_token: string | null
  member_id: string | null
  display_name: string | null
  email: string
  role: Role
  status: MemberStatus
  expires_at: string | null
}

interface ShareModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onClose: () => void
}

const ROLE_LABEL: Record<Role, string> = {
  viewer: 'Can view',
  editor: 'Can edit',
  admin: 'Admin'
}

export function ShareModal({ projectId, projectName, isOpen, onClose }: ShareModalProps) {
  const supabase = useMemo(() => getBrowserClient(), [])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [loading, setLoading] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('list-project-members', {
      body: { projectId }
    })

    if (error) {
      console.error('[ShareModal] Failed to load members', error)
      return
    }

    setMembers((data as MemberRow[]) ?? [])
  }, [projectId, supabase])

  useEffect(() => {
    if (!isOpen) return
    fetchMembers()

    const channel = supabase
      .channel(`project-share:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_memberships', filter: `project_id=eq.${projectId}` },
        () => fetchMembers()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_invites', filter: `project_id=eq.${projectId}` },
        () => fetchMembers()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, projectId, supabase, fetchMembers])

  const inviteByEmail = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email) return
    setLoading(true)

    const { error } = await supabase.functions.invoke('invite-user', {
      body: { projectId, email, role }
    })

    setLoading(false)

    if (error) {
      console.error('[ShareModal] Invite failure', error)
      return
    }

    setEmail('')
    fetchMembers()
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://playjoob.com/invite/link?project=${projectId}`)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1600)
    } catch (error) {
      console.error('[ShareModal] Copy failed', error)
    }
  }

  const changeRole = async (member: MemberRow, nextRole: Role) => {
    if (member.member_id) {
      const { error } = await supabase
        .from('project_memberships')
        .update({ role: nextRole })
        .eq('project_id', projectId)
        .eq('user_id', member.member_id)

      if (error) {
        console.error('[ShareModal] Failed to update role', error)
      }
    } else if (member.invite_id) {
      const { error } = await supabase
        .from('project_invites')
        .update({ role: nextRole })
        .eq('id', member.invite_id)

      if (error) {
        console.error('[ShareModal] Failed to update invite role', error)
      }
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6 py-10">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 shadow-2xl">
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Share “{projectName}”</h2>
            <p className="text-sm text-white/70">Invite teammates and manage access levels</p>
          </div>
          <button className="text-white/70 transition hover:text-white" onClick={onClose} aria-label="Close share modal">
            ×
          </button>
        </header>

        <form onSubmit={inviteByEmail} className="mt-6 flex gap-3">
          <input
            type="email"
            required
            value={email}
            placeholder="Add email"
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-white focus:border-white/40 focus:outline-none"
          >
            <option value="viewer">Can view</option>
            <option value="editor">Can edit</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
          >
            Invite
          </button>
        </form>

        <button
          type="button"
          onClick={copyInviteLink}
          className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition hover:bg-white/10"
        >
          <div>
            <p className="font-medium text-white">Copy link</p>
            <p className="text-sm text-white/60">Share a direct link with your team</p>
          </div>
          <span className="text-sm font-medium">{copyState === 'copied' ? 'Copied!' : 'Copy'}</span>
        </button>

        <div className="mt-6 space-y-3">
          {members.map((member) => {
            const initials = member.display_name?.slice(0, 2).toUpperCase() ?? member.email.slice(0, 2).toUpperCase()
            const statusLabel = member.status === 'pending' ? 'Pending' : undefined

            return (
              <div
                key={`${member.member_id ?? member.invite_id}`}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="font-medium text-white">{member.display_name ?? member.email}</p>
                    <p className="text-sm text-white/60">
                      {member.email}
                      {statusLabel ? <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/80">{statusLabel}</span> : null}
                    </p>
                  </div>
                </div>

                <select
                  value={member.role}
                  onChange={(event) => changeRole(member, event.target.value as Role)}
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
                  style={{ opacity: member.status === 'pending' ? 0.8 : 1 }}
                >
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ShareModal

