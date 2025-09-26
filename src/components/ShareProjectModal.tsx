import React, { useEffect, useMemo, useState } from 'react'
import { GlassPanel } from './GlassPanel'
import { X, UserPlus, Mail, Check, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ShareProjectModalProps {
  isOpen: boolean
  onClose: () => void
  projectName: string
  projectId: string
  currentUserId: string
  onUserAdded?: (user: { id: string; full_name: string | null; email: string | null }) => void
}

export const ShareProjectModal: React.FC<ShareProjectModalProps> = ({
  isOpen,
  onClose,
  projectName,
  projectId,
  currentUserId,
  onUserAdded
}) => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([])
  const [members, setMembers] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([])
  const [invites, setInvites] = useState<Array<{ email: string; invited_at: string }>>([])
  const [searching, setSearching] = useState(false)

  // Load current project members for listing and duplicate prevention
  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      try {
        // Используем простой запрос без JOIN
        const { data, error } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', projectId)
        
        if (!error && data && data.length > 0) {
          // Получаем профили отдельно
          const userIds = data.map(pm => pm.user_id).filter(Boolean)
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
          
          if (!profilesError && profilesData) {
            setMembers(
              profilesData.map(p => ({ id: p.id, full_name: p.full_name ?? null, email: p.email ?? null }))
            )
          } else {
            console.error('❌ Failed to load profiles:', profilesError)
            setMembers([])
          }
        } else {
          console.error('❌ Failed to load project_members:', error)
          setMembers([])
        }
        const { data: pending } = await supabase
          .from('project_invitations')
          .select('email, invited_at')
          .eq('project_id', projectId)
          .eq('status', 'pending')
        setInvites(((pending as any[]) || []).map(i => ({ email: i.email, invited_at: i.invited_at })))
      } catch {}
    })()
  }, [isOpen, projectId])

  // Debounced search of profiles by email or full_name
  useEffect(() => {
    if (!isOpen) return
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(10)
        if (!error && data) {
          // hide already members
          const memberIds = new Set(members.map(m => m.id))
          setResults(data.filter(u => !memberIds.has(u.id)))
        }
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [isOpen, query, members])

  const isEmail = useMemo(() => /.+@.+\..+/.test(query.trim()), [query])
  const exactMatch = useMemo(() => results.find(r => r.email?.toLowerCase() === query.trim().toLowerCase()) || null, [results, query])

  const addExistingUser = async (user: { id: string; full_name: string | null; email: string | null }) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: user.id,
          role: 'member',
          invited_by: currentUserId,
          status: 'accepted',
          joined_at: new Date().toISOString()
        })
      if (error) throw error
      setMembers(prev => [...prev, user])
      setMessage(`${user.full_name || user.email} добавлен(а) в проект`)
      setQuery('')
      onUserAdded?.(user)
    } catch (e) {
      setMessage('Ошибка при добавлении пользователя в проект')
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const inviteEmail = async () => {
    const email = query.trim()
    if (!email) return
    setIsLoading(true)
    try {
      // Check existing first
      const { data: existing } = await supabase.from('profiles').select('id, full_name, email').eq('email', email).maybeSingle()
      if (existing) {
        await addExistingUser(existing)
        return
      }
      // Local/dev path: instantly create a lightweight profile and membership
      // 1) Create auth user via invite-less path is not available from client; so create stub profile if RLS allows owner
      const { data: newProfile, error: profErr } = await supabase
        .from('profiles')
        .insert({ id: crypto.randomUUID(), email, full_name: null, avatar_url: '/Avatars/placeholder.png' })
        .select('id, email')
        .single()
      if (profErr) {
        // fallback: just record invitation and show pending
        const { error } = await supabase
          .from('project_invitations')
          .insert({ project_id: projectId, email, invited_by: currentUserId, role: 'member', status: 'pending', invited_at: new Date().toISOString() })
        if (error) throw error
        setMessage('Приглашение создано (email-отправка выключена)')
        setQuery('')
        setInvites(prev => [{ email, invited_at: new Date().toISOString() }, ...prev])
        return
      }
      // 2) Add to project_members immediately
      await addExistingUser({ id: newProfile.id, full_name: null, email })
    } catch (e) {
      setMessage('Ошибка при создании приглашения')
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      <GlassPanel style={{ maxWidth: '640px', width: '92%', padding: '24px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'white', marginBottom: 16 }}>Пригласить в проект</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>{projectName}</p>

        {/* Search / Invite input */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'rgba(255,255,255,0.5)' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите email для приглашения или имя для поиска"
                style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'white' }}
              />
              {/* Dropdown results */}
              {(results.length > 0 || searching) && query.trim() && (
                <div style={{ position: 'absolute', top: 40, left: 0, right: 0, background: 'rgba(9,14,25,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 6, zIndex: 10 }}>
                  {searching ? (
                    <div style={{ padding: 8, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={14} className="spin" /> Поиск...
                    </div>
                  ) : (
                    results.map(u => (
                      <button key={u.id} onClick={() => addExistingUser(u)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'white', padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{u.full_name || u.email}</span>
                          <span style={{ opacity: 0.7, fontSize: 12 }}>{u.email}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              onClick={isEmail ? inviteEmail : undefined}
              disabled={!isEmail || isLoading}
              style={{ padding: '10px 14px', background: isEmail && !isLoading ? '#4ECDC4' : 'rgba(78,205,196,0.5)', color: 'white', border: 'none', borderRadius: 8, cursor: isEmail && !isLoading ? 'pointer' : 'not-allowed' }}
            >
              {isLoading ? <Loader2 size={16} className="spin" /> : 'Пригласить'}
            </button>
          </div>
        </div>

        {message && (
          <div style={{ padding: '10px 12px', background: message.includes('Ошибка') ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', border: `1px solid ${message.includes('Ошибка') ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`, color: 'white', borderRadius: 8, marginBottom: 12 }}>
            {message}
          </div>
        )}

        {/* Current members */}
        <div style={{ marginTop: 8 }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontSize: 14 }}>Участники проекта</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {members.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.5)' }}>Пока нет участников</div>
            ) : (
              members.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                  <div style={{ color: 'white' }}>{m.full_name || m.email}</div>
                  <Check size={16} style={{ color: '#22C55E' }} />
                </div>
              ))
            )}
          </div>
          {invites.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontSize: 13 }}>Ожидающие приглашения</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {invites.map(i => (
                  <div key={i.email + i.invited_at} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8 }}>
                    <div style={{ color: 'rgba(255,255,255,0.9)' }}>{i.email}</div>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassPanel>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
