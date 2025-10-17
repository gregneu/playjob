import React, { useState } from 'react'
import { HexGridSystem } from './HexGridSystem'
import { GlassPanel } from './GlassPanel'
import { UserAvatar } from './UserAvatar'
import { ShareModal } from './share/ShareModal'
// import { Code2, Boxes, Hexagon, FlaskConical } from 'lucide-react'
import { sprintService } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { supabase, getUserAssignedTicketsCount } from '../lib/supabase'
import type { Project } from '../types/enhanced'
import { useProjectStats } from '../hooks/useProjectStats'
// AvatarCreatorModal removed

interface ProjectPageProps {
  project: Project
  onBack: () => void
}

export const ProjectPage: React.FC<ProjectPageProps> = ({ project, onBack }) => {
  const [, setProjectState] = React.useState(project)

  React.useEffect(() => { setProjectState(project) }, [project])

  // Refresh crystals after sprint completion (listen to a simple event)
  React.useEffect(() => {
    const handler = async () => {
      const refreshed = await sprintService.getProject(project.id)
      if (refreshed) setProjectState(refreshed)
    }
    window.addEventListener('sprint-completed', handler as any)
    return () => window.removeEventListener('sprint-completed', handler as any)
  }, [project.id])
  
  const { user } = useAuth()
  const [notificationSummary, setNotificationSummary] = useState<{ unread: number; mentions: number; assignments: number }>({ unread: 0, mentions: 0, assignments: 0 })

  // Обновляем количество назначенных тикетов при изменении назначений
  React.useEffect(() => {
    const handler = () => {
      console.log('🎫 Ticket assignment changed, refreshing count')
      loadAssignedTicketsCount()
    }
    window.addEventListener('ticket-assignment-changed', handler as any)
    return () => window.removeEventListener('ticket-assignment-changed', handler as any)
  }, [project.id, user?.id])
  const [showShareModal, setShowShareModal] = useState(false)
  // const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [assignedTicketsCount, setAssignedTicketsCount] = useState<number>(0)
  const [, setProjectMembers] = useState<Array<{ id: string; full_name: string | null; email: string | null; role: string }>>([])
  const { stats } = useProjectStats({ projectId: project.id })
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [projectIconLocal, setProjectIconLocal] = useState(project.icon || '')
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const placeholderLogoSrc = '/icons/Your_Logo.svg'

  React.useEffect(() => {
    setProjectIconLocal(project.icon || '')
  }, [project.icon])

  const handleLogoSelected = async (file: File) => {
    try {
      setIsUploadingLogo(true)
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let base64 = ''
      if (typeof window !== 'undefined') {
        let binary = ''
        const chunk = 0x8000
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
        }
        base64 = btoa(binary)
      } else if ((globalThis as any).Buffer) {
        base64 = (globalThis as any).Buffer.from(bytes).toString('base64')
      }
      if (!base64) return
      const dataUrl = `data:${file.type || 'image/png'};base64,${base64}`
      const { data, error } = await supabase
        .from('projects')
        .update({ icon: dataUrl, updated_at: new Date().toISOString() })
        .eq('id', project.id)
        .select()
        .single()
      if (error) throw error
      setProjectState(prev => (data ? data : prev))
      setProjectIconLocal(data?.icon || dataUrl)
    } catch (err) {
      console.error('Failed to update project logo', err)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleLogoClick = () => {
    if (isUploadingLogo) return
    window.requestAnimationFrame(() => {
      fileInputRef.current?.click()
    })
  }

  const handleLogoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0]
    if (file) {
      handleLogoSelected(file)
    }
    event.target.value = ''
  }

  const logoIsImage = typeof projectIconLocal === 'string' && (projectIconLocal.startsWith('data:') || projectIconLocal.startsWith('http'))
