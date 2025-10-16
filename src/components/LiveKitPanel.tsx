import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track, RemoteTrack, LocalTrack } from 'livekit-client'

interface LiveKitPanelProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  buildingTitle: string
  userName?: string
  userEmail?: string
  side?: 'left' | 'right'
}

interface ParticipantVideo {
  id: string
  name: string
  videoTrack?: RemoteTrack | LocalTrack
  audioTrack?: RemoteTrack | LocalTrack
  isLocal: boolean
}

// Separate component for individual video tiles with proper track attachment
const ParticipantVideoTile: React.FC<{ participant: ParticipantVideo }> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) {
      console.log('❌ No video element for participant:', participant.name)
      return
    }

    if (participant.videoTrack) {
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
  }, [participant.videoTrack, participant.name])

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          aspectRatio: '1',
          background: '#F3F4F6',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          position: 'relative'
        }}
      >
        {participant.videoTrack ? (
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
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
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {participant.name.charAt(0).toUpperCase()}
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
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {participant.name}
          {participant.isLocal && ' (You)'}
        </div>
      </div>
    </div>
  )
}

export const LiveKitPanel: React.FC<LiveKitPanelProps> = ({
  isOpen,
  onClose,
  roomId,
  buildingTitle,
  userName = 'Guest',
  userEmail,
  side = 'right'
}) => {
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
          identity: userName,
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
      })

      room.on(RoomEvent.Disconnected, (reason) => {
        console.log('👋 Disconnected from LiveKit room:', reason)
        setParticipants([])
        setParticipantCount(0)
        roomRef.current = null
      })

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('👤 Participant connected:', participant.identity)
        
        // Subscribe to all available tracks for the new participant
        participant.trackPublications.forEach((publication) => {
          if (publication.track) {
            console.log('✅ Subscribed to remote track:', publication.kind, participant.identity)
          } else if (publication.subscribe) {
            publication.subscribe()
            console.log('📡 Subscribing to remote track:', publication.kind, participant.identity)
          }
        })
        
        updateParticipants()
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
      
      // Enable camera and microphone
      console.log('📹 Enabling camera and microphone...')
      await room.localParticipant.enableCameraAndMicrophone()
      
      // Explicitly publish video and audio tracks
      console.log('📡 Publishing video track...')
      const videoTrack = await room.localParticipant.setCameraEnabled(true)
      if (videoTrack) {
        console.log('✅ Video track published successfully')
      }
      
      console.log('📡 Publishing audio track...')
      const audioTrack = await room.localParticipant.setMicrophoneEnabled(true)
      if (audioTrack) {
        console.log('✅ Audio track published successfully')
      }
      
      roomRef.current = room
      
      // Wait a moment for tracks to be ready, then update participants
      setTimeout(() => {
        console.log('🔄 Updating participants after connection...')
        updateParticipants()
      }, 1000)

    } catch (error) {
      console.error('❌ Failed to connect to LiveKit room:', error)
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to video room')
      setIsConnecting(false)
    }
  }, [getLiveKitToken])

  // Update participants list
  const updateParticipants = useCallback(() => {
    if (!roomRef.current) {
      setParticipants([])
      setParticipantCount(0)
      return
    }

    const room = roomRef.current
    const participantVideos: ParticipantVideo[] = []

    // Add local participant first
    const localParticipant = room.localParticipant
    console.log('🔍 Local participant video tracks:', localParticipant.videoTrackPublications)
    console.log('🔍 Local participant audio tracks:', localParticipant.audioTrackPublications)
    console.log('🔍 Local participant all tracks:', localParticipant.trackPublications)
    
    // Get the first available video track (local tracks are always subscribed)
    const localVideoTrack = localParticipant.videoTrackPublications.find(p => p.track)?.track || null
    const localAudioTrack = localParticipant.audioTrackPublications.find(p => p.track)?.track || null
    
    console.log('🎥 Local video track found:', !!localVideoTrack)
    console.log('🎵 Local audio track found:', !!localAudioTrack)

    participantVideos.push({
      id: localParticipant.identity,
      name: localParticipant.identity,
      videoTrack: localVideoTrack,
      audioTrack: localAudioTrack,
      isLocal: true
    })

    // Add remote participants
    room.remoteParticipants.forEach((participant: RemoteParticipant) => {
      console.log('🔍 Remote participant video tracks:', participant.identity, participant.videoTrackPublications)
      console.log('🔍 Remote participant all tracks:', participant.identity, participant.trackPublications)
      
      // Get subscribed tracks for remote participants
      const remoteVideoTrack = participant.videoTrackPublications.find(p => p.isSubscribed && p.track)?.track || null
      const remoteAudioTrack = participant.audioTrackPublications.find(p => p.isSubscribed && p.track)?.track || null
      
      console.log('🎥 Remote video track found for', participant.identity, ':', !!remoteVideoTrack)
      console.log('🎵 Remote audio track found for', participant.identity, ':', !!remoteAudioTrack)

      participantVideos.push({
        id: participant.identity,
        name: participant.identity,
        videoTrack: remoteVideoTrack,
        audioTrack: remoteAudioTrack,
        isLocal: false
      })
    })

    setParticipants(participantVideos)
    setParticipantCount(participantVideos.length)
  }, [])

  // Disconnect from room
  const disconnectFromRoom = useCallback(async () => {
    if (roomRef.current) {
      console.log('🎥 Disconnecting from LiveKit room...')
      await roomRef.current.disconnect()
      roomRef.current = null
      setParticipants([])
      setParticipantCount(0)
    }
  }, [])

  // Connect when panel opens
  useEffect(() => {
    if (isOpen) {
      connectToRoom()
    } else {
      disconnectFromRoom()
    }

    return () => {
      disconnectFromRoom()
    }
  }, [isOpen, connectToRoom, disconnectFromRoom])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromRoom()
    }
  }, [disconnectFromRoom])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      [side]: 0,
      width: '480px',
      height: '100vh',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      boxShadow: side === 'right' ? '-4px 0 24px rgba(0,0,0,0.1)' : '4px 0 24px rgba(0,0,0,0.1)',
      zIndex: 2500,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'auto',
      borderRadius: side === 'right' ? '16px 0 0 16px' : '0 16px 16px 0'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#374151', fontSize: '18px', fontWeight: 600 }}>
            {buildingTitle}
          </h2>
          <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '13px' }}>
            {participantCount} participant{participantCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.1)',
            border: 'none',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#374151'
          }}
        >
          ✕
        </button>
      </div>

      {/* Video Grid */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflow: 'auto'
      }}>
        {isConnecting && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#6B7280',
            fontSize: '16px'
          }}>
            Connecting to video room...
          </div>
        )}

        {connectionError && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#EF4444',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>
              Connection failed: {connectionError}
            </div>
            <button
              onClick={connectToRoom}
              style={{
                background: '#EF4444',
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

        {!isConnecting && !connectionError && (
          <div className="grid grid-cols-2 gap-3">
            {participants.map((participant) => (
              <ParticipantVideoTile 
                key={participant.id} 
                participant={participant} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
