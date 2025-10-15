import React, { useEffect, useRef, useState, useCallback } from 'react'

// Jitsi Core SDK types (loaded dynamically)
interface JitsiConnection {
  connect: () => Promise<void>
  disconnect: () => void
  addEventListener: (event: string, callback: Function) => void
  removeEventListener: (event: string, callback: Function) => void
  initJitsiConference: (roomName: string, options: any) => JitsiConference
}

interface JitsiConference {
  join: () => Promise<void>
  leave: () => void
  addEventListener: (event: string, callback: Function) => void
  removeEventListener: (event: string, callback: Function) => void
  setDisplayName: (name: string) => void
  setLocalParticipantProperty: (key: string, value: any) => void
  getLocalParticipant: () => any
  getParticipants: () => Map<string, any>
  addTrack: (track: JitsiTrack) => void
}

interface JitsiTrack {
  getType: () => 'video' | 'audio'
  attach: (element: HTMLElement) => void
  detach: (element: HTMLElement) => void
  dispose: () => void
  isLocal: () => boolean
  getParticipantId: () => string
}

interface Participant {
  id: string
  displayName: string
  avatarURL?: string
  videoTrack?: JitsiTrack
  audioTrack?: JitsiTrack
  isLocal: boolean
  videoRef: React.RefObject<HTMLVideoElement>
  audioRef: React.RefObject<HTMLAudioElement>
}

