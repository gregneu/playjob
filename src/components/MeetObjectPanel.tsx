import React, { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MeetVideoGrid } from './MeetVideoGrid'

interface MeetObjectPanelProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  buildingTitle: string
  userName?: string
  userEmail?: string
  userAvatarUrl?: string
  userAvatarConfig?: any
  userId?: string
  side?: 'left' | 'right'
  onParticipantsChange?: (roomId: string, participants: any[]) => void
}

export const MeetObjectPanel: React.FC<MeetObjectPanelProps> = ({
  isOpen,
  onClose,
  roomId,
  buildingTitle,
  userName = 'Guest',
  userEmail,
  userAvatarUrl,
  userAvatarConfig,
  userId,
  side = 'right',
  onParticipantsChange
}) => {
  const [participantCount, setParticipantCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const videoGridRef = useRef<{ disconnect: () => Promise<void> } | null>(null)

  // Handle connection state changes
  const handleConnectionChange = useCallback((connected: boolean, count: number) => {
    setIsConnected(connected)
    setParticipantCount(count)
  }, [])

  const handleParticipantsChange = useCallback((participants: any[]) => {
    if (onParticipantsChange) {
      onParticipantsChange(roomId, participants)
    }
  }, [onParticipantsChange, roomId])

  // Handle errors
  const handleError = useCallback((error: string) => {
    setConnectionError(error)
  }, [])

  // Handle close with proper cleanup
  const handleClose = useCallback(async () => {
    console.log('🚪 Closing Meet panel, disconnecting from room...')
    
    try {
      // Disconnect from room and stop all tracks
      if (videoGridRef.current) {
        console.log('🔌 Calling disconnect on video grid...')
        await videoGridRef.current.disconnect()
        console.log('✅ Video grid disconnected successfully')
      } else {
        console.log('⚠️ No video grid ref available for disconnect')
      }
    } catch (error) {
      console.error('❌ Error during video grid disconnect:', error)
    } finally {
      // Always clear state and close panel, even if disconnect failed
      console.log('🧹 Clearing panel state...')
      setParticipantCount(0)
      setIsConnected(false)
      setConnectionError(null)
      
      // Call parent close handler to close the panel
      console.log('🚪 Calling parent onClose...')
      onClose()
    }
  }, [onClose])

  // ESC key handler
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  // Cleanup on unmount or when panel closes
  React.useEffect(() => {
    return () => {
      if (videoGridRef.current) {
        console.log('🧹 MeetObjectPanel unmounting, cleaning up...')
        videoGridRef.current.disconnect().catch(error => {
          console.warn('⚠️ Error during cleanup disconnect:', error)
        })
      }
    }
  }, [])

  if (!isOpen) return null

  return createPortal(
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 2500,
      pointerEvents: 'none'
    }}>
      <div style={{
        position: 'absolute',
        top: 16,
        right: side === 'right' ? 16 : 'auto',
        left: side === 'left' ? 16 : 'auto',
        bottom: 16,
        width: 386,
        borderRadius: '20px',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: isOpen ? 'translateX(0)' : side === 'right' ? 'translateX(100%)' : 'translateX(-100%)',
        pointerEvents: 'auto',
        opacity: isOpen ? 1 : 0
      }}>
        <div
          onMouseEnter={() => {
            try { window.dispatchEvent(new CustomEvent('sidebar-hover', { detail: { hover: true } })) } catch {}
          }}
          onMouseLeave={() => {
            try { window.dispatchEvent(new CustomEvent('sidebar-hover', { detail: { hover: false } })) } catch {}
          }}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '20px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
            background: 'rgba(0, 0, 0, 0.01)',
            border: '1.5px solid rgba(255, 255, 255, 0.05)',
            position: 'relative'
          } as any}>
          
          {/* Header */}
          <div style={{
            height: '134px',
            display: 'flex',
            flexDirection: 'column',
            padding: '0px 16px 16px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px 20px 0 0',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          } as any}>
            {/* Top row: Title and Close button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', height: '64px' } as any}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                {/* Video icon */}
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px'
                }}>
                  📹
                </div>
                
                {/* Title and participant count */}
                <div style={{ flex: 1 }}>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: 600, 
                    color: '#374151',
                    lineHeight: '1.2'
                  }}>
                    {buildingTitle}
                  </h2>
                  <p style={{ 
                    margin: '4px 0 0', 
                    fontSize: '13px', 
                    color: '#6B7280',
                    lineHeight: '1.2'
                  }}>
                    {participantCount} participant{participantCount !== 1 ? 's' : ''}
                    {connectionError && ' • Connection Error'}
                  </p>
                </div>
              </div>
              
              {/* Close button */}
              <button
                onClick={handleClose}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(0, 0, 0, 0.1)',
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Connection status */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '12px',
              color: isConnected ? '#10B981' : connectionError ? '#EF4444' : '#6B7280'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? '#10B981' : connectionError ? '#EF4444' : '#6B7280'
              }}></div>
              {isConnected ? 'Connected' : connectionError ? 'Connection Failed' : 'Connecting...'}
            </div>
          </div>
          
          {/* Content */}
          <div style={{
            flex: 1,
            overflow: 'hidden',
            background: 'transparent'
          }}>
                <MeetVideoGrid
                  ref={videoGridRef}
                  roomId={roomId}
                  userName={userName}
                  userEmail={userEmail}
                  userAvatarUrl={userAvatarUrl}
                  userAvatarConfig={userAvatarConfig}
                  userId={userId}
                  onConnectionChange={handleConnectionChange}
                  onError={handleError}
                  onParticipantsChange={handleParticipantsChange}
                />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
