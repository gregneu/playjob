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

  // Cleanup old participants
  const cleanupOldParticipants = useCallback(async () => {
    if (!projectId) return
    
    try {
      console.log('🧹 useMeetingParticipants: Cleaning up old participants...')
      
      // Remove inactive participants older than 1 hour
      const { error: inactiveError } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('project_id', projectId)
        .eq('is_active', false)
        .not('left_at', 'is', null)
        .lt('left_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      
      if (inactiveError) {
        console.error('❌ Error cleaning up inactive participants:', inactiveError)
      } else {
        console.log('✅ Cleaned up old inactive participants')
      }
      
      // Remove active participants older than 24 hours (likely forgotten records)
      const { error: activeError } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('project_id', projectId)
        .eq('is_active', true)
        .not('joined_at', 'is', null)
        .lt('joined_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      
      if (activeError) {
        console.error('❌ Error cleaning up old active participants:', activeError)
      } else {
        console.log('✅ Cleaned up old active participants')
      }
      
    } catch (err) {
      console.error('❌ Exception during cleanup:', err)
    }
  }, [projectId])

  const loadMeetingParticipants = useCallback(async () => {
    if (!projectId || !userId) {
      setMeetingParticipants({})
      return
    }

    setIsLoading(true)
    try {
      console.log('🔍 useMeetingParticipants: Loading participants for project:', projectId)
      
      // Clean up old participants first
      await cleanupOldParticipants()
      
      // Get all active meeting participants from the database
      const { data, error } = await supabase
        .from('meeting_participants')
        .select(`
          room_id,
          user_id,
          joined_at
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })

      if (error) {
        console.error('❌ Error loading meeting participants:', error)
        setMeetingParticipants({})
        return
      }

      // Group participants by room_id and fetch profile data separately
      const participantsMap: MeetingParticipantsMap = {}
      
      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(data.map(record => record.user_id))]
        
        // Fetch profiles for all users
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, avatar_config')
          .in('id', userIds)
        
        if (profilesError) {
          console.error('❌ Error loading profiles:', profilesError)
          setMeetingParticipants({})
          return
        }
        
        // Create a map of user profiles
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])
        
        // Group participants by room_id
        data.forEach(record => {
          const roomId = record.room_id
          const profile = profilesMap.get(record.user_id)
          
          if (!participantsMap[roomId]) {
            participantsMap[roomId] = []
          }
          
          if (profile) {
            participantsMap[roomId].push({
              id: `${roomId}-${profile.id}`,
              name: profile.full_name || profile.email || 'Unknown',
              userId: profile.id,
              avatarUrl: profile.avatar_url,
              avatarConfig: profile.avatar_config,
              email: profile.email,
              joinedAt: record.joined_at
            })
          }
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
  }, [projectId, userId, cleanupOldParticipants])

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
        }, { 
          onConflict: 'project_id, room_id, user_id',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('❌ Error adding meeting participant:', error)
        return
      }


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
      
      // First try to update existing record
      const { error: updateError } = await supabase
        .from('meeting_participants')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('room_id', roomId)
        .eq('user_id', participantUserId)

      if (updateError) {
        console.error('❌ Error updating meeting participant:', updateError)
        
        // Fallback: try to delete the record completely
        console.log('🔄 Trying to delete participant record as fallback...')
        const { error: deleteError } = await supabase
          .from('meeting_participants')
          .delete()
          .eq('project_id', projectId)
          .eq('room_id', roomId)
          .eq('user_id', participantUserId)
        
        if (deleteError) {
          console.error('❌ Error deleting meeting participant:', deleteError)
          return
        }
        console.log('✅ useMeetingParticipants: Participant deleted successfully (fallback)')
      } else {
        console.log('✅ useMeetingParticipants: Participant removed successfully')
      }
      
      // Force reload participants to ensure UI updates
      setTimeout(() => {
        console.log('🔄 Force reloading participants after removal...')
        loadMeetingParticipants()
      }, 100)
      
    } catch (err) {
      console.error('❌ Exception removing meeting participant:', err)
    }
  }, [projectId, userId, loadMeetingParticipants])

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

    const channel = supabase.channel(`meeting-participants:${projectId}`)

    // Listen for INSERT events (new participants joining)
    channel.on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'meeting_participants',
        filter: `project_id=eq.${projectId}`
      },
      (payload) => {
        console.log('🔔 useMeetingParticipants: New participant joined', payload)
        setTimeout(() => loadMeetingParticipants(), 300)
      }
    )

    // Listen for UPDATE events (participants leaving)
    channel.on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'meeting_participants',
        filter: `project_id=eq.${projectId}`
      },
      (payload) => {
        console.log('🔔 useMeetingParticipants: Participant status changed', payload)
        setTimeout(() => loadMeetingParticipants(), 300)
      }
    )

    // Listen for DELETE events (participants removed)
    channel.on(
      'postgres_changes',
      { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'meeting_participants',
        filter: `project_id=eq.${projectId}`
      },
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
        // Fallback: reload participants manually every 5 seconds if realtime fails
        const fallbackInterval = setInterval(() => {
          console.log('🔄 useMeetingParticipants: Fallback reload due to realtime error')
          loadMeetingParticipants()
        }, 5000)
        
        // Clean up fallback interval when component unmounts
        return () => {
          clearInterval(fallbackInterval)
        }
      } else if (status === 'CLOSED') {
        console.log('🔔 useMeetingParticipants: Realtime subscription closed')
      } else if (status === 'TIMED_OUT') {
        console.warn('⏰ useMeetingParticipants: Realtime subscription timed out')
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
