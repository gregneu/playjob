import React from 'react'
import { BarChart3 } from 'lucide-react'
import { MapSnapshot } from './MapSnapshot'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description?: string
    updated_at: string
    color: string
    icon?: string
    tasks_count?: number
    progress?: number
  }
  onClick: () => void
}

const getProjectPreview = (project: ProjectCardProps['project']) => {
  const icon = project.icon || '🎮'
  const color = project.color || '#3B82F6'
  
  // Different preview styles based on project type
  if (icon.includes('📱')) {
    return (
      <div className="preview-wireframe">
        <div className="wireframe-header"></div>
        <div className="wireframe-content">
          <div className="wireframe-sidebar"></div>
          <div className="wireframe-main">
            <div className="wireframe-block" style={{ width: '80%' }}></div>
            <div className="wireframe-block" style={{ width: '60%' }}></div>
            <div className="wireframe-block" style={{ width: '90%' }}></div>
            <div className="wireframe-block" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>
    )
  }
  
  if (icon.includes('🌐')) {
    return (
      <div className="preview-dashboard">
        <div className="dashboard-nav"></div>
        <div className="dashboard-content">
          <div className="dashboard-widget"></div>
          <div className="dashboard-widget"></div>
          <div className="dashboard-widget"></div>
          <div className="dashboard-widget"></div>
        </div>
      </div>
    )
  }
  
  if (icon.includes('🎮')) {
    return (
      <MapSnapshot 
        projectId={project.id} 
        width={'100%'} 
        height={'100%'} 
      />
    )
  }
  
  if (icon.includes('📊')) {
    return (
      <div style={{ 
        background: '#ecfdf5', 
        padding: '15px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px', 
        width: '100%',
        height: '100%'
      }}>
        <div style={{ height: '8px', background: '#10b981', borderRadius: '4px', width: '70%' }}></div>
        <div style={{ height: '6px', background: '#34d399', borderRadius: '3px', width: '50%' }}></div>
        <div style={{ height: '6px', background: '#34d399', borderRadius: '3px', width: '60%' }}></div>
        <div style={{ height: '6px', background: '#34d399', borderRadius: '3px', width: '40%' }}></div>
      </div>
    )
  }
  
  if (icon.includes('🎨')) {
    return (
      <div style={{ 
        background: '#fef7ed', 
        padding: '15px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '4px',
        height: '100%'
      }}>
        <div style={{ height: '15px', background: '#fb923c', borderRadius: '2px' }}></div>
        <div style={{ height: '15px', background: '#fdba74', borderRadius: '2px' }}></div>
        <div style={{ height: '15px', background: '#fed7aa', borderRadius: '2px' }}></div>
        <div style={{ height: '15px', background: '#ffedd5', borderRadius: '2px' }}></div>
        <div style={{ height: '12px', background: '#ea580c', borderRadius: '2px' }}></div>
        <div style={{ height: '12px', background: '#f97316', borderRadius: '2px' }}></div>
        <div style={{ height: '12px', background: '#fb923c', borderRadius: '2px' }}></div>
        <div style={{ height: '12px', background: '#fdba74', borderRadius: '2px' }}></div>
      </div>
    )
  }
  
  if (icon.includes('🔧')) {
    return (
      <div style={{ 
        background: '#fdf2f8', 
        padding: '15px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px',
        height: '100%'
      }}>
        <div style={{ height: '6px', background: '#ec4899', borderRadius: '3px', width: '80%' }}></div>
        <div style={{ height: '6px', background: '#f472b6', borderRadius: '3px', width: '60%' }}></div>
        <div style={{ height: '6px', background: '#f9a8d4', borderRadius: '3px', width: '90%' }}></div>
        <div style={{ height: '6px', background: '#fce7f3', borderRadius: '3px', width: '40%' }}></div>
      </div>
    )
  }
  
  if (icon.includes('🧪')) {
    return (
      <div style={{ 
        background: '#eff6ff', 
        padding: '15px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px',
        height: '100%'
      }}>
        <div style={{ height: '6px', background: '#06b6d4', borderRadius: '3px', width: '60%' }}></div>
        <div style={{ height: '6px', background: '#22d3ee', borderRadius: '3px', width: '80%' }}></div>
        <div style={{ height: '6px', background: '#67e8f9', borderRadius: '3px', width: '45%' }}></div>
        <div style={{ height: '6px', background: '#a5f3fc', borderRadius: '3px', width: '70%' }}></div>
      </div>
    )
  }
  
  if (icon.includes('📚')) {
    return (
      <div style={{ 
        background: '#f0fdf4', 
        padding: '15px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px',
        height: '100%'
      }}>
        <div style={{ height: '6px', background: '#84cc16', borderRadius: '3px', width: '75%' }}></div>
        <div style={{ height: '6px', background: '#a3e635', borderRadius: '3px', width: '55%' }}></div>
        <div style={{ height: '6px', background: '#bef264', borderRadius: '3px', width: '85%' }}></div>
        <div style={{ height: '6px', background: '#d9f99d', borderRadius: '3px', width: '65%' }}></div>
      </div>
    )
  }
  
  // Default preview
  return (
    <div style={{ 
      background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      fontSize: '48px'
    }}>
      {icon}
    </div>
  )
}

const getProjectType = (icon: string) => {
  if (icon.includes('📱')) return { name: 'Mobile', class: 'type-mobile' }
  if (icon.includes('🌐')) return { name: 'Web', class: 'type-web' }
  if (icon.includes('🎮')) return { name: 'Game', class: 'type-game' }
  if (icon.includes('📊')) return { name: 'Analytics', class: 'type-analytics' }
  if (icon.includes('🎨')) return { name: 'Design', class: 'type-figma' }
  if (icon.includes('🔧')) return { name: 'Backend', class: 'type-next' }
  if (icon.includes('🧪')) return { name: 'Testing', class: 'type-archive' }
  if (icon.includes('📚')) return { name: 'Docs', class: 'type-archive' }
  return { name: 'Project', class: 'type-figma' }
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short' 
    })
  }

  return (
    <div 
      onClick={onClick}
      className="project-card transition-all duration-200 cursor-pointer group fade-in"
      style={{ 
        background: '#0b1222',
        borderRadius: '16px',
        height: '280px',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        margin: 0
      }}
    >
      <div 
        className="project-preview w-full relative overflow-hidden" 
        style={{ 
          borderRadius: '16px 16px 0 0',
          height: '68%'
        }}
      >
        {getProjectPreview(project)}
      </div>
      
      <div className="project-info flex-1 p-4" style={{ padding: '16px', background: '#FFFFFF', borderRadius: '0 0 16px 16px' }}>
        <div className="project-title text-sm font-semibold mb-1 line-clamp-1" style={{ 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: '#111827',
          marginBottom: '2px'
        }}>
          {project.name}
        </div>
        
        <div className="project-meta flex items-center" style={{ color: '#6B7280', fontSize: '12px', marginTop: 0 }}>
          <span>Updated {formatDate(project.updated_at)}</span>
        </div>
        
        {project.tasks_count !== undefined && (
          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: '#6B7280' }}>
            <BarChart3 size={10} />
            <span>{project.tasks_count} tasks</span>
          </div>
        )}
        
        {project.progress !== undefined && (
          <div className="mt-2 mb-4">
            <div className="w-full h-2 rounded-full overflow-hidden relative" style={{ background: '#E5E7EB' }}>
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${project.progress}%`,
                  backgroundColor: project.color || '#3B82F6'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 