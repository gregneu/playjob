import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface AvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (url: string) => void
}

const FALLBACK_AVATARS: string[] = [
  '/Avatars/placeholder.png',
  '/Avatars/HEX_AGENT_SHADES.png',
  '/Avatars/HEX_BEARD_DARK.png',
  '/Avatars/HEX_BEARD_LIGHT.png',
  '/Avatars/HEX_BOSS_PURPLE.png',
  '/Avatars/HEX_BOSS_RED.png',
  '/Avatars/HEX_GIRL_SMILE_CUP.png',
  '/Avatars/HEX_GIRL_SMILE.png',
  '/Avatars/HEX_SMIRK_CLASSIC.png',
  '/Avatars/HEX_THUG_BEANIE.png',
  '/Avatars/HEX_THUG_CAP.png',
  '/Avatars/HEX_THUG_JOBS.png'
]

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { user, signOut } = useAuth()
  const [avatars, setAvatars] = useState<string[]>(FALLBACK_AVATARS)
  const [selected, setSelected] = useState<string>(FALLBACK_AVATARS[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    // Try to fetch a list.json if present in /Avatars
    fetch('/Avatars/list.json').then(async r => {
      if (!r.ok) return
      const list = await r.json().catch(() => null)
      if (Array.isArray(list) && list.length) setAvatars(list)
    }).catch(() => {})
    // Initialize selection from profile
    if (user?.id) {
      supabase.from('profiles').select('avatar_url').eq('id', user.id).single().then(({ data }) => {
        if (data?.avatar_url) setSelected(data.avatar_url)
      }).catch(() => {})
    }
  }, [isOpen])

  const save = async () => {
    if (!user?.id || !selected) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: selected, avatar_config: null })
      .eq('id', user.id)
    setSaving(false)
    if (!error) {
      try { window.dispatchEvent(new CustomEvent('hex-avatar-updated', { detail: { userId: user.id, snapshotUrl: selected } })) } catch {}
      onSaved?.(selected)
      onClose()
    } else {
      console.error('Failed to save avatar_url', error)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 780, maxWidth: '95vw', background: '#fff', borderRadius: 12, padding: 16 }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>Choose avatar</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={async () => { await signOut(); }} style={{ background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Logout</button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, maxHeight: '50vh', overflowY: 'auto' }}>
          {avatars.map(src => (
            <button key={src} onClick={() => setSelected(src)} style={{ padding: 8, borderRadius: 8, border: selected === src ? '2px solid #4ECDC4' : '1px solid #E5E7EB', background: '#FAFAFB', cursor: 'pointer' }}>
              <img src={src} alt="avatar" style={{ width: '100%', height: 120, objectFit: 'contain', background: 'transparent' }} />
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 12px', background: '#4ECDC4', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

export default AvatarPickerModal


