import React from 'react'

interface SmartTextProps {
  text: string
  className?: string
}

// Функция для извлечения ссылок из текста
const extractLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return {
        type: 'link',
        content: part,
        key: index
      }
    }
    return {
      type: 'text',
      content: part,
      key: index
    }
  })
}

// Функция для определения типа сервиса по URL
const getServiceIcon = (url: string) => {
  const domain = new URL(url).hostname.toLowerCase()
  
  if (domain.includes('github.com')) return '🐙'
  if (domain.includes('figma.com')) return '🎨'
  if (domain.includes('notion.so')) return '📝'
  if (domain.includes('docs.google.com')) return '📄'
  if (domain.includes('slack.com')) return '💬'
  if (domain.includes('discord.com')) return '🎮'
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) return '📺'
  if (domain.includes('vimeo.com')) return '🎬'
  if (domain.includes('dropbox.com')) return '📦'
  if (domain.includes('drive.google.com')) return '☁️'
  if (domain.includes('atlassian.net') || domain.includes('jira.com')) return '🎯'
  if (domain.includes('trello.com')) return '📋'
  if (domain.includes('linear.app')) return '⚡'
  if (domain.includes('miro.com')) return '🖼️'
  if (domain.includes('whimsical.com')) return '✨'
  if (domain.includes('loom.com')) return '🎥'
  if (domain.includes('calendly.com')) return '📅'
  if (domain.includes('zoom.us')) return '🎥'
  if (domain.includes('webflow.com')) return '🌐'
  if (domain.includes('framer.com')) return '🚀'
  
  return '🔗'
}

// Функция для форматирования URL
const formatUrl = (url: string) => {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace(/^www\./, '')
    const path = urlObj.pathname
    
    if (path.length <= 25) {
      return `${domain}${path}`
    }
    
    return `${domain}${path.substring(0, 25)}...`
  } catch {
    return url
  }
}

export const SmartText: React.FC<SmartTextProps> = ({ text, className }) => {
  const parts = extractLinks(text)
  
  return (
    <span className={className}>
      {parts.map((part) => {
        if (part.type === 'link') {
          const icon = getServiceIcon(part.content)
          const formattedUrl = formatUrl(part.content)
          
          return (
            <a
              key={part.key}
              href={part.content}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#3b82f6',
                textDecoration: 'underline',
                textDecorationColor: '#dbeafe',
                textUnderlineOffset: '2px',
                padding: '2px 4px',
                borderRadius: '4px',
                background: '#f0f9ff',
                fontFamily: 'monospace',
                fontSize: '0.9em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dbeafe'
                e.currentTarget.style.textDecorationColor = '#3b82f6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f0f9ff'
                e.currentTarget.style.textDecorationColor = '#dbeafe'
              }}
            >
              <span style={{ fontSize: '12px' }}>{icon}</span>
              {formattedUrl}
            </a>
          )
        }
        
        return part.content
      })}
    </span>
  )
}
