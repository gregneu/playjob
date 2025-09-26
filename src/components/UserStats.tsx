import React from 'react'
import { useProjectStats } from '../hooks/useProjectStats'

interface UserStatsProps {
  projectId: string
  diamonds?: number
  nps?: number
  vacationUsers?: number
}

export const UserStats: React.FC<UserStatsProps> = ({
  projectId,
  diamonds: propDiamonds,
  nps: propNps,
  vacationUsers: propVacationUsers
}) => {
  const { stats, loading } = useProjectStats({ projectId })
  
  // Используем данные из хука, если не переданы пропсы
  const diamonds = propDiamonds !== undefined ? propDiamonds : stats.diamonds
  const nps = propNps !== undefined ? propNps : stats.nps
  const vacationUsers = propVacationUsers !== undefined ? propVacationUsers : stats.vacationUsers

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '8px 16px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        <div style={{
          width: '40px',
          height: '14px',
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '4px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        <div style={{
          width: '20px',
          height: '20px',
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </div>
    )
  }
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '8px 16px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '10px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Diamonds - tabler-icon-diamond-filled */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <img 
          src="/icons/tabler-icon-diamond-filled.svg"
          alt="Diamonds"
          style={{ 
            width: '20px', 
            height: '20px',
            filter: 'brightness(0) saturate(100%) invert(27%) sepia(96%) saturate(1352%) hue-rotate(213deg) brightness(97%) contrast(96%)'
          }}
        />
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          {diamonds}
        </span>
      </div>

      {/* NPS - tabler-icon-nps-filled */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <img 
          src="/icons/tabler-icon-nps-filled.svg"
          alt="NPS"
          style={{ 
            width: '20px', 
            height: '20px',
            filter: 'brightness(0) saturate(100%) invert(50%) sepia(100%) saturate(2000%) hue-rotate(250deg) brightness(90%) contrast(90%)'
          }}
        />
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          +{nps}
        </span>
      </div>

      {/* Vacation Users - tabler-icon-beach */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <img 
          src="/icons/tabler-icon-beach.svg"
          alt="Vacation"
          style={{ 
            width: '20px', 
            height: '20px',
            filter: 'brightness(0) saturate(100%) invert(50%) sepia(100%) saturate(2000%) hue-rotate(120deg) brightness(90%) contrast(90%)'
          }}
        />
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          {vacationUsers}
        </span>
      </div>
    </div>
  )
}
