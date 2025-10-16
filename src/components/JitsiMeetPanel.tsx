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

  // Function to get JWT token from Supabase Edge Function
  const getJitsiToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('🔑 Requesting Jitsi token from Edge Function...')
      // Try to get JWT token, but don't fail if it doesn't work
      const response = await fetch('https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/get-jitsi-token', {
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(() => {
        // If fetch fails, return null to use fallback
        console.log('⚠️ JWT token fetch failed, using fallback to public Jitsi Meet')
        return null
      })

      if (!response) {
        console.log('⚠️ No response from JWT endpoint, using fallback')
        return null
      }

      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      // Get response as text first to handle both JSON and HTML responses
      const responseText = await response.text()
      console.log('📄 Response text (first 200 chars):', responseText.substring(0, 200))

      if (!response.ok) {
        console.error('❌ HTTP error:', response.status, response.statusText)
        
        // Try to parse as JSON for error details
        try {
          const errorData = JSON.parse(responseText)
          console.error('❌ Error details:', errorData)
        } catch (parseError) {
          console.error('❌ Non-JSON error response:', responseText.substring(0, 500))
        }
        return null
      }

      // Try to parse as JSON
      try {
        const data = JSON.parse(responseText)
        const { token } = data
        
        if (!token) {
          console.error('❌ No token in response:', data)
          return null
        }

        console.log('✅ Jitsi token obtained successfully')
        console.log('🔐 Token (first 50 chars):', token.substring(0, 50) + '...')
        
        // Decode and validate JWT payload
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          console.log('📋 JWT Payload:', payload)
          
          // Check expiration
          const now = Math.floor(Date.now() / 1000)
          if (payload.exp && payload.exp < now) {
            console.error('❌ JWT token is expired')
            return null
          }
          
          console.log('⏰ Token expires at:', new Date(payload.exp * 1000).toLocaleString())
        } catch (jwtError) {
          console.error('❌ Failed to decode JWT payload:', jwtError)
        }
        
        return token
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError)
        console.error('❌ Response was:', responseText.substring(0, 500))
        return null
      }
    } catch (error) {
      console.error('❌ Error getting Jitsi token:', error)
      return null
    }
  }, [])

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
    // Use public Jitsi Meet script for now (works with both domains)
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

  const initializeJitsi = useCallback(async () => {
    if (!window.JitsiMeetExternalAPI) {
      console.error('❌ JitsiMeetExternalAPI is not available')
      setConnectionError('Jitsi API not loaded')
      setIsLoading(false)
      return
    }

    console.log('🎥 Initializing Jitsi IFrame API...')

    // Request camera and microphone permissions first
    try {
      console.log('🎤 Requesting camera and microphone permissions...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      console.log('✅ Camera and microphone permissions granted')
      // Stop the stream as we just needed to get permissions
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.warn('⚠️ Camera/microphone permissions denied:', error)
      // Continue anyway - Jitsi will handle this gracefully
    }

    // Try to get JWT token for JaaS authentication
    const jwt = await getJitsiToken()
    
    let domain, roomName, options

    if (jwt) {
      // Use JaaS with JWT authentication
      console.log('🔐 Using JaaS with JWT authentication')
      domain = '8x8.vc'
      const appId = 'vpaas-magic-cookie-2eae40794b2947ad92e0371e6c3d0bf4'
      const cleanRoomId = roomId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
      const playjoobRoomId = `playjoob-meet-${cleanRoomId}`
      roomName = `${appId}/${playjoobRoomId}`
      
      options = {
        roomName: roomName,
        jwt: jwt,
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
    } else {
      // Fallback to public Jitsi Meet
      console.log('⚠️ JWT token failed, falling back to public Jitsi Meet')
      domain = 'meet.jit.si'
      const cleanRoomId = roomId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
      roomName = `playjoob-meet-${cleanRoomId}`
      
      options = {
        roomName: roomName,
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
    }
    
    console.log('🎥 Room name:', roomName)
    console.log('🎥 User name:', userName)
    console.log('🌐 Domain:', domain)

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
  }, [roomId, userName, userEmail, onClose, getJitsiToken])

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
