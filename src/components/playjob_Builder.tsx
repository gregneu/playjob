import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'
import { ProjectCard } from './ProjectCard'
import AvatarPickerModal from './AvatarPickerModal'
import { CreateProjectModal } from './CreateProjectModal'
import { ProjectPage } from './ProjectPage'
import { GlassPanel } from './GlassPanel'
import BuildingShowcase from './BuildingShowcase'
import { UserAvatar } from './UserAvatar'
import type { Project } from '../types/enhanced'
// Removed HexAvatarPanel/AvatarPanel for placeholder layout

const PlayjobBuilder = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { projects, loading, createProject, reloadProjects } = useProjects(user?.id || null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showBuildingShowcase, setShowBuildingShowcase] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const reloadAttemptRef = useRef<string | null>(null)

  const routeProjectId = useMemo(() => {
    const match = location.pathname.match(/^\/project\/([0-9a-fA-F-]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/)
    return match ? match[1] : null
  }, [location.pathname])

  useEffect(() => {
    if (!routeProjectId) {
      reloadAttemptRef.current = null
      setSelectedProject(null)
      return
    }

    const project = projects.find((item) => item.id === routeProjectId)

    if (project) {
      reloadAttemptRef.current = null
      setSelectedProject(project)
      return
    }

    if (!loading && reloadAttemptRef.current !== routeProjectId) {
      reloadAttemptRef.current = routeProjectId
      reloadProjects().catch((error) => {
        console.warn('Failed to reload projects after route change:', error)
      })
    }
  }, [routeProjectId, projects, loading, reloadProjects])

  useEffect(() => {
    if (!routeProjectId) {
      return
    }

    if (!loading && reloadAttemptRef.current === routeProjectId) {
      const project = projects.find((item) => item.id === routeProjectId)
      if (!project) {
        console.warn('Project for route not found, redirecting to home', routeProjectId)
        navigate('/', { replace: true })
        reloadAttemptRef.current = null
      }
    }
  }, [routeProjectId, projects, loading, navigate])

  // Reset selection if a mock project (non-UUID id) gets selected before auth loads
  useEffect(() => {
    if (selectedProject && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(selectedProject.id)) {
      console.warn('Selected mock project detected, resetting selection')
      setSelectedProject(null)
    }
  }, [selectedProject])

  // Center avatar now uses unified UserAvatar component directly

  const handleCreateProject = async (projectData: { name: string; description?: string; color: string; icon: string }) => {
    try {
      await createProject(projectData)
    } catch (error) {
      console.warn('Failed to create project:', error)
      // Здесь можно добавить toast уведомление об ошибке
    }
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    navigate(`/project/${project.id}`)
  }

  const handleBackToProjects = () => {
    setSelectedProject(null)
    navigate('/')
  }

  // const handleSignOut = async () => {
  //   try {
  //     const { error } = await signOut()
  //     if (error) {
  //       console.error('Error signing out:', error)
  //     } else {
  //       // После выхода из аккаунта пользователь будет перенаправлен на страницу логина
  //       // благодаря логике в useAuth
  //       console.log('Successfully signed out')
  //     }
  //   } catch (err) {
  //     console.error('Error during sign out:', err)
  //   }
  // }


  if (showBuildingShowcase) {
    return <BuildingShowcase onBack={() => setShowBuildingShowcase(false)} />
  }











  if (selectedProject) {
    return <ProjectPage project={selectedProject} onBack={handleBackToProjects} />
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(1000px 700px at 50% 40%, #FFFFFF 0%, #FFFFFF 20%, #EBECF7 70%, #EBECF7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Hexagon Loading Animation */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="100" height="100" viewBox="-0.1 -0.1 1.2 1.2" style={{ marginBottom: '24px' }}>
            <path 
              className="hexagon-loading hexagon-background" 
              d="M0.4625 0.01165063509
                 a0.075 0.075 0 0 1 0.075 0
                 l0.3666729559 0.2116987298
                 a0.075 0.075 0 0 1 0.0375 0.06495190528
                 l0 0.4233974596
                 a0.075 0.075 0 0 1 -0.0375 0.06495190528
                 l-0.3666729559 0.2116987298
                 a0.075 0.075 0 0 1 -0.075 0
                 l-0.3666729559 -0.2116987298
                 a0.075 0.075 0 0 1 -0.0375 -0.06495190528
                 l0 -0.4233974596
                 a0.075 0.075 0 0 1 0.0375 -0.06495190528 Z" 
            />
            <path 
              className="hexagon-loading hexagon-trace" 
              d="M0.4625 0.01165063509
                 a0.075 0.075 0 0 1 0.075 0
                 l0.3666729559 0.2116987298
                 a0.075 0.075 0 0 1 0.0375 0.06495190528
                 l0 0.4233974596
                 a0.075 0.075 0 0 1 -0.0375 0.06495190528
                 l-0.3666729559 0.2116987298
                 a0.075 0.075 0 0 1 -0.075 0
                 l-0.3666729559 -0.2116987298
                 a0.075 0.075 0 0 1 -0.0375 -0.06495190528
                 l0 -0.4233974596
                 a0.075 0.075 0 0 1 0.0375 -0.06495190528 Z" 
            />
          </svg>
          
          <div style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Loading project data...
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#6B7280',
            opacity: 0.8
          }}>
            Preparing your workspace
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(1000px 700px at 50% 40%, #FFFFFF 0%, #FFFFFF 20%, #EBECF7 70%, #EBECF7 100%)',
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '1fr',
      gridTemplateRows: '80px 1fr'
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        minHeight: '80px', padding: '0 32px',
        gridColumn: '1 / span 2',
        gridRow: '1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'transparent'
      }}>
        {/* Create Project Button */}
        <button 
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '8px 16px',
            background: '#111827',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={16} />
          Новый проект
        </button>

        {/* Building Showcase Button */}
        <button 
          onClick={() => setShowBuildingShowcase(true)}
          style={{
            padding: '8px 16px',
            background: '#7C3AED',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🏗️ Building Showcase
        </button>
        
        
        {/* User Avatar clickable to open picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserAvatar 
            userId={user?.id}
            userName={user?.user_metadata?.full_name || user?.email}
            size={32}
            showName={false}
            onClick={() => setShowAvatarModal(true)}
          />
        </div>
        {/* Edit button no longer needed when editor is always visible */}
      </header>





      {/* Content */}
      <main style={{ padding: '24px 32px', width: '100%', gridRow: '2', gridColumn: '1', alignSelf: 'start' }}>
        {/* Center avatar + name + role (unified component uses DB image/placeholder) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <UserAvatar userId={user?.id} size={160} showName={false} />
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 600, color: '#1f2937' }}>{user?.user_metadata?.full_name || user?.email || 'User'}</div>
          <div style={{ marginTop: 4, fontSize: 14, color: '#6b7280' }}>{(user as any)?.user_metadata?.role || 'Member'}</div>
        </div>
        {projects.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 0'
          }}>
            <GlassPanel style={{
              display: 'inline-block',
              padding: '40px',
              maxWidth: '500px'
            }}>
              <div style={{
                width: '96px',
                minHeight: '96px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <Plus size={32} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'white',
                marginBottom: '8px'
              }}>
                You have no projects yet
              </h3>
              <p style={{
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '24px',
                maxWidth: '400px',
                margin: '0 auto 24px'
              }}>
                Create your first project and start working with PlayJob
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '12px 24px',
                  background: '#4ECDC4',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                <Plus size={16} />
                Create first project
              </button>
            </GlassPanel>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 360px)',
            gap: '16px',
            justifyContent: 'center',
            alignContent: 'start',
            maxWidth: 'calc(3 * 360px + 2 * 16px)',
            margin: '0 auto',
            width: '100%'
          }}>
            {projects.map((project, index) => (
              <div key={project.id} style={{ 
                animationDelay: `${index * 0.1}s`,
                animation: 'fadeIn 0.5s ease-in-out',
                width: 360,
                justifySelf: 'center'
              }}>
                <ProjectCard
                  project={project}
                  onClick={() => handleProjectClick(project)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateProject={handleCreateProject}
      />

      <AvatarPickerModal isOpen={showAvatarModal} onClose={() => setShowAvatarModal(false)} />
      
      
    </div>
  )
}

export default PlayjobBuilder 
