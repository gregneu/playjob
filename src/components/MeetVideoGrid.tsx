import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track, RemoteTrack, LocalTrack, createLocalVideoTrack, createLocalAudioTrack } from 'livekit-client'
import { getBrowserClient } from '../lib/supabase-browser'
import { UserAvatar } from './UserAvatar'

interface ParticipantVideo {
  id: string
  name: string
  videoTrack?: RemoteTrack | LocalTrack
  audioTrack?: RemoteTrack | LocalTrack
  isLocal: boolean
  avatarUrl?: string
  avatarConfig?: any
  email?: string
  userId?: string
}

interface MeetVideoGridProps {
  roomId: string
  userName?: string
  userEmail?: string
  userAvatarUrl?: string
  userAvatarConfig?: any
  userId?: string
  onConnectionChange?: (isConnected: boolean, participantCount: number) => void
  onError?: (error: string) => void
}

// Separate component for individual video tiles with proper track attachment
const ParticipantVideoTile: React.FC<{ participant: ParticipantVideo }> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) {
      console.log('❌ No video element for participant:', participant.name)
      return
    }

    if (participant.videoTrack && !isVideoOff) {
      console.log('🎥 Attaching video track for participant:', participant.name, 'Track:', participant.videoTrack)
      console.log('🎥 Video element:', videoElement)
      
      try {
        participant.videoTrack.attach(videoElement)
        console.log('✅ Video track attached successfully for:', participant.name)
      } catch (error) {
        console.error('❌ Failed to attach video track for:', participant.name, error)
      }
      
      return () => {
        console.log('🎥 Detaching video track for participant:', participant.name)
        try {
          participant.videoTrack?.detach()
        } catch (error) {
          console.error('❌ Failed to detach video track for:', participant.name, error)
        }
      }
    } else {
      console.log('❌ No video track available for participant:', participant.name)
    }
  }, [participant.videoTrack, participant.name, isVideoOff])

  // Handle mute/unmute
  const handleMuteToggle = () => {
    if (participant.audioTrack) {
      if (isMuted) {
        participant.audioTrack.unmute()
      } else {
        participant.audioTrack.mute()
      }
      setIsMuted(!isMuted)
    }
  }

  // Handle video on/off
  const handleVideoToggle = () => {
    if (participant.videoTrack) {
      if (isVideoOff) {
        participant.videoTrack.unmute()
      } else {
        participant.videoTrack.mute()
      }
      setIsVideoOff(!isVideoOff)
    }
  }

  // Determine if we should show video or avatar
  const hasVideo = participant.videoTrack && !isVideoOff

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.59)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: isHovered ? '0 8px 32px rgba(0,0,0,0.15)' : '0 4px 14px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        height: 165,
        maxWidth: '180px',
        width: 'auto',
        transition: 'transform 0.1s ease-out, box-shadow 0.2s ease-out',
        transformStyle: 'preserve-3d',
        willChange: 'transform'
      } as React.CSSProperties}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video or Avatar Content */}
      {hasVideo ? (
        <video
          ref={videoRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '18px'
          }}
          autoPlay
          playsInline
          muted={participant.isLocal}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '18px'
        }}>
          {/* 3D Avatar or Emoji Avatar */}
          <div style={{
            width: '64px',
            height: '64px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserAvatar
              userId={participant.userId}
              userName={participant.name}
              size={64}
              showName={false}
              renderHex3D={true}
            />
          </div>
          {/* Name below avatar */}
          <span style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center',
            padding: '0 8px'
          }}>
            {participant.name}
          </span>
        </div>
      )}

      {/* Hover Overlay - only for video tiles */}
      {hasVideo && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.25)',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            borderRadius: '18px'
          }}
        />
      )}


      {/* Control Icons - Top Right (only show on hover for video tiles) */}
      {hasVideo && (
        <div 
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            gap: 8,
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.3s ease-in-out'
          }}
        >
          {/* Mic Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleMuteToggle()
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <img 
              src={isMuted ? "/icons/entypo_sound-no.svg" : "/icons/entypo_sound.svg"}
              alt={isMuted ? "Unmute" : "Mute"}
              style={{ width: '16px', height: '16px' }}
            />
          </button>

          {/* Camera Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleVideoToggle()
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <img 
              src={isVideoOff ? "/icons/tdesign_camera-2-filled-no.svg" : "/icons/tdesign_camera-2-filled.svg"}
              alt={isVideoOff ? "Turn on camera" : "Turn off camera"}
              style={{ width: '16px', height: '16px' }}
            />
          </button>
        </div>
      )}

      {/* Footer: participant avatar and name - Bottom Left */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: hasVideo ? (isHovered ? 1 : 0) : 1,
        transition: 'opacity 0.3s ease-in-out'
      }}>
        {/* Avatar */}
        <UserAvatar
          userId={participant.userId}
          userName={participant.name}
          size={24}
          showName={false}
          renderHex3D={false}
        />
        {/* Name */}
        <span style={{
          fontSize: '12px',
          color: '#FFFFFF',
          fontWeight: '500',
          fontFamily: 'Inter, sans-serif',
          maxWidth: '100px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {participant.name}
        </span>
      </div>
    </div>
  )
}

