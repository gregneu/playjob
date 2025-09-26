import React, { useState } from 'react'
import minusIcon from '/icons/tabler-icon-minus.svg'

interface SmartLinkProps {
  url: string
  title?: string
  description?: string
  onDelete?: () => void
}

// Функция для определения типа сервиса по URL
const getServiceInfo = (url: string) => {
  const domain = new URL(url).hostname.toLowerCase()
  
  // GitHub
  if (domain.includes('github.com')) {
    return {
      name: 'GitHub',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Figma
  if (domain.includes('figma.com')) {
    return {
      name: 'Figma',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Notion
  if (domain.includes('notion.so')) {
    return {
      name: 'Notion',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Google Docs
  if (domain.includes('docs.google.com')) {
    return {
      name: 'Google Docs',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Slack
  if (domain.includes('slack.com')) {
    return {
      name: 'Slack',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Discord
  if (domain.includes('discord.com')) {
    return {
      name: 'Discord',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // YouTube
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
    return {
      name: 'YouTube',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Vimeo
  if (domain.includes('vimeo.com')) {
    return {
      name: 'Vimeo',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Dropbox
  if (domain.includes('dropbox.com')) {
    return {
      name: 'Dropbox',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Google Drive
  if (domain.includes('drive.google.com')) {
    return {
      name: 'Google Drive',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Jira
  if (domain.includes('atlassian.net') || domain.includes('jira.com')) {
    return {
      name: 'Jira',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Trello
  if (domain.includes('trello.com')) {
    return {
      name: 'Trello',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Linear
  if (domain.includes('linear.app')) {
    return {
      name: 'Linear',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Miro
  if (domain.includes('miro.com')) {
    return {
      name: 'Miro',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Whimsical
  if (domain.includes('whimsical.com')) {
    return {
      name: 'Whimsical',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Loom
  if (domain.includes('loom.com')) {
    return {
      name: 'Loom',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Calendly
  if (domain.includes('calendly.com')) {
    return {
      name: 'Calendly',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Zoom
  if (domain.includes('zoom.us')) {
    return {
      name: 'Zoom',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Webflow
  if (domain.includes('webflow.com')) {
    return {
      name: 'Webflow',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Framer
  if (domain.includes('framer.com')) {
    return {
      name: 'Framer',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Behance
  if (domain.includes('behance.net')) {
    return {
      name: 'Behance',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // Dribbble
  if (domain.includes('dribbble.com')) {
    return {
      name: 'Dribbble',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0'
    }
  }
  
  // По умолчанию для неизвестных сервисов
  return {
    name: 'Link',
    bgColor: '#f8fafc',
    borderColor: '#e2e8f0'
  }
}

// Компонент для загрузки фавикона
const FaviconIcon: React.FC<{ url: string }> = ({ url }) => {
  try {
    const domain = new URL(url).hostname
    return (
      <img 
        alt="Favicon" 
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
        style={{
          width: '55%',
          height: '55%',
          objectFit: 'contain',
          borderRadius: '12px'
        }}
      />
    )
  } catch {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#6b7280'
      }}>
        🔗
      </div>
    )
  }
}

// Функция для умного форматирования URL
const formatUrl = (url: string) => {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    const path = urlObj.pathname
    
    // Убираем www. если есть
    const cleanDomain = domain.replace(/^www\./, '')
    
    // Если путь короткий, показываем полностью
    if (path.length <= 30) {
      return `${cleanDomain}${path}`
    }
    
    // Если путь длинный, обрезаем
    return `${cleanDomain}${path.substring(0, 30)}...`
  } catch {
    return url
  }
}

export const SmartLink: React.FC<SmartLinkProps> = ({ url, title, description, onDelete }) => {
  const serviceInfo = getServiceInfo(url)
  const formattedUrl = formatUrl(url)
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noreferrer"
      style={{ 
        textDecoration: 'none',
        display: 'block',
        marginBottom: '12px'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0px',
        background: 'rgb(248, 250, 252)',
        transition: '0.2s',
        cursor: 'pointer',
        transform: 'translateY(0px)',
        boxShadow: 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      >
        {/* Иконка сервиса */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          <FaviconIcon url={url} />
        </div>
        
        {/* Информация о ссылке - только название сервиса и URL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px',
            color: isHovered ? '#000000' : '#6b7280',
            fontWeight: isHovered ? '600' : '400',
            marginBottom: '4px',
            lineHeight: '1.3',
            transition: 'all 0.2s ease'
          }}>
            {serviceInfo.name}
          </div>
          
          <div style={{
            fontSize: '12px',
            color: '#3b82f6',
            fontFamily: 'monospace',
            lineHeight: '1.3',
            textDecoration: isHovered ? 'underline' : 'none',
            textUnderlineOffset: '2px',
            transition: 'all 0.2s ease'
          }}>
            {formattedUrl}
          </div>
        </div>
        
        {/* Кнопка удаления справа */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete()
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}

          >
            <img 
              src={minusIcon} 
              alt="Delete" 
              style={{
                width: '16px',
                height: '16px',
                filter: 'brightness(0)',
                opacity: isHovered ? 1 : 0.16
              }}
            />
          </button>
        )}
      </div>
    </a>
  )
}
