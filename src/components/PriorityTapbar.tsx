import React from 'react'

type TaskPriority = 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'

interface PriorityTapbarProps {
  currentPriority: TaskPriority
  onPriorityChange: (priority: TaskPriority) => void
  disabled?: boolean
}

export const PriorityTapbar: React.FC<PriorityTapbarProps> = ({
  currentPriority,
  onPriorityChange,
  disabled = false
}) => {
  const getPriorityConfig = (priority: TaskPriority) => {
    switch (priority) {
      case 'v-low':
        return {
          color: '#E5E7EB',
          text: 'V-Low',
          icon: '🟢'
        }
      case 'low':
        return {
          color: '#F3F4F6',
          text: 'Low',
          icon: '🟡'
        }
      case 'medium':
        return {
          color: '#FEF3C7',
          text: 'Medium',
          icon: '🟠'
        }
      case 'high':
        return {
          color: '#FEE2E2',
          text: 'High',
          icon: '🔴'
        }
      case 'veryhigh':
        return {
          color: '#F33A3A',
          text: 'Very High',
          icon: '🔴'
        }
      default:
        return {
          color: '#4ECDC4',
          text: 'Medium',
          icon: '🟡'
        }
    }
  }

  const priorities: TaskPriority[] = ['v-low', 'low', 'medium', 'high', 'veryhigh']

  return (
    <div style={{
      display: 'flex',
      gap: '2px',
      background: 'rgba(0, 0, 0, 0.05)',
      borderRadius: '8px',
      padding: '4px',
      border: '1px solid rgba(0, 0, 0, 0.1)'
    }}>
      {priorities.map((priority) => {
        const config = getPriorityConfig(priority)
        const isActive = currentPriority === priority
        
        return (
          <button
            key={priority}
            onClick={() => !disabled && onPriorityChange(priority)}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '6px 8px',
              background: isActive ? config.color : 'transparent',
              color: isActive ? 'white' : '#666',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              minHeight: '28px'
            }}
          >
            <span style={{ fontSize: '14px' }}>{config.icon}</span>
            <span>{config.text}</span>
          </button>
        )
      })}
    </div>
  )
}
