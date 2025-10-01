import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getBrowserClient } from '@/lib/supabase-browser'

type Role = 'viewer' | 'editor' | 'admin' | 'owner'
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

const ROLE_LABEL: Record<Exclude<Role, 'owner'>, string> = {
  viewer: 'Can view',
  editor: 'Can edit',
  admin: 'Admin'
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
          <button type="button" onClick={copyInviteLink} style={pillButtonStyle}>
            <div>
              <p style={{ fontWeight: 600 }}>Copy link</p>
              <p style={mutedTextStyle}>Share a direct link with your team</p>
            </div>
            <span style={{ fontWeight: 500 }}>{copyState === 'copied' ? 'Copied!' : 'Copy'}</span>
          </button>
        </section>

        <section>
          <p style={sectionTitleStyle}>Members</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
            {members.map((member) => {
              const initials = member.display_name?.slice(0, 2).toUpperCase() ?? member.email.slice(0, 2).toUpperCase()
              const statusLabel = member.status === 'pending' ? 'Pending' : undefined
              const isOwner = member.role === 'owner'

              return (
                <div key={`${member.member_id ?? member.invite_id}`} style={memberEntryStyle}>
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
                              fontSize: '12px'
                            }}
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
                      value={member.role as Exclude<Role, 'owner'>}
                      onChange={(event) => changeRole(member, event.target.value as Role)}
                      style={{ ...selectStyle, minWidth: '140px', opacity: member.status === 'pending' ? 0.8 : 1 }}
                    >
                      {(Object.keys(ROLE_LABEL) as Array<Exclude<Role, 'owner'>>).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
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