const progressPercent = Math.min(100, Math.max(0, stats.totalTickets > 0 ? (stats.doneTickets / stats.totalTickets) * 100 : 0))
  
  // expose project globally for in-scene consumers like central flag text
  try { (window as any).currentProject = project } catch {}

  // Функция для загрузки количества назначенных тикетов
  const loadAssignedTicketsCount = async () => {
    if (!user?.id) {
      console.log('❌ No user ID, skipping assigned tickets count load')
      return
    }
    
    console.log('🔄 Loading assigned tickets count for:', { projectId: project.id, userId: user.id })
    
    try {
      const count = await getUserAssignedTicketsCount(project.id, user.id)
      setAssignedTicketsCount(count)
      console.log('📊 Loaded assigned tickets count:', count)
    } catch (error) {
      console.error('❌ Error loading assigned tickets count:', error)
    }
  }

  // Обновляем заголовок страницы
  React.useEffect(() => {
    // Removed excessive logging - this was called on every title update
    const title = assignedTicketsCount > 0 
      ? `(${assignedTicketsCount}) ${project.name}` 
      : project.name
    document.title = title
    // Removed excessive logging - this was called on every title update
  }, [assignedTicketsCount, project.name])

  React.useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ unread: number; mentions: number; assignments: number }>).detail
      if (!detail) return
      setNotificationSummary(detail)
    }

    window.addEventListener('notifications-summary', listener as EventListener)
    return () => window.removeEventListener('notifications-summary', listener as EventListener)
  }, [])

  // Загружаем участников проекта и количество назначенных тикетов
  React.useEffect(() => {
    console.log('🔄 useEffect triggered, loading project members for project:', project.id)
    loadProjectMembers()
    loadAssignedTicketsCount()
  }, [project.id, user?.id])

  const handleUserAdded = (newUser: { id: string; full_name: string | null; email: string | null }) => {
    console.log('👤 User added to project:', newUser)
    
    // Добавляем нового пользователя в список участников
    // setProjectMembers(prev => {
    //   const updated = [...prev, { ...newUser, role: 'member' }]
    //   console.log('📝 Updated project members state:', updated)
    //   return updated
    // })
    
    // Перезагружаем список участников для обновления данных
    setTimeout(() => {
      console.log('🔄 Reloading project members after user addition...')
      loadProjectMembers()
    }, 500)
  }

  // Выносим функцию загрузки участников
  const loadProjectMembers = async () => {
    try {
      console.log('🔄 Loading project members for project:', project.id)
      
      // Используем простой запрос без JOIN
      const { data: membersData, error: membersError } = await supabase
        .from('project_memberships')
        .select('user_id, role, profiles:profiles(full_name, email)')
        .eq('project_id', project.id)

      if (!membersError && membersData && membersData.length > 0) {
        console.log('📊 Raw members data:', membersData)
        
        // Получаем профили отдельно
        const formattedMembers = membersData.map((member: any) => {
          return {
            id: member.user_id,
            full_name: member.profiles?.full_name ?? null,
            email: member.profiles?.email ?? null,
            role: member.role ?? 'viewer'
          }
        })
        console.log('✅ Formatted members:', formattedMembers)
        setProjectMembers(formattedMembers)
      } else {
        console.error('❌ Failed to load project members:', membersError)
        setProjectMembers([])
      }
    } catch (error) {
      console.error('❌ Error loading project members:', error)
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.35)',
      background: 'radial-gradient(1000px 700px at 50% 40%, #FFFFFF 0%, #FFFFFF 20%, #EBECF7 70%, #EBECF7 100%)'
    } as React.CSSProperties}>
      {/* Full Screen Map */}
      <div style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1
      } as React.CSSProperties}>
        <HexGridSystem projectId={project.id} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleLogoInputChange}
      />

      {/* Header Overlay */}
      <div style={{ 
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        pointerEvents: 'none'
      }}>
        <GlassPanel
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            padding: '12px 24px',
            pointerEvents: 'auto',
            background: 'rgba(255,255,255,0.82)'
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Back to projects"
          >
            <img src="/icons/tabler-icon-arrow-left.svg" alt="" style={{ width: '20px', height: '20px' }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
            <div
              onClick={handleLogoClick}
              onKeyDown={(event) => { if (!isUploadingLogo && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); handleLogoClick() } }}
              role="button"
              tabIndex={0}
              aria-label="Upload project logo"
              style={{
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '95px',
                height: '52px',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '26px',
                cursor: isUploadingLogo ? 'default' : 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'inherit',
                  background: 'radial-gradient(circle at 50% 35%, rgba(79,70,229,0.22), rgba(79,70,229,0))',
                  pointerEvents: 'none'
                }}
              />
              {isUploadingLogo ? (
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5', letterSpacing: 0.4 }}>Uploading…</span>
              ) : (
                <img
                  src={logoIsImage ? projectIconLocal : placeholderLogoSrc}
                  alt={logoIsImage ? `${project.name} logo` : 'Default project logo'}
                  style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                padding: '9px 18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src="/icons/tabler-icon-diamond-filled.svg"
                  alt="Diamonds"
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{stats.diamonds}</span>
              </div>
              <div style={{ width: '1px', height: '32px', background: 'rgba(148,163,184,0.35)' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.6 }}>nps</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>+{stats.nps ?? 12}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowShareModal((prev) => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Share project"
          >
            <img
              src="/icons/tabler-icon-world-share.svg"
              alt=""
              style={{ width: '22px', height: '22px' }}
            />
          </button>
        </GlassPanel>

        <GlassPanel
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 20px 16px',
            pointerEvents: 'auto',
            minWidth: '260px',
            background: 'rgba(255,255,255,0.82)'
          }}
        >
          <UserAvatar
            userId={user?.id}
            userName={user?.user_metadata?.full_name || user?.email}
            size={54}
            showName={false}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <div style={{
              height: '6px',
              width: '100%',
              borderRadius: '999px',
              background: 'rgba(148, 163, 184, 0.25)',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #4ade80 0%, #22d3ee 100%)',
                borderRadius: '999px'
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src="/icons/tabler-icon-diamond-filled.svg" alt="Diamonds" style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{stats.diamonds}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src="/icons/tabler-icon-bookmark-filled.svg" alt="Tickets" style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{assignedTicketsCount}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <img src="/icons/tabler-icon-beach.svg" alt="On break" style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{stats.vacationUsers}</span>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        projectName={project.name}
        projectId={project.id}
      />
      {/* AvatarCreatorModal removed */}
    </div>
  )
} 
