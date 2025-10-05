import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getBrowserClient } from '@/lib/supabase-browser'

type Role = 'viewer' | 'editor' | 'admin' | 'owner'
type MemberStatus = 'member' | 'invited'

interface MemberRow {
  id: string
  membership_id: string | null
  invite_id: string | null
  user_id: string | null
  display_name: string | null
  email: string
  role: Role
  status: MemberStatus
  created_at: string
  source?: 'membership' | 'invite' | 'synthetic_owner'
}

interface ShareModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onClose: () => void
}

const ROLE_LABEL: Record<Exclude<Role, 'owner'>, string> = {
  viewer: 'Can view',
  editor: 'Can edit',
  admin: 'Admin'
}

const ROLE_PRIORITY: Record<Role, number> = {
  owner: 0,
  admin: 1,
  editor: 2,
  viewer: 3
}

const STATUS_PRIORITY: Record<MemberStatus, number> = {
  member: 0,
  invited: 1
}

const OWNER_BADGE_STYLE: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: '9999px',
  background: 'rgba(255,255,255,0.18)',
  fontSize: '12px',
  fontWeight: 600,
  color: '#fff'
}

export function ShareModal({ projectId, projectName, isOpen, onClose }: ShareModalProps) {
  const supabase = useMemo(() => getBrowserClient(), [])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [loading, setLoading] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null)

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setCurrentUserId(data.user?.id ?? null)
      })
      .catch((error) => {
        console.error('[ShareModal] Failed to resolve current user', error)
      })
  }, [supabase])

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('list-project-members', {
      body: { projectId }
    })

    if (error) {
      console.error('[ShareModal] Failed to load members', error)
      return
    }

    const payload = (data ?? {}) as { members?: MemberRow[]; missing_owner?: boolean }

    if (payload?.missing_owner) {
      console.warn('[ShareModal] Owner membership missing, synthetic fallback rendered')
    }

    const sortedMembers = [...(payload?.members ?? [])].sort((a, b) => {
      const statusDelta = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
      if (statusDelta !== 0) return statusDelta

      const roleDelta = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role]
      if (roleDelta !== 0) return roleDelta

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    setMembers(sortedMembers)

    if (currentUserId) {
      const self = sortedMembers.find((member) => member.user_id === currentUserId)
      setCurrentUserRole(self?.role ?? null)
    } else {
      setCurrentUserRole(null)
    }
  }, [projectId, supabase, currentUserId])

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
      const context = (error as any)?.context
      if (context) {
        console.error('[ShareModal] Invite failure context', context)
        try {
          const clone = typeof context?.clone === 'function' ? context.clone() : context
          if (typeof clone?.json === 'function') {
            const json = await clone.json()
            console.error('[ShareModal] Invite failure parsed context', json)
            try {
              console.error('[ShareModal] Invite failure parsed context (stringified)', JSON.stringify(json))
            } catch {}
          } else if (typeof clone?.text === 'function') {
            const text = await clone.text()
            console.error('[ShareModal] Invite failure raw text', text)
          }
        } catch (parseError) {
          console.error('[ShareModal] Invite failure context parse error', parseError)
        }
      }
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
    if (member.role === 'owner') {
      return
    }

    if (member.status === 'member' && member.membership_id && member.user_id) {
      const { error } = await supabase
        .from('project_memberships')
        .update({ role: nextRole })
        .eq('project_id', projectId)
        .eq('user_id', member.user_id)

      if (error) {
        console.error('[ShareModal] Failed to update role', error)
      }
    } else if (member.status === 'invited' && member.invite_id) {
      const { error } = await supabase
        .from('project_invites')
        .update({ role: nextRole })
        .eq('id', member.invite_id)

      if (error) {
        console.error('[ShareModal] Failed to update invite role', error)
      }
    }
  }

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'

  const removeMember = async (member: MemberRow) => {
    if (!canManageMembers) return
    if (member.role === 'owner') return
    if (member.status === 'member' && member.user_id && member.user_id === currentUserId) {
      console.warn('[ShareModal] Managers cannot remove themselves via modal')
      return
    }

    const payload: { projectId: string; targetUserId?: string; inviteEmail?: string } = { projectId }

    if (member.status === 'member' && member.user_id) {
      payload.targetUserId = member.user_id
    } else if (member.status === 'invited') {
      payload.inviteEmail = member.email
    }

    if (!payload.targetUserId && !payload.inviteEmail) {
      console.error('[ShareModal] Unable to resolve removal payload for member', member)
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.functions.invoke('remove-project-member', {
        body: payload
      })

      if (error) {
        console.error('[ShareModal] Failed to remove member', error)
        const context = (error as any)?.context
        if (context) {
          try {
            const clone = typeof context?.clone === 'function' ? context.clone() : context
            if (typeof clone?.text === 'function') {
              const raw = await clone.text()
              console.error('[ShareModal] Removal error full body:', raw)
              try {
                const parsed = JSON.parse(raw)
                console.error('[ShareModal] Removal error context', parsed)
              } catch (parseErr) {
                console.error('[ShareModal] Removal error context parse failure', parseErr)
              }
            } else {
              console.error('[ShareModal] Removal error context', context)
            }
          } catch (parseError) {
            console.error('[ShareModal] Removal error context handling failure', parseError)
          }
        }
      } else {
        fetchMembers()
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    background: 'rgba(0, 0, 0, 0.35)'
  }

  const modalStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '640px',
    borderRadius: '20px',
    padding: '24px',
    background: 'rgba(55, 65, 81, 0.95)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px'
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px'
  }

  const mutedTextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)'
  }

  const pillButtonStyle: React.CSSProperties = {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    padding: '12px 16px',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  }

  const formRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '15px'
  }

  const selectStyle: React.CSSProperties = {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    padding: '12px 16px',
    fontSize: '15px'
  }

  const primaryButtonStyle: React.CSSProperties = {
    borderRadius: '12px',
    border: 'none',
    background: '#FFFFFF',
    color: '#111827',
    fontWeight: 600,
    padding: '12px 20px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1
  }

  const memberEntryStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: '16px',
    padding: '16px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)'
  }

  return createPortal(
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <header style={headerStyle}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>Share “{projectName}”</h2>
            <p style={mutedTextStyle}>Invite teammates and manage access levels</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={copyInviteLink}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.24)',
                color: '#fff',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title={copyState === 'copied' ? 'Copied!' : 'Copy invite link'}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>🔗</span>
            </button>
          <button
            onClick={onClose}
            aria-label="Close share modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '24px',
              lineHeight: 1,
              cursor: 'pointer'
            }}
          >
            ×
          </button>
          </div>
        </header>

        <section>
          <p style={sectionTitleStyle}>Invite by email</p>
          <form onSubmit={inviteByEmail} style={formRowStyle}>
            <input
              type="email"
              required
              value={email}
              placeholder="Add email"
              onChange={(event) => setEmail(event.target.value)}
              style={inputStyle}
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              style={selectStyle}
            >
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={loading} style={primaryButtonStyle}>
              Invite
            </button>
          </form>
        </section>

        <section>
          <p style={sectionTitleStyle}>Members</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
            {members.map((member) => {
              const initials = (member.display_name ?? member.email ?? '?').slice(0, 2).toUpperCase()
              const statusLabel = member.status === 'invited' ? 'Pending' : undefined
              const isOwner = member.role === 'owner'

              return (
                <div key={member.id} style={memberEntryStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontWeight: 600 }}>{member.display_name ?? member.email}</p>
                        {isOwner ? (
                          <span style={OWNER_BADGE_STYLE}>
                            Owner
                          </span>
                        ) : null}
                      </div>
                      <p style={mutedTextStyle}>
                        {member.email}
                        {statusLabel ? (
                          <span
                            style={{
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: 'rgba(255,255,255,0.12)',
                              fontSize: '12px',
                            }}
                            title={member.status === 'invited' ? 'Awaiting acceptance' : undefined}
                          >
                            {statusLabel}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {isOwner ? (
                    <span
                      style={{
                        ...selectStyle,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: OWNER_BADGE_STYLE.background,
                        borderColor: 'rgba(255,255,255,0.3)',
                        fontWeight: OWNER_BADGE_STYLE.fontWeight,
                        color: OWNER_BADGE_STYLE.color,
                      }}
                    >
                      Owner
                    </span>
                  ) : (
                    <select
                      value={member.role}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        if (nextValue === '__remove') {
                          removeMember(member)
                          return
                        }
                        if (nextValue !== member.role) {
                          changeRole(member, nextValue as Role)
                        }
                      }}
                      style={{
                        ...selectStyle,
                        minWidth: '140px',
                        opacity: member.status === 'invited' ? 0.8 : 1,
                        cursor: canManageMembers ? 'pointer' : 'not-allowed'
                      }}
                      disabled={!canManageMembers}
                    >
                      {(Object.keys(ROLE_LABEL) as Array<Exclude<Role, 'owner'>>).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                      {canManageMembers && (member.user_id !== currentUserId || member.status === 'invited') ? (
                        <option value="__remove">Remove</option>
                      ) : null}
                    </select>
                  )}
                </div>
              )
            })}

            {members.length === 0 && <p style={mutedTextStyle}>No members yet.</p>}
          </div>
        </section>
      </div>
    </div>,
    document.body
  )
}

export default ShareModal