export const MeetVideoGrid = React.forwardRef<
  { disconnect: () => Promise<void> },
  MeetVideoGridProps
>(({
  roomId,
  userName = 'Guest',
  userEmail,
  userAvatarUrl,
  userAvatarConfig,
  userId,
  onConnectionChange,
  onError
}, ref) => {
  const roomRef = useRef<Room | null>(null)
  const [participants, setParticipants] = useState<ParticipantVideo[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [participantCount, setParticipantCount] = useState(0)

  // Function to get LiveKit token from Supabase Edge Function
  const getLiveKitToken = useCallback(async (): Promise<{ token: string; wsUrl: string } | null> => {
    try {
      console.log('🔑 Requesting LiveKit token from Edge Function...')
      
      const response = await fetch('https://cicmapcwlvdatmgwdylh.supabase.co/functions/v1/lk-token', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpY21hcGN3bHZkYXRtZ3dkeWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODg1MjcsImV4cCI6MjA2ODg2NDUyN30.zCbbHc9pOa75I06Eow4M4s2fjF9iXuyHvuWdLPNhZDo',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity: userEmail || userName,
          room: roomId
        })
      })

      if (!response.ok) {
        console.error('❌ Failed to get LiveKit token:', response.status, response.statusText)
        return null
      }

      const data = await response.json()
      console.log('✅ LiveKit token obtained:', { wsUrl: data.wsUrl, identity: data.identity, room: data.room })
      
      return {
        token: data.token,
        wsUrl: data.wsUrl
      }
    } catch (error) {
      console.error('❌ Error getting LiveKit token:', error)
      return null
    }
  }, [roomId, userName])

  // Connect to LiveKit room
  const connectToRoom = useCallback(async () => {
    if (roomRef.current) {
      console.log('🎥 Already connected to room')
      return
    }

    setIsConnecting(true)
    setConnectionError(null)

    try {
      const tokenData = await getLiveKitToken()
      if (!tokenData) {
        throw new Error('Failed to get LiveKit token')
      }

      console.log('🎥 Connecting to LiveKit room...')
      
      const room = new Room({
        adaptiveStream: true,
        dynacast: true
      })

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log('✅ Connected to LiveKit room')
        setIsConnecting(false)
        onConnectionChange?.(true, participantCount)
      })

      room.on(RoomEvent.Disconnected, (reason) => {
        console.log('👋 Disconnected from LiveKit room:', reason)
        setParticipants([])
        setParticipantCount(0)
        roomRef.current = null
        onConnectionChange?.(false, 0)
      })

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('👤 Participant connected:', participant.identity)
        
        // Subscribe to all available tracks for the new participant (convert Map to Array first)
        Array.from(participant.trackPublications.values()).forEach((publication) => {
          if (publication.track) {
            console.log('✅ Already subscribed to remote track:', publication.kind, participant.identity)
          } else if (publication.subscribe) {
            publication.subscribe()
            console.log('📡 Subscribing to remote track:', publication.kind, participant.identity)
          }
        })
        
        // Update participants after a short delay to allow tracks to be ready
        setTimeout(() => {
          updateParticipants()
        }, 500)
      })

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('👤 Participant disconnected:', participant.identity)
        updateParticipants()
      })

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, participant: RemoteParticipant) => {
        console.log('✅ Subscribed to remote video track:', track.kind, participant.identity)
        updateParticipants()
      })

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, participant: RemoteParticipant) => {
        console.log('📹 Track unsubscribed:', track.kind, participant.identity)
        updateParticipants()
      })

      room.on(RoomEvent.LocalTrackPublished, (track: LocalTrack) => {
        console.log('📹 Local track published:', track.kind)
        updateParticipants()
      })

      room.on(RoomEvent.LocalTrackUnpublished, (track: LocalTrack) => {
        console.log('📹 Local track unpublished:', track.kind)
        updateParticipants()
      })

      // Connect to room
      console.log('🔗 Connecting to LiveKit room with URL:', tokenData.wsUrl)
      await room.connect(tokenData.wsUrl, tokenData.token)
      
      // Create and publish local tracks manually
      console.log('📡 Creating local video track...')
      const localVideoTrack = await createLocalVideoTrack({
        resolution: { width: 640, height: 480 },
        facingMode: 'user'
      })
      
      console.log('📡 Creating local audio track...')
      const localAudioTrack = await createLocalAudioTrack()
      
      console.log('📡 Publishing local tracks...')
      await room.localParticipant.publishTrack(localVideoTrack)
      await room.localParticipant.publishTrack(localAudioTrack)
      
      console.log('✅ Local tracks published successfully')
      
      roomRef.current = room
      
      // Wait a moment for tracks to be ready, then update participants
      setTimeout(() => {
        console.log('🔄 Updating participants after connection...')
        updateParticipants()
      }, 1000)

    } catch (error) {
      console.error('❌ Failed to connect to LiveKit room:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to video room'
      setConnectionError(errorMessage)
      onError?.(errorMessage)
      setIsConnecting(false)
    }
  }, [getLiveKitToken, onConnectionChange, onError])

  // Fetch user data from Supabase
  const fetchUserData = useCallback(async (identity: string) => {
    try {
      const supabase = getBrowserClient()
      
      // Try to find user by email first, then by id
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, avatar_config')
      
      // If identity looks like an email, search by email
      if (identity.includes('@')) {
        query = query.eq('email', identity)
      } else {
        // Otherwise, search by id
        query = query.eq('id', identity)
      }
      
      const { data, error } = await query.single()
      
      if (error) {
        console.warn('⚠️ Could not fetch user data for:', identity, error.message)
        return null
      }
      
      return data
    } catch (error) {
      console.warn('⚠️ Error fetching user data for:', identity, error)
      return null
    }
  }, [])

  // Update participants list
  const updateParticipants = useCallback(async () => {
    if (!roomRef.current) {
      setParticipants([])
      setParticipantCount(0)
      return
    }

    const room = roomRef.current
    const participantVideos: ParticipantVideo[] = []

    // Add local participant first
    const localParticipant = room.localParticipant
    console.log('🔍 Local participant all tracks:', localParticipant.trackPublications)
    
    // Get tracks from trackPublications (convert Map to Array first)
    const localVideoTrack = Array.from(localParticipant.trackPublications.values()).find(p => p.kind === 'video' && p.track)?.track || null
    const localAudioTrack = Array.from(localParticipant.trackPublications.values()).find(p => p.kind === 'audio' && p.track)?.track || null
    
    console.log('🎥 Local video track found:', !!localVideoTrack)
    console.log('🎵 Local audio track found:', !!localAudioTrack)

    participantVideos.push({
      id: localParticipant.identity,
      name: userName || localParticipant.identity,
      videoTrack: localVideoTrack,
      audioTrack: localAudioTrack,
      isLocal: true,
      email: userEmail,
      avatarUrl: userAvatarUrl,
      avatarConfig: userAvatarConfig,
      userId: userId
    })

    // Add remote participants with user data
    for (const participant of room.remoteParticipants.values()) {
      console.log('🔍 Remote participant all tracks:', participant.identity, participant.trackPublications)
      
      // Get subscribed tracks for remote participants from trackPublications (convert Map to Array first)
      const remoteVideoTrack = Array.from(participant.trackPublications.values()).find(p => p.kind === 'video' && p.isSubscribed && p.track)?.track || null
      const remoteAudioTrack = Array.from(participant.trackPublications.values()).find(p => p.kind === 'audio' && p.isSubscribed && p.track)?.track || null
      
      console.log('🎥 Remote video track found for', participant.identity, ':', !!remoteVideoTrack)
      console.log('🎵 Remote audio track found for', participant.identity, ':', !!remoteAudioTrack)

      // Try to fetch user data for remote participant
      const userData = await fetchUserData(participant.identity)

      participantVideos.push({
        id: participant.identity,
        name: userData?.full_name || participant.identity,
        videoTrack: remoteVideoTrack,
        audioTrack: remoteAudioTrack,
        isLocal: false,
        avatarUrl: userData?.avatar_url,
        avatarConfig: userData?.avatar_config,
        email: userData?.email || participant.identity,
        userId: userData?.id
      })
    }

    setParticipants(participantVideos)
    setParticipantCount(participantVideos.length)
    onConnectionChange?.(true, participantVideos.length)
  }, [onConnectionChange, userName, userEmail, userAvatarUrl, userAvatarConfig, userId, fetchUserData])

  // Disconnect from room and stop all tracks
  const disconnectFromRoom = useCallback(async () => {
    if (!roomRef.current) {
      console.log('🎥 No room to disconnect from')
      return
    }

    console.log('🎥 Disconnecting from LiveKit room...')
    
    const room = roomRef.current
    const localParticipant = room.localParticipant
    
    try {
      // Safely stop all local tracks
      if (localParticipant && localParticipant.tracks && Array.isArray(localParticipant.tracks)) {
        console.log('🛑 Stopping local tracks...')
        localParticipant.tracks.forEach(track => {
          if (track && track.track) {
            console.log('🛑 Stopping local track:', track.kind)
            try {
              track.track.stop()
            } catch (error) {
              console.warn('⚠️ Error stopping track:', error)
            }
          }
        })
      }
      
      // Safely detach all video elements
      if (localParticipant && localParticipant.trackPublications) {
        console.log('🔌 Detaching video tracks...')
        try {
          const publications = Array.from(localParticipant.trackPublications.values())
          publications.forEach(publication => {
            if (publication && publication.track && publication.kind === 'video') {
              console.log('🔌 Detaching video track')
              try {
                publication.track.detach()
              } catch (error) {
                console.warn('⚠️ Error detaching track:', error)
              }
            }
          })
        } catch (error) {
          console.warn('⚠️ Error processing track publications:', error)
        }
      }
      
      // Disconnect from room
      console.log('🔌 Disconnecting from room...')
      await room.disconnect(true)
      console.log('✅ Successfully disconnected from room')
      
    } catch (error) {
      console.error('❌ Error during disconnect:', error)
    } finally {
      // Always clean up state, even if disconnect failed
      roomRef.current = null
      setParticipants([])
      setParticipantCount(0)
      setIsConnecting(false)
      setConnectionError(null)
      onConnectionChange?.(false, 0)
      console.log('🧹 Cleaned up room state')
    }
  }, [onConnectionChange])

  // Connect when component mounts
  useEffect(() => {
    connectToRoom()
  }, [connectToRoom])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromRoom()
    }
  }, [disconnectFromRoom])

  // Expose disconnect function for parent component
  React.useImperativeHandle(ref, () => ({
    disconnect: disconnectFromRoom
  }))

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
          <div>Connecting to video room...</div>
        </div>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500 text-center p-4">
        <div className="text-lg mb-2">Connection failed: {connectionError}</div>
        <button
          onClick={connectToRoom}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {participants.map((participant) => (
          <ParticipantVideoTile 
            key={participant.id} 
            participant={participant} 
          />
        ))}
      </div>
    </div>
  )
})
