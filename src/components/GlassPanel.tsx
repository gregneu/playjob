import React from 'react'
import './GlassPanel.css'

interface GlassPanelProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  variant?: 'default' | 'compact' | 'large'
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ 
  children, 
  style = {}, 
  className = '',
  variant = 'default'
}) => {
  const baseClass = 'glass-panel'
  const variantClass = variant !== 'default' ? `glass-panel-${variant}` : ''
  const combinedClassName = `${baseClass} ${variantClass} ${className}`.trim()

  return (
    <div style={style} className={combinedClassName}>
      {children}
    </div>
  )
} 