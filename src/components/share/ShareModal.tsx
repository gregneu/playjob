import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase as supabaseClient } from '@/lib/supabase'
import { UserAvatar } from '../UserAvatar'

type Role = 'viewer' | 'editor' | 'admin' | 'owner'
type MemberStatus = 'member' | 'invited'

interface MemberRow {
  id: string
  membership_id: string | null
  invite_id: string | null
  user_id: string | null
  display_name: string | null
  avatar_url?: string | null
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
  padding: '4px 12px',
  borderRadius: '14px',
  background: 'rgba(148, 163, 184, 0.24)',
  fontSize: '12px',
  fontWeight: 600,
  color: 'rgba(248, 250, 252, 0.85)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase'
}

export function ShareModal({ projectId, projectName, isOpen, onClose }: ShareModalProps) {
  const supabase = useMemo(() => supabaseClient, [])
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

    try {
      const [{ data: sessionData }, { error: fetchError }] = await Promise.all([
        supabase.auth.getSession(),
        (async () => ({ error: null as null | Error }))()
      ])

      const accessToken = sessionData.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase env variables are missing')
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey
      }

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      console.log('[ShareModal] Calling invite-user', { projectId, email, role })

      const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ projectId, email, role })
      })

      if (!response.ok) {
        const body = await response.text()
        console.error('[ShareModal] Invite failed', response.status, body)
        return
      }

      const payload = await response.json().catch(() => null)
      console.log('[ShareModal] Invite success', payload)
      setEmail('')
      fetchMembers()
    } catch (err) {
      console.error('[ShareModal] Invite exception', err)
    } finally {
      setLoading(false)
    }
  }

  const copyInviteLink = async () => {
    try {
      const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin
      await navigator.clipboard.writeText(`${baseUrl}/invite/link?project=${projectId}`)
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
    padding: '48px 24px',
    background: 'rgba(8, 11, 19, 0.45)',
    backdropFilter: 'blur(18px)'
  }

  const modalStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '700px',
    borderRadius: '20px',
    padding: '32px',
    background: 'rgba(24, 28, 37, 0.72)' ,
    backdropFilter: 'blur(24px)',
    color: 'rgba(248, 250, 252, 0.88)',
    boxShadow: '0 28px 70px rgba(8, 11, 19, 0.55)',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px'
  }
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '18px'
  }
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'rgba(203, 213, 225, 0.58)',
    marginBottom: '12px'
  }
  const mutedTextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'rgba(226, 232, 240, 0.62)'
  }
  const actionButtonStyle: React.CSSProperties = {
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(15, 18, 28, 0.68)',
    padding: '12px 16px',
    color: 'rgba(241, 245, 249, 0.88)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease'
  }
  const formRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  }
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px 18px',
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    background: 'rgba(15, 18, 28, 0.72)',
    color: 'rgba(248, 250, 252, 0.9)',
    fontSize: '15px',
    transition: 'border 0.2s ease, background 0.2s ease'
  }
  const selectStyle: React.CSSProperties = {
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    background: 'rgba(15, 18, 28, 0.72)',
    color: 'rgba(248, 250, 252, 0.9)',
    padding: '14px 48px 14px 18px',
    fontSize: '15px',
    appearance: 'none',
    position: 'relative'
  }
  const primaryButtonStyle: React.CSSProperties = {
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    background: 'rgba(248, 250, 252, 0.12)',
    color: 'rgba(248, 250, 252, 0.92)',
    fontWeight: 500,
    padding: '14px 28px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease'
  }
  const memberListWrapperStyle: React.CSSProperties = {
  borderRadius: '18px',
  padding: '14px 16px',
  background: 'rgba(12, 15, 23, 0.58)',
  border: '1px solid rgba(148, 163, 184, 0.12)'
}

const memberListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  maxHeight: '320px',
  overflowY: 'auto',
  padding: '6px 2px'
}

const memberEntryStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderRadius: '12px',
  background: 'transparent',
  transition: 'background 0.2s ease, transform 0.2s ease'
}

