// Hook to track unread comment mentions
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface UnreadMentionsMap {
  [ticketId: string]: string[] // Array of unread comment IDs
}

export function useUnreadMentions(
  projectId: string | null,
  tickets: any[],
  userId: string | null,
  userEmail: string | null
) {
  const [unreadMentions, setUnreadMentions] = useState<UnreadMentionsMap>({})
  const [isLoading, setIsLoading] = useState(false)

  const loadUnreadMentions = useCallback(async () => {
    if (!projectId || !userId || !userEmail || tickets.length === 0) {
      setUnreadMentions({})
      return
    }

    setIsLoading(true)
    try {
      const username = userEmail.split('@')[0]
      const mentionPattern = new RegExp(`@${username}`, 'i')
      
      // Get all ticket IDs
      const ticketIds = tickets.map(t => t.id)
      
      // Fetch all read comments for these tickets in one query
      const { data: readData, error } = await supabase
        .from('comment_reads')
        .select('ticket_id, comment_id')
        .in('ticket_id', ticketIds)
        .eq('user_id', userId)
      
      if (error) {
        console.error('❌ Error loading read comments:', error)
        // Continue with empty read data
      }
      
      // Build a map of read comment IDs by ticket
      const readMap: { [ticketId: string]: Set<string> } = {}
      if (readData) {
        readData.forEach(read => {
          if (!readMap[read.ticket_id]) {
            readMap[read.ticket_id] = new Set()
          }
          readMap[read.ticket_id].add(read.comment_id)
        })
      }
      
      // For each ticket, find unread comments with mentions
      const unreadMap: UnreadMentionsMap = {}
      tickets.forEach(ticket => {
        const comments = ticket.comments || []
        const readCommentIds = readMap[ticket.id] || new Set()
        
        const unreadMentionComments = comments.filter((comment: any) => {
          const text = comment.text || ''
          const isMentioned = mentionPattern.test(text)
          const isUnread = !readCommentIds.has(comment.id)
          return isMentioned && isUnread
        })
        
        if (unreadMentionComments.length > 0) {
          unreadMap[ticket.id] = unreadMentionComments.map((c: any) => c.id)
        }
      })
      
      setUnreadMentions(unreadMap)
    } catch (err) {
      console.error('❌ Exception loading unread mentions:', err)
      setUnreadMentions({})
    } finally {
      setIsLoading(false)
    }
  }, [projectId, tickets, userId, userEmail])

  useEffect(() => {
    loadUnreadMentions()
  }, [loadUnreadMentions])

  // Return whether a specific ticket has unread mentions
  const hasUnreadMentions = useCallback((ticketId: string): boolean => {
    return !!(unreadMentions[ticketId] && unreadMentions[ticketId].length > 0)
  }, [unreadMentions])

  // Return whether a building (zone object) has unread mentions in any of its tickets
  const buildingHasUnreadMentions = useCallback((buildingId: string, ticketsByBuilding: any[]): boolean => {
    return ticketsByBuilding.some(ticket => hasUnreadMentions(ticket.id))
  }, [hasUnreadMentions])

  return {
    unreadMentions,
    isLoading,
    hasUnreadMentions,
    buildingHasUnreadMentions,
    reload: loadUnreadMentions
  }
}

