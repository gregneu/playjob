import React, { useState } from 'react'
import { HexGridSystem } from './HexGridSystem'
import { GlassPanel } from './GlassPanel'
import { UserAvatar } from './UserAvatar'
import { UserStats } from './UserStats'
import { ShareProjectModal } from './ShareProjectModal'
// import { Code2, Boxes, Hexagon, FlaskConical } from 'lucide-react'
import { sprintService } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { supabase, getUserAssignedTicketsCount } from '../lib/supabase'
import type { Project } from '../types/enhanced'
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
    console.log('🔄 Title useEffect triggered with:', { assignedTicketsCount, projectName: project.name })
    const title = assignedTicketsCount > 0 
      ? `(${assignedTicketsCount}) ${project.name}` 
      : project.name
    document.title = title
    console.log('📝 Updated page title:', title)
  }, [assignedTicketsCount, project.name])

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
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', project.id)

      // Also read pending invitations for local preview
      const { data: _pendingInvites } = await supabase
        .from('project_invitations')
        .select('email, role, status')
        .eq('project_id', project.id)

      if (!membersError && membersData && membersData.length > 0) {
        console.log('📊 Raw members data:', membersData)
        
        // Получаем профили отдельно
        const userIds = membersData.map(m => m.user_id).filter(Boolean)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        
        if (!profilesError && profilesData) {
          const formattedMembers = membersData.map((member: any) => {
            const profile = profilesData.find(p => p.id === member.user_id)
            return {
              id: member.user_id,
              full_name: profile?.full_name ?? null,
              email: profile?.email ?? null,
              role: member.role ?? 'member'
            }
          })
          console.log('✅ Formatted members:', formattedMembers)
          setProjectMembers(formattedMembers)
        } else {
          console.error('❌ Failed to load profiles:', profilesError)
          setProjectMembers([])
        }
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

      {/* Header Overlay */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <GlassPanel style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '8px 16px'
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '8px 32px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Back
          </button>

          {/* Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              marginLeft: '16px'
            } as React.CSSProperties}
            title="Share project"
          >
            <img 
              src="/icons/tabler-icon-world-share.svg" 
              alt="Share" 
              style={{ 
                width: '16px', 
                height: '16px',
                filter: 'brightness(0) invert(1)' // Делаем иконку белой
              } as React.CSSProperties} 
            />
          </button>
        </GlassPanel>
        
        {/* Statistics Panel - positioned in top right corner, vertically centered */}
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '16px',
          transform: 'translateY(-50%)',
          zIndex: 110
        }}>
          <UserStats projectId={project.id} />
        </div>
        {/* Avatar editor removed */}
      </div>

      {/* Centered user avatar in header */}
      <div style={{ position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', zIndex: 110 }}>
        <UserAvatar userId={user?.id} userName={user?.user_metadata?.full_name || user?.email} size={56} showName={false} />
      </div>

      {/* Share Project Modal */}
      <ShareProjectModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        projectName={project.name}
        projectId={project.id}
        currentUserId={user?.id || ''}
        onUserAdded={handleUserAdded}
      />
      {/* AvatarCreatorModal removed */}
    </div>
  )
} 