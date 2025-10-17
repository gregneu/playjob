import React, { useEffect, useMemo, useState } from 'react'
import { userService } from '../lib/userService'
import { createHexAvatar, type HexAvatarConfig } from '../lib/hexAvatar'
import { Canvas } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  username?: string | null
}

interface UserAvatarProps {
  userId?: string | null
  userName?: string | null
  size?: number
  showName?: boolean
  className?: string
  onClick?: () => void
  showDropdown?: boolean
  animate?: boolean
  // When true, large avatars may render 3D hex using avatar_config. Default: false (always PNG)
  renderHex3D?: boolean
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  userName,
  size = 28,
  showName = false,
  className = '',
  onClick,
  showDropdown = false,
  animate: _animate = false,
  renderHex3D = false
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [, setIsLoading] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    if (userId) {
      setIsLoading(true)
      userService.getUserProfile(userId, true).then(profile => {
        setUserProfile(profile)
        setIsLoading(false)
      })
    }
  }, [userId])

  // Listen for global updates when avatar saved in panel
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string; config: HexAvatarConfig; snapshotUrl?: string }>).detail
      if (!detail) return
      if (detail.userId === userId) {
        // мгновенно обновляем локально, не дожидаясь перезагрузки из БД
        setUserProfile(prev => prev ? { ...prev, avatar_config: detail.config, avatar_url: detail.snapshotUrl ?? (prev as any).avatar_url } as any : prev)
      }
    }
    window.addEventListener('hex-avatar-updated', handler as EventListener)
    return () => window.removeEventListener('hex-avatar-updated', handler as EventListener)
  }, [userId])

  // Закрытие dropdown при клике вне его области
  useEffect(() => {
    if (!showDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const currentTarget = event.currentTarget as Element
      if (currentTarget && !currentTarget.contains(target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  // Определяем отображаемую информацию
  const displayName = userName || (userProfile ? userService.getDisplayName(userProfile) : 'Unassigned')
  // initials no longer used when small avatars render 3D preview

  // Проверяем, валидный ли userId (не пустой и не слишком короткий)
  const hasValidUserId = Boolean(userId && userId.length > 10) // UUID обычно длиннее 10 символов
  
  // Определяем, нужно ли показывать fallback
  // Fallback показываем только если нет userName И нет userProfile И userId невалидный
  const shouldShowFallback = !userName && !userProfile && !hasValidUserId

  // Ready Player Me test avatar (requested by user)
  // Remove external fallback; default to simple hex-human if no config
  const TEST_GLB_URL = ''

  // Prefer user's avatar_url if it looks like a GLB, otherwise use the test model
  const avatarModelUrl = useMemo(() => {
    const url = userProfile?.avatar_url || ''
    if (url.toLowerCase().endsWith('.glb')) return url
    return TEST_GLB_URL
  }, [userProfile?.avatar_url])

  const show3D = renderHex3D && size > 48 && !(window as any).isIn3DScene
  // Removed excessive logging - this was called on every render

  // AvatarModel component removed to fix linter warning
  try { useGLTF.preload(avatarModelUrl) } catch {}

  const HexAvatarNode: React.FC<{ config: HexAvatarConfig }> = ({ config }) => {
    const groupRef = React.useRef<THREE.Group>(null)
    React.useLayoutEffect(() => {
      if (!groupRef.current) return
      createHexAvatar(groupRef.current, config)
      groupRef.current.rotation.set(0, Math.PI, 0)
      groupRef.current.position.set(0, -0.3, 0)
      groupRef.current.scale.setScalar(0.9)
    }, [config])
    return <group ref={groupRef} />
  }

  return (
    <div className={className} style={{ 
      position: 'relative',
      display: 'flex', 
      flexDirection: size > 80 ? 'column' : 'row',
      alignItems: 'center', 
      gap: size > 80 ? '16px' : '8px' 
    }}>
      {/* Аватар */}
      <div 
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: size > 80 ? '12px' : '0',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: 'none',
          cursor: onClick || showDropdown ? 'pointer' : 'default',
          transition: 'all 0.2s ease'
        } as React.CSSProperties}
        onClick={() => {
          if (onClick) {
            onClick()
          } else if (showDropdown) {
            setIsDropdownOpen(!isDropdownOpen)
          }
        }}
        onMouseEnter={() => {
          if (onClick || showDropdown) {
            // Можно добавить hover эффект
          }
        }}
      >
        {show3D && (userProfile as any)?.avatar_config ? (
          <Canvas
            style={{ width: '100%', height: '100%' } as React.CSSProperties}
            camera={{ position: [0, 1.5, 2.7], fov: 26 }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[2, 3, 2]} intensity={0.8} />
            {/* Always render hex avatar; default if none in profile */}
            <HexAvatarNode config={((userProfile as any)?.avatar_config || { characterType: 'human', colors: { skin: 0xD4A574, cloth: 0x4ECDC4 } }) as HexAvatarConfig} />
          </Canvas>
        ) : shouldShowFallback ? (
          // Показываем "?" для неопределенного пользователя
          <span style={{
            color: 'white',
            fontSize: `${Math.max(12, size * 0.5)}px`,
            fontWeight: '600',
            lineHeight: 1
          }}>
            ?
          </span>
        ) : (
          // Маленькие аватарки: показываем сохранённый avatar_url или placeholder
          <img
            src={(userProfile as any)?.avatar_url || '/Avatars/placeholder.png'}
            alt="avatar"
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'transparent' } as React.CSSProperties}
          />
        )}
      </div>

      {/* Имя пользователя (если нужно) */}
      {showName && (
        <span style={{
          fontSize: '12px',
          color: '#FFFFFF',
          fontWeight: '500',
          fontFamily: 'Inter, sans-serif',
          textAlign: size > 80 ? 'center' : 'left'
        }}>
          {shouldShowFallback ? 'Unassigned' : displayName}
        </span>
      )}

      {/* Dropdown меню */}
      {showDropdown && isDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: 'rgba(0, 0, 0, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '8px 0',
          minWidth: '160px',
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '4px'
          }}>
            {displayName}
          </div>
          <button
            onClick={() => {
              setIsDropdownOpen(false)
              if (onClick) {
                onClick()
              }
            }}
            style={{
              width: '100%',
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              color: '#EF4444',
              fontSize: '14px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
            }}
          >
            <span style={{ fontSize: '16px' }}>🚪</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
