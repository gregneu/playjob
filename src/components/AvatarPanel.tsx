import React from 'react'
import { UserAvatar } from './UserAvatar'
import { useAuth } from '../hooks/useAuth'

interface AvatarPanelProps {
  className?: string
}

export const AvatarPanel: React.FC<AvatarPanelProps> = ({ className }) => {
  const { user } = useAuth()
  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', background: 'radial-gradient(1000px 700px at 60% 30%, #0b1020 0%, #060a14 40%, #030611 70%, #000000 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '80%', maxWidth: 420, aspectRatio: '3 / 4', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <UserAvatar userId={user?.id || null} size={520} showName={false} />
        </div>
      </div>
    </div>
  )
}

export default AvatarPanel