return createPortal(
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <header style={headerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserAvatar userId={currentUserId} size={32} showName={false} />
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Share "{projectName}"</h2>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={copyInviteLink}
              style={{
                ...actionButtonStyle,
                borderRadius: '16px',
                width: 44,
                height: 44
              }}
              title={copyState === 'copied' ? 'Link copied' : 'Copy invite link'}
            >
              <span style={{ fontSize: '18px', lineHeight: 1, opacity: 0.9 }}>🔗</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...actionButtonStyle,
                borderRadius: '16px',
                width: 44,
                height: 44
              }}
              title="Close"
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = 'translateY(-2px)'
                event.currentTarget.style.boxShadow = '0 12px 28px rgba(148, 163, 184, 0.25)'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'translateY(0)'
                event.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>✕</span>
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
              onFocus={(event) => {
                event.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.45)'
                event.currentTarget.style.background = 'rgba(15, 18, 28, 0.88)'
              }}
              onBlur={(event) => {
                event.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'
                event.currentTarget.style.background = 'rgba(15, 18, 28, 0.72)'
              }}
              style={inputStyle}
            />
            <div style={{ position: 'relative' }}>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.45)'
                  event.currentTarget.style.background = 'rgba(15, 18, 28, 0.88)'
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'
                  event.currentTarget.style.background = 'rgba(15, 18, 28, 0.72)'
                }}
                style={selectStyle}
              >
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
                <option value="admin">Admin</option>
              </select>
              <span
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'rgba(226, 232, 240, 0.5)',
                  fontSize: '12px'
                }}
              >
                ⌄
              </span>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={primaryButtonStyle}
              onMouseEnter={(event) => {
                if (!loading) {
                  event.currentTarget.style.transform = 'translateY(-2px)'
                  event.currentTarget.style.boxShadow = '0 8px 20px rgba(148, 163, 184, 0.25)'
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'translateY(0)'
                event.currentTarget.style.boxShadow = 'none'
              }}
            >
              Invite
            </button>
          </form>
        </section>

        <section>
          <p style={sectionTitleStyle}>Members</p>
          <div style={memberListWrapperStyle}>
            <div style={memberListStyle}>
              {members.map((member) => {
                const initials = (member.display_name ?? member.email ?? '?').slice(0, 2).toUpperCase()
                const statusLabel = member.status === 'invited' ? 'Pending' : undefined
                const isOwner = member.role === 'owner'
                const showAvatar = Boolean(member.user_id)

                return (
                  <div
                    key={member.id}
                    style={memberEntryStyle}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = 'rgba(148, 163, 184, 0.12)'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {showAvatar ? (
                        <UserAvatar
                          userId={member.user_id ?? undefined}
                          userName={member.display_name ?? member.email}
                          size={40}
                          showName={false}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'rgba(15, 18, 28, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            color: '#e2e8f0'
                          }}
                        >
                          {initials}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <p style={{ fontWeight: 600 }}>{member.display_name ?? member.email}</p>
                          {isOwner ? (
                            <span style={OWNER_BADGE_STYLE}>
                              Owner
                            </span>
                          ) : null}
                        </div>
                        <p style={mutedTextStyle}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{member.email}</span>
                            {statusLabel ? (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  background: 'rgba(148, 163, 184, 0.18)',
                                  fontSize: '11px',
                                  color: 'rgba(226, 232, 240, 0.8)',
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase'
                                }}
                                title={member.status === 'invited' ? 'Awaiting acceptance' : undefined}
                              >
                                {statusLabel}
                              </span>
                            ) : null}
                          </span>
                        </p>
                      </div>
                    </div>

                    {isOwner ? (
                      <span
                        style={{
                          ...OWNER_BADGE_STYLE,
                          borderRadius: '12px',
                          padding: '6px 14px'
                        }}
                      >
                        Owner
                      </span>
                    ) : (
                      <div style={{ position: 'relative' }}>
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
                          onFocus={(event) => {
                            event.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.45)'
                            event.currentTarget.style.background = 'rgba(15, 23, 42, 0.92)'
                          }}
                          onBlur={(event) => {
                            event.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.22)'
                            event.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'
                          }}
                          style={{
                            ...selectStyle,
                            minWidth: '150px',
                            opacity: member.status === 'invited' ? 0.85 : 1,
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
                        <span
                          style={{
                            position: 'absolute',
                            right: 20,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: 'rgba(226, 232, 240, 0.5)',
                            fontSize: '12px'
                          }}
                        >
                          ⌄
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {members.length === 0 && (
              <p style={{ ...mutedTextStyle, textAlign: 'center', padding: '16px 0' }}>No members yet.</p>
            )}
          </div>
        </section>

      </div>
    </div>,
    document.body
  )
}

export default ShareModal
