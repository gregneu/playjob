import React from 'react'

type TaskStatus = 'open' | 'in_progress' | 'done'

interface StatusTapbarProps {
  currentStatus: TaskStatus
  onStatusChange: (status: TaskStatus) => void
  disabled?: boolean
}

export const StatusTapbar: React.FC<StatusTapbarProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false
}) => {
  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'open':
        return {
          color: '#FEE2E2',
          text: 'Open',
          icon: '📋'
        }
      case 'in_progress':
        return {
          color: '#DBEAFE',
          text: 'In Progress',
          icon: '⚡'
        }
      case 'done':
        return {
          color: '#D1FAE5',
          text: 'Done',
          icon: '✅'
        }
      default:
        return {
          color: '#FF6B6B',
          text: 'Open',
          icon: '📋'
        }
    }
  }

  const statuses: TaskStatus[] = ['open', 'in_progress', 'done']

  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      background: 'rgba(0, 0, 0, 0.05)',
      borderRadius: '8px',
      padding: '4px',
      border: '1px solid rgba(0, 0, 0, 0.1)'
    }}>
      {statuses.map((status) => {
        const config = getStatusConfig(status)
        const isActive = currentStatus === status
        
        return (
          <button
            key={status}
            onClick={() => !disabled && onStatusChange(status)}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: isActive ? config.color : 'transparent',
              color: isActive ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: '32px'
            }}
          >
            <span style={{ fontSize: '16px' }}>{config.icon}</span>
            <span>{config.text}</span>
          </button>
        )
      })}
    </div>
  )
}
