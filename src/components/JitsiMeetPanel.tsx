import React, { useEffect, useRef, useState, useCallback } from 'react'

// Extend Window interface for JitsiMeetExternalAPI
declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

interface JitsiMeetPanelProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  buildingTitle: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  side?: 'left' | 'right'
}

export const JitsiMeetPanel: React.FC<JitsiMeetPanelProps> = ({
  isOpen,
  onClose,
  roomId,
  buildingTitle,
  userName = 'Guest',
  userEmail,
  side = 'right'
}) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null)
  const [jitsiApi, setJitsiApi] = useState<any>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Load Jitsi IFrame API dynamically from CDN
  useEffect(() => {
    if (!isOpen) return

    // Reset states when panel opens
    setIsLoading(true)
    setConnectionError(null)
    console.log('🎥 Loading Jitsi IFrame API from CDN...')

    // Check if already loaded
    if (window.JitsiMeetExternalAPI) {
      console.log('🎥 JitsiMeetExternalAPI already loaded')
      initializeJitsi()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    
    script.onload = () => {
      console.log('✅ Jitsi IFrame API loaded successfully')
      initializeJitsi()
    }
    
    script.onerror = (error) => {
      console.error('❌ Failed to load Jitsi IFrame API:', error)
      setIsLoading(false)
      setConnectionError('Failed to load Jitsi SDK')
    }
    
    document.body.appendChild(script)

    return () => {
      // Cleanup script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [isOpen])

  const initializeJitsi = useCallback(() => {
    if (!window.JitsiMeetExternalAPI) {
      console.error('❌ JitsiMeetExternalAPI is not available')
      setConnectionError('Jitsi API not loaded')
      setIsLoading(false)
      return
    }

    console.log('🎥 Initializing Jitsi IFrame API...')

    const domain = 'meet.jit.si'
    const cleanRoomId = roomId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
    const playjoobRoomId = `playjoob-meet-${cleanRoomId}`
    
    console.log('🎥 Room name:', playjoobRoomId)
    console.log('🎥 User name:', userName)

    const options = {
      roomName: playjoobRoomId,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: userName,
        email: userEmail
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        enableWelcomePage: false
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'hangup', 'tileview'
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false
      }
    }

    try {
      const api = new window.JitsiMeetExternalAPI(domain, options)
      setJitsiApi(api)
      setIsLoading(false)

      // Event listeners
      api.addEventListener('participantJoined', () => {
        api.getNumberOfParticipants().then((count: number) => setParticipantCount(count))
      })
      
      api.addEventListener('participantLeft', () => {
        api.getNumberOfParticipants().then((count: number) => setParticipantCount(count))
      })

      api.addEventListener('videoConferenceLeft', () => {
        console.log('👋 Left conference')
        onClose()
      })

      api.addEventListener('readyToClose', () => {
        console.log('👋 Ready to close')
        onClose()
      })

      console.log('✅ Jitsi IFrame API initialized successfully')

    } catch (error) {
      console.error('❌ Failed to initialize Jitsi IFrame API:', error)
      setConnectionError('Failed to initialize Jitsi meeting')
      setIsLoading(false)
    }
  }, [roomId, userName, userEmail, onClose])

  // Cleanup Jitsi API when component unmounts
  useEffect(() => {
    return () => {
      if (jitsiApi) {
        console.log('🎥 Disposing Jitsi API...')
        jitsiApi.dispose()
      }
    }
  }, [jitsiApi])


  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      [side]: 0,
      width: '480px',
      height: '100vh',
      background: 'rgba(55, 65, 81, 0.95)',
      backdropFilter: 'blur(12px)',
      boxShadow: side === 'right' ? '-4px 0 24px rgba(0,0,0,0.2)' : '4px 0 24px rgba(0,0,0,0.2)',
      zIndex: 2500,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 600 }}>
            {buildingTitle}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
            {participantCount} participant{participantCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          ✕
        </button>
      </div>

      {/* Jitsi Container */}
      <div 
        ref={jitsiContainerRef}
        style={{
          flex: 1,
          background: '#000',
          position: 'relative'
        }}
      />

      {/* Loading/Error States */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          zIndex: 10
        }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>Connecting to video room...</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            Room: {roomId}
          </div>
        </div>
      )}

      {connectionError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#ef4444',
          zIndex: 10
        }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>Connection failed: {connectionError}</div>
          <button
            onClick={() => {
              setConnectionError(null)
              setIsLoading(true)
              initializeJitsi()
            }}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  )
}
