// Hook to track meeting participants in realtime
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface MeetingParticipant {
  id: string
  name: string
  userId: string
  avatarUrl?: string
  avatarConfig?: any
  email?: string
  joinedAt: string
  lastSeen?: string | null
}

interface MeetingParticipantsMap {
  [roomId: string]: MeetingParticipant[]
}

interface ParticipantProfile {
  id: string
  displayName: string | null
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  avatarConfig?: any
}

export function useMeetingParticipants(projectId: string | null, userId: string | null) {
  const [meetingParticipants, setMeetingParticipants] = useState<MeetingParticipantsMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const profileCacheRef = useRef<Map<string, ParticipantProfile>(new Map())
  const STALE_THRESHOLD_MS = 20_000

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

  const resolveParticipantProfiles = useCallback(async (userIds: string[]): Promise<Map<string, ParticipantProfile> => {
    const cache = profileCacheRef.current
    const missingIds = userIds.filter((id) => id && !cache.has(id))

    if (missingIds.length === 0) {
      return cache
    }

    const unresolved = new Set(missingIds)

    if (missingIds.length > 0) {
      try {
        const { data: profileRows, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, display_name, avatar_url, avatar_config')
          .in('id', missingIds)

        if (profilesError) {
          console.warn('⚠️ Error loading profiles directly:', profilesError)
        } else {
          for (const row of profileRows ?? []) {
            if (!row?.id) continue
            cache.set(row.id, {
              id: row.id,
              displayName: row.display_name ?? row.full_name ?? row.email ?? null,
              fullName: row.full_name ?? null,
              email: row.email ?? null,
              avatarUrl: row.avatar_url ?? null,
              avatarConfig: row.avatar_config ?? null
            })
            unresolved.delete(row.id)
          }
        }
      } catch (err) {
        console.warn('⚠️ Exception while loading profiles directly:', err)
      }
    }

    if (unresolved.size > 0 && projectId) {
      try {
        const { data: memberPayload, error: memberError } = await supabase.functions.invoke<{
          members?: Array<{
            user_id: string | null
            display_name: string | null
            email: string | null
            avatar_url: string | null
            status: 'member' | 'invited'
          }>
        }>('list-project-members', {
          body: { projectId }
        })

        if (memberError) {
          console.warn('⚠️ list-project-members fallback error:', memberError)
        } else {
          const members = memberPayload?.members ?? []
          for (const member of members) {
            if (!member?.user_id || member.status !== 'member') continue
            if (cache.has(member.user_id)) continue
            cache.set(member.user_id, {
              id: member.user_id,
              displayName: member.display_name ?? member.email ?? 'Participant',
              fullName: member.display_name ?? member.email ?? null,
              email: member.email ?? null,
              avatarUrl: member.avatar_url ?? null
            })
            unresolved.delete(member.user_id)
          }
        }
      } catch (err) {
        console.warn('⚠️ list-project-members fallback exception:', err)
      }
    }

    if (unresolved.size > 0) {
      for (const id of unresolved) {
        cache.set(id, {
          id,
          displayName: 'Participant',
          fullName: null,
          email: null,
          avatarUrl: null
        })
      }
    }

    return cache
  }, [projectId])

  const filterStaleParticipants = useCallback((input: MeetingParticipantsMap): MeetingParticipantsMap => {
    const result: MeetingParticipantsMap = {}
    const now = Date.now()
    Object.entries(input).forEach(([roomId, participants]) => {
      const fresh = participants.filter(participant => {
        const reference = participant.lastSeen ?? participant.joinedAt
        if (!reference) return false
        const diff = now - new Date(reference).getTime()
        return diff < STALE_THRESHOLD_MS
      })
      if (fresh.length > 0) {
        result[roomId] = fresh
      }
    })
    return result
  }, [STALE_THRESHOLD_MS])

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
          joined_at,
          last_seen,
          is_active
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
        const userIds = [...new Set(data.map(record => record.user_id).filter((id): id is string => Boolean(id)))]
        const profilesMap = await resolveParticipantProfiles(userIds)
        
        // Group participants by room_id
        data.forEach(record => {
          const roomId = record.room_id
          const profile = profilesMap.get(record.user_id)
          const fallbackName = profile?.displayName ?? profile?.fullName ?? profile?.email ?? 'Participant'
          
          if (!participantsMap[roomId]) {
            participantsMap[roomId] = []
          }
          
          if (record.user_id) {
            const lastSeenValue = record.last_seen ?? record.joined_at
            participantsMap[roomId].push({
              id: `${roomId}-${record.user_id}`,
              name: fallbackName,
              userId: record.user_id,
              avatarUrl: profile?.avatarUrl ?? null,
              avatarConfig: profile?.avatarConfig,
              email: profile?.email ?? null,
              joinedAt: record.joined_at,
              lastSeen: lastSeenValue ?? null
            })
          } else {
            participantsMap[roomId].push({
              id: `${roomId}-anonymous`,
              name: 'Participant',
              userId: null as unknown as string,
              avatarUrl: null,
              avatarConfig: null,
              email: null,
              joinedAt: record.joined_at,
              lastSeen: record.last_seen ?? record.joined_at ?? null
            })
          }
        })
      }

      const filtered = filterStaleParticipants(Object.keys(participantsMap).length ? participantsMap : {})

      console.log('📊 useMeetingParticipants: Loaded participants:', filtered)
      setMeetingParticipants(filtered)
    } catch (err) {
      console.error('❌ Exception loading meeting participants:', err)
      setMeetingParticipants({})
    } finally {
      setIsLoading(false)
    }
  }, [projectId, userId, cleanupOldParticipants, filterStaleParticipants])

  // Add participant to a room
  const addParticipant = useCallback(async (roomId: string, participant: Omit<MeetingParticipant, 'id' | 'joinedAt' | 'lastSeen'>) => {
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
          joined_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          left_at: null
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

  const heartbeatParticipant = useCallback(async (roomId: string, participantUserId: string) => {
    if (!projectId || !participantUserId) return
    try {
      const { error } = await supabase
        .from('meeting_participants')
        .update({
          last_seen: new Date().toISOString(),
          is_active: true
        })
        .eq('project_id', projectId)
        .eq('room_id', roomId)
        .eq('user_id', participantUserId)
      if (error) {
        console.error('❌ Error updating participant heartbeat:', error)
      }
    } catch (err) {
      console.error('❌ Exception updating participant heartbeat:', err)
    }
  }, [projectId])

  // Remove participant from a room
  const removeParticipant = useCallback(async (roomId: string, participantUserId: string) => {
    if (!projectId || !userId) return

    try {
      console.log('➖ useMeetingParticipants: Removing participant from room:', roomId, participantUserId)
      
      // First try to update existing record
      const { error: updateError } = await supabase
        .from('meeting_participants')
        .update({ is_active: false, left_at: new Date().toISOString(), last_seen: new Date().toISOString() })
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
    heartbeatParticipant,
    removeParticipant,
    reload: loadMeetingParticipants
  }
}