// Extend Window interface for JitsiMeetJS
declare global {
  interface Window {
    JitsiMeetJS: any
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
  userAvatar,
  side = 'right'
}) => {
  const [connection, setConnection] = useState<JitsiConnection | null>(null)
  const [conference, setConference] = useState<JitsiConference | null>(null)
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [jitsiMeetJS, setJitsiMeetJS] = useState<any>(null)

  // Load Jitsi Core SDK dynamically from CDN
  useEffect(() => {
    if (!isOpen) return

    // Reset states when panel opens
    setIsLoading(true)
    setConnectionError(null)
    setIsConnected(false)
    console.log('🎥 Loading Jitsi Core SDK from CDN...')

    // Check if already loaded
    if (window.JitsiMeetJS) {
      console.log('🎥 JitsiMeetJS already loaded')
      setJitsiMeetJS(window.JitsiMeetJS)
      // Initialize and connect
      window.JitsiMeetJS.init()
      connectToConference(window.JitsiMeetJS)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://8x8.vc/libs/lib-jitsi-meet.min.js'
    script.async = true
    
    script.onload = () => {
      console.log('✅ Jitsi Core SDK loaded successfully')
      const JitsiMeetJS = window.JitsiMeetJS
      setJitsiMeetJS(JitsiMeetJS)
      
      // Initialize JitsiMeetJS first
      JitsiMeetJS.init()
      console.log('🎥 JitsiMeetJS initialized')
      
      // Then connect to conference
      connectToConference(JitsiMeetJS)
    }
    
    script.onerror = () => {
      console.error('❌ Failed to load Jitsi Core SDK')
      setIsLoading(false)
    }
    
    document.body.appendChild(script)

    return () => {
      // Cleanup script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [isOpen])

  const connectToConference = useCallback(async (JitsiMeetJS: any) => {
    if (!JitsiMeetJS) return

    // Check for secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost'
    if (!isSecureContext) {
      console.error('❌ WebSocket requires secure context (HTTPS or localhost)')
      setConnectionError('WebSocket requires secure context. Please use HTTPS or localhost.')
      setIsLoading(false)
      return
    }

    console.log('🎥 Connecting to JaaS conference...')
    console.log('🔒 Secure context:', isSecureContext)
    console.log('🌐 Current URL:', window.location.href)

    try {
      const appId = 'vpaas-magic-cookie-2eae40794b2947ad92e0371e6c3d0bf4'
      const domain = `${appId}.8x8.vc`
      const cleanRoomId = roomId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
      const playjoobRoomId = `playjoob-meet-${cleanRoomId}`
      const roomName = `${appId}/${playjoobRoomId}`
      
      console.log('🎥 AppID:', appId)
      console.log('🎥 Domain:', domain)
      console.log('🎥 Room name:', roomName)
      console.log('🎥 User name:', userName)
      console.log('🎥 User avatar:', userAvatar || 'No avatar')
      console.log('🌐 Current origin:', window.location.origin)
      console.log('🌐 Current hostname:', window.location.hostname)

      const jwt = "eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtMmVhZTQwNzk0YjI5NDdhZDkyZTAzNzFlNmMzZDBiZjQvNTg4ZjBkLVNBTVBMRV9BUFAiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJqaXRzaSIsImlzcyI6ImNoYXQiLCJpYXQiOjE3NjA1NDY4OTQsImV4cCI6MTc2MDU1NDA5NCwibmJmIjoxNzYwNTQ2ODg5LCJzdWIiOiJ2cGFhcy1tYWdpYy1jb29raWUtMmVhZTQwNzk0YjI5NDdhZDkyZTAzNzFlNmMzZDBiZjQiLCJjb250ZXh0Ijp7ImZlYXR1cmVzIjp7ImxpdmVzdHJlYW1pbmciOnRydWUsImZpbGUtdXBsb2FkIjp0cnVlLCJvdXRib3VuZC1jYWxsIjp0cnVlLCJzaXAtb3V0Ym91bmQtY2FsbCI6ZmFsc2UsInRyYW5zY3JpcHRpb24iOnRydWUsImxpc3QtdmlzaXRvcnMiOmZhbHNlLCJyZWNvcmRpbmciOnRydWUsImZsaXAiOmZhbHNlfSwidXNlciI6eyJoaWRkZW4tZnJvbS1yZWNvcmRlciI6ZmFsc2UsIm1vZGVyYXRvciI6dHJ1ZSwibmFtZSI6ImdyZWduZXUuZGUiLCJpZCI6Imdvb2dsZS1vYXV0aDJ8MTE3NjgxOTYwMTUwODAzOTUxMTkxIiwiYXZhdGFyIjoiIiwiZW1haWwiOiJncmVnbmV1LmRlQGdtYWlsLmNvbSJ9fSwicm9vbSI6IioifQ.TIm4HA2c4XXRyKufFDMxBctmF282zohiRHFX5hOTGz9QmCDsewVn9_za5iXGLawIggEWb0fuD6GP4659qCFwTNT_htMhdpac3WeNHFMgRzNbX8of1mh5Q8QtKH8E5heeeSBhpuYoTyL4gj9JqTXbdMD9UDZysAk0irzO4cstb3Tx3K--npV4w1XnPKshmv_BYrNWbKV0NMJGudyD56zu_c-9OvWex1ia3Ap5KHuZcPAST2BpWwtF9CrXX2rVpHp_rQTwUCb5gDTwZjirMJ123HPOwlWsGLi7g2MBS1kz4y0cFZbZnDW4vT8FBCs0x1RLhMmQkKWLvcQPRsTK-rXOmg"

      // Validate JWT token
      console.log('🔐 JWT Token length:', jwt.length)
      console.log('🔐 JWT Token first 50 chars:', jwt.substring(0, 50))
      try {
        const jwtPayload = JSON.parse(atob(jwt.split('.')[1]))
        console.log('🔐 JWT Payload:', jwtPayload)
        console.log('🔐 JWT Subject (AppID):', jwtPayload.sub)
        console.log('🔐 JWT Expires:', new Date(jwtPayload.exp * 1000).toISOString())
        console.log('🔐 JWT Transcription field:', jwtPayload.context?.features?.transcription)
        
        // Check if JWT is expired
        const now = Math.floor(Date.now() / 1000)
        if (jwtPayload.exp < now) {
          console.error('❌ JWT Token is EXPIRED!')
          setConnectionError('JWT token has expired. Please generate a new one.')
          setIsLoading(false)
          return
        } else {
          console.log('✅ JWT Token is valid (not expired)')
        }
        
        // Verify AppID matches
        if (jwtPayload.sub !== appId) {
          console.error('❌ JWT AppID mismatch!', {
            jwtAppId: jwtPayload.sub,
            expectedAppId: appId
          })
          setConnectionError('JWT AppID does not match expected AppID.')
          setIsLoading(false)
          return
        } else {
          console.log('✅ JWT AppID matches expected AppID')
        }
      } catch (jwtError) {
        console.error('❌ Failed to decode JWT:', jwtError)
        console.error('❌ JWT Error details:', jwtError.message)
        setConnectionError('Invalid JWT token format.')
        setIsLoading(false)
        return
      }

      // Create connection with correct JaaS AppID-based domain
      const newConnection = new JitsiMeetJS.JitsiConnection(null, jwt, {
        hosts: {
          domain,
          muc: `conference.${domain}`
        },
        serviceUrl: `wss://${domain}/xmpp-websocket`,
        clientNode: 'http://jitsi.org/jitsimeet'
      })

      console.log('🎥 Connection config:', {
        domain,
        muc: `conference.${domain}`,
        serviceUrl: `wss://${domain}/xmpp-websocket`,
        roomName,
        jwtLength: jwt.length
      })
      
      console.log('🌐 WebSocket URL being used:', `wss://${domain}/xmpp-websocket`)
      console.log('🌐 Expected JaaS tenant domain:', domain)
      console.log('🌐 Room name format:', roomName)

      setConnection(newConnection)

      // Set up connection event listeners
      newConnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
        console.log('✅ Connected to JaaS successfully')
        console.log('✅ WebSocket connection established')
        setIsConnected(true)
        joinConference(newConnection, roomName, JitsiMeetJS)
      })

      newConnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, (error: any) => {
        console.error('❌ Connection failed:', error)
        console.error('❌ WebSocket connection failed:', error)
        console.error('❌ Error details:', {
          message: error.message,
          reason: error.reason,
          code: error.code,
          type: error.type
        })
        setIsLoading(false)
        setConnectionError(`Connection failed: ${error.message || 'Unknown error'}`)
      })

      newConnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, (error: any) => {
        console.log('🔌 Disconnected from JaaS:', error)
        if (error && error.reason) {
          console.error('🔌 Disconnect reason:', error.reason)
        }
        setIsConnected(false)
        onClose()
      })

      // Connect
      console.log('🎥 Attempting to connect to JaaS...')
      console.log('🎥 WebSocket URL:', `wss://${domain}/xmpp-websocket`)
      await newConnection.connect()

    } catch (error) {
      console.error('❌ Failed to connect to conference:', error)
      setIsLoading(false)
      setConnectionError('Failed to initialize connection. Please try again.')
    }
  }, [roomId, userName, userAvatar, onClose])

  const joinConference = useCallback(async (conn: JitsiConnection, roomName: string, JitsiMeetJS: any) => {
    try {
      const newConference = conn.initJitsiConference(roomName, {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableLayerSuspension: true,
        resolution: 720
      })

      setConference(newConference)

      // Set user info
      newConference.setDisplayName(userName)
      if (userAvatar) {
        newConference.setLocalParticipantProperty('avatarURL', userAvatar)
      }

      // Set up conference event listeners
      newConference.addEventListener(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
        console.log('✅ Joined conference')
        setIsLoading(false)
        
        // Auto-enable local video and audio
        JitsiMeetJS.createLocalTracks({
          devices: ['audio', 'video'],
          resolution: 720
        }).then((tracks: JitsiTrack[]) => {
          tracks.forEach(track => {
            if (track.getType() === 'video') {
              newConference.addTrack(track)
            } else if (track.getType() === 'audio') {
              newConference.addTrack(track)
            }
          })
          console.log('✅ Local tracks added and enabled')
        }).catch((error: any) => {
          console.error('❌ Failed to create local tracks:', error)
        })
      })

      newConference.addEventListener(JitsiMeetJS.events.conference.CONFERENCE_LEFT, () => {
        console.log('👋 Left conference')
        onClose()
      })

      newConference.addEventListener(JitsiMeetJS.events.conference.TRACK_ADDED, (track: JitsiTrack) => {
        console.log('🎥 Track added:', track.getType(), track.isLocal() ? 'local' : 'remote')
        handleTrackAdded(track)
      })

      newConference.addEventListener(JitsiMeetJS.events.conference.TRACK_REMOVED, (track: JitsiTrack) => {
        console.log('🎥 Track removed:', track.getType(), track.isLocal() ? 'local' : 'remote')
        handleTrackRemoved(track)
      })

      newConference.addEventListener(JitsiMeetJS.events.conference.USER_JOINED, (id: string, user: any) => {
        console.log('👤 User joined:', id, user.displayName)
        handleUserJoined(id, user)
      })

      newConference.addEventListener(JitsiMeetJS.events.conference.USER_LEFT, (id: string) => {
        console.log('👤 User left:', id)
        handleUserLeft(id)
      })

      // Join the conference
      await newConference.join()

    } catch (error) {
      console.error('❌ Failed to join conference:', error)
      setIsLoading(false)
    }
  }, [userName, userAvatar, onClose])

  const handleTrackAdded = useCallback((track: JitsiTrack) => {
    const participantId = track.getParticipantId()
    const isLocal = track.isLocal()
    
    setParticipants(prev => {
      const newParticipants = new Map(prev)
      let participant = newParticipants.get(participantId)
      
      if (!participant) {
        participant = {
          id: participantId,
          displayName: isLocal ? userName : `Participant ${participantId.slice(-4)}`,
          isLocal,
          videoRef: React.createRef<HTMLVideoElement>(),
          audioRef: React.createRef<HTMLAudioElement>()
        }
      }
      
      if (track.getType() === 'video') {
        participant.videoTrack = track
      } else if (track.getType() === 'audio') {
        participant.audioTrack = track
      }
      
      newParticipants.set(participantId, participant)
      return newParticipants
    })
  }, [userName])

  const handleTrackRemoved = useCallback((track: JitsiTrack) => {
    const participantId = track.getParticipantId()
    
    setParticipants(prev => {
      const newParticipants = new Map(prev)
      const participant = newParticipants.get(participantId)
      
      if (participant) {
        if (track.getType() === 'video') {
          participant.videoTrack = undefined
        } else if (track.getType() === 'audio') {
          participant.audioTrack = undefined
        }
        
        newParticipants.set(participantId, participant)
      }
      
      return newParticipants
    })
  }, [])

  const handleUserJoined = useCallback((id: string, user: any) => {
    setParticipants(prev => {
      const newParticipants = new Map(prev)
      if (!newParticipants.has(id)) {
        newParticipants.set(id, {
          id,
          displayName: user.displayName || `Participant ${id.slice(-4)}`,
          isLocal: false,
          videoRef: React.createRef<HTMLVideoElement>(),
          audioRef: React.createRef<HTMLAudioElement>()
        })
      }
      return newParticipants
    })
  }, [])

  const handleUserLeft = useCallback((id: string) => {
    setParticipants(prev => {
      const newParticipants = new Map(prev)
      newParticipants.delete(id)
      return newParticipants
    })
  }, [])

  // Attach tracks to video/audio elements
  useEffect(() => {
    participants.forEach(participant => {
      if (participant.videoTrack && participant.videoRef.current) {
        participant.videoTrack.attach(participant.videoRef.current)
      }
      if (participant.audioTrack && participant.audioRef.current) {
        participant.audioTrack.attach(participant.audioRef.current)
      }
    })
  }, [participants])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conference) {
        conference.leave()
      }
      if (connection) {
        connection.disconnect()
      }
    }
  }, [conference, connection])

  if (!isOpen) return null

  const participantArray = Array.from(participants.values())

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
      pointerEvents: 'auto',
      borderRadius: '16px 0 0 16px'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8A80 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(255, 107, 107, 0.3)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 600 }}>
              {buildingTitle}
            </h2>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
              {isLoading ? 'Connecting...' : `${participantArray.length} participant${participantArray.length !== 1 ? 's' : ''}`}
            </p>
          </div>
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
            color: 'white',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
          }}
        >
          ✕
        </button>
      </div>

      {/* Video Grid */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto'
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ marginBottom: '16px', fontSize: '16px' }}>Connecting to video room...</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                Room: {roomId}
              </div>
            </div>
          </div>
        ) : connectionError ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ marginBottom: '16px', fontSize: '16px', color: '#FF6B6B' }}>
                {connectionError}
              </div>
              <button
                onClick={() => {
                  setConnectionError(null)
                  setIsLoading(true)
                  if (jitsiMeetJS) {
                    connectToConference(jitsiMeetJS)
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            minHeight: '300px'
          }}>
            {participantArray.map(participant => (
              <div
                key={participant.id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '16/9',
                  border: participant.isLocal ? '2px solid #4F46E5' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                {participant.videoTrack ? (
                  <video
                    ref={participant.videoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}>
                    {participant.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Participant name overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {participant.displayName}
                  {participant.isLocal && ' (You)'}
                </div>

                {/* Audio element (hidden) */}
                {participant.audioTrack && (
                  <audio
                    ref={participant.audioRef}
                    autoPlay
                    style={{ display: 'none' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
