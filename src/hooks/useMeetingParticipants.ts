// Hook to track meeting participants in realtime
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface MeetingParticipant {
  id: string
  name: string
  userId: string
  avatarUrl?: string
  avatarConfig?: any
  email?: string
  joinedAt: string
}

interface MeetingParticipantsMap {
  [roomId: string]: MeetingParticipant[]
}

export function useMeetingParticipants(projectId: string | null, userId: string | null) {
  const [meetingParticipants, setMeetingParticipants] = useState<MeetingParticipantsMap>({})
  const [isLoading, setIsLoading] = useState(false)

  const loadMeetingParticipants = useCallback(async () => {
    if (!projectId || !userId) {
      setMeetingParticipants({})
      return
    }

    setIsLoading(true)
    try {
      console.log('🔍 useMeetingParticipants: Loading participants for project:', projectId)
      
      // Get all active meeting participants from the database
      const { data, error } = await supabase
        .from('meeting_participants')
        .select(`
          room_id,
          user_id,
          joined_at,
          profiles!inner(
            id,
            full_name,
            email,
            avatar_url,
            avatar_config
          )
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })

      if (error) {
        console.error('❌ Error loading meeting participants:', error)
        setMeetingParticipants({})
        return
      }

      // Group participants by room_id
      const participantsMap: MeetingParticipantsMap = {}
      
      if (data) {
        data.forEach(record => {
          const roomId = record.room_id
          const profile = record.profiles
          
          if (!participantsMap[roomId]) {
            participantsMap[roomId] = []
          }
          
          participantsMap[roomId].push({
            id: `${roomId}-${profile.id}`,
            name: profile.full_name || profile.email || 'Unknown',
            userId: profile.id,
            avatarUrl: profile.avatar_url,
            avatarConfig: profile.avatar_config,
            email: profile.email,
            joinedAt: record.joined_at
          })
        })
      }

      console.log('📊 useMeetingParticipants: Loaded participants:', participantsMap)
      setMeetingParticipants(participantsMap)
    } catch (err) {
      console.error('❌ Exception loading meeting participants:', err)
      setMeetingParticipants({})
    } finally {
      setIsLoading(false)
    }
  }, [projectId, userId])

  // Add participant to a room
  const addParticipant = useCallback(async (roomId: string, participant: Omit<MeetingParticipant, 'id' | 'joinedAt'>) => {
    if (!projectId || !userId) return

    try {
      console.log('➕ useMeetingParticipants: Adding participant to room:', roomId, participant)
      
      const { error } = await supabase
        .from('meeting_participants')
        .upsert({
          project_id: projectId,
          room_id: roomId,
          user_id: participant.userId,
          is_active: true,
          joined_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Error adding meeting participant:', error)
        return
      }

      // Update local state immediately for better UX
      setMeetingParticipants(prev => ({
        ...prev,
        [roomId]: [
          ...(prev[roomId] || []),
          {
            ...participant,
            id: `${roomId}-${participant.userId}`,
            joinedAt: new Date().toISOString()
          }
        ]
      }))

      console.log('✅ useMeetingParticipants: Participant added successfully')
    } catch (err) {
      console.error('❌ Exception adding meeting participant:', err)
    }
  }, [projectId, userId])

  // Remove participant from a room
  const removeParticipant = useCallback(async (roomId: string, participantUserId: string) => {
    if (!projectId || !userId) return

    try {
      console.log('➖ useMeetingParticipants: Removing participant from room:', roomId, participantUserId)
      
      const { error } = await supabase
        .from('meeting_participants')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('room_id', roomId)
        .eq('user_id', participantUserId)

      if (error) {
        console.error('❌ Error removing meeting participant:', error)
        return
      }

      // Update local state immediately for better UX
      setMeetingParticipants(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter(p => p.userId !== participantUserId)
      }))

      console.log('✅ useMeetingParticipants: Participant removed successfully')
    } catch (err) {
      console.error('❌ Exception removing meeting participant:', err)
    }
  }, [projectId, userId])

  // Get participants for a specific room
  const getRoomParticipants = useCallback((roomId: string): MeetingParticipant[] => {
    return meetingParticipants[roomId] || []
  }, [meetingParticipants])

  // Check if a room has active participants
  const hasActiveParticipants = useCallback((roomId: string): boolean => {
    return (meetingParticipants[roomId] || []).length > 0
  }, [meetingParticipants])

  useEffect(() => {
    loadMeetingParticipants()
  }, [loadMeetingParticipants])

  // Subscribe to realtime updates for meeting participants
  useEffect(() => {
    if (!projectId || !userId) return

    console.log('🔔 useMeetingParticipants: Setting up realtime subscription for project:', projectId)

    const channel = supabase.channel(`meeting-participants:${projectId}:${userId}`)

    // Listen for INSERT events (new participants joining)
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'meeting_participants' },
      (payload) => {
        console.log('🔔 useMeetingParticipants: New participant joined', payload)
        setTimeout(() => loadMeetingParticipants(), 300)
      }
    )

    // Listen for UPDATE events (participants leaving)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'meeting_participants' },
      (payload) => {
        console.log('🔔 useMeetingParticipants: Participant status changed', payload)
        setTimeout(() => loadMeetingParticipants(), 300)
      }
    )

    // Listen for DELETE events (participants removed)
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'meeting_participants' },
      (payload) => {
        console.log('🔔 useMeetingParticipants: Participant removed', payload)
        setTimeout(() => loadMeetingParticipants(), 300)
      }
    )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ useMeetingParticipants: Realtime subscription active')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ useMeetingParticipants: Realtime subscription error')
      }
    })

    return () => {
      console.log('🔔 useMeetingParticipants: Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [projectId, userId, loadMeetingParticipants])

  return {
    meetingParticipants,
    isLoading,
    getRoomParticipants,
    hasActiveParticipants,
    addParticipant,
    removeParticipant,
    reload: loadMeetingParticipants
  }
}
