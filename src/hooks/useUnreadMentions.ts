// Hook to track unread comment mentions
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface UnreadMentionsMap {
  [ticketId: string]: string[] // Array of unread comment IDs
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function useUnreadMentions(
  projectId: string | null,
  tickets: any[],
  userId: string | null,
  userEmail: string | null,
  userDisplayName?: string | null,
  extraAliases: string[] = []
) {
  const [unreadMentions, setUnreadMentions] = useState<UnreadMentionsMap>({})
  const [isLoading, setIsLoading] = useState(false)

  const loadUnreadMentions = useCallback(async () => {
    if (!projectId || !userId || (!userEmail && !userDisplayName && extraAliases.length === 0) || tickets.length === 0) {
      setUnreadMentions({})
      return
    }

    setIsLoading(true)
    try {
      const mentionTokens: string[] = []

      const addTokenVariants = (value?: string | null) => {
        if (!value) return
        const trimmed = value.toString().trim().toLowerCase()
        if (!trimmed) return
        mentionTokens.push(trimmed)

        const alphaNum = trimmed.replace(/[^a-z0-9]/gi, '')
        if (alphaNum && alphaNum !== trimmed) {
          mentionTokens.push(alphaNum)
        }

        trimmed.split(/[\s._\-@]+/).forEach((segment) => {
          const part = segment.trim()
          if (part && part.length >= 2) {
            mentionTokens.push(part.toLowerCase())
          }
        })
      }

      if (userEmail) {
        addTokenVariants(userEmail)
        const localPart = userEmail.toLowerCase().split('@')[0]
        addTokenVariants(localPart)
      }

      if (userDisplayName) {
        addTokenVariants(userDisplayName)
      }

      if (userId) {
        addTokenVariants(userId)
      }

      extraAliases.forEach((alias) => {
        addTokenVariants(alias)
      })

      const normalizedTokens = Array.from(new Set(mentionTokens.filter(Boolean))).map((token) => token.toLowerCase())
      const mentionRegexes = normalizedTokens.map((token) => new RegExp(`@${escapeRegExp(token)}`, 'i'))
      const resolveMentionList = (raw: any): string[] => {
        if (!raw) return []
        if (Array.isArray(raw)) {
          return raw
            .map((item) => {
              if (!item) return null
              if (typeof item === 'string') return item.toLowerCase()
              if (typeof item === 'object') {
                return (
                  item.user_id?.toString().toLowerCase() ??
                  item.userId?.toString().toLowerCase() ??
                  item.id?.toString().toLowerCase() ??
                  item.email?.toString().toLowerCase() ??
                  item.value?.toString().toLowerCase() ??
                  null
                )
              }
              return null
            })
            .filter((value): value is string => Boolean(value))
        }
        return []
      }
      
      console.log('🔍 useUnreadMentions: Checking mentions for user:', {
        userEmail,
        userDisplayName,
        mentionTokens: normalizedTokens,
        extraAliases,
        ticketCount: tickets.length
      })
      
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
        if (error.message.includes('relation "comment_reads" does not exist')) {
          console.warn('⚠️ comment_reads table does not exist - showing all mentions as unread')
          // If table doesn't exist, treat all mentions as unread
        }
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
          const text = (comment.text || '').toString()
          const normalizedText = text.toLowerCase()
          const isUnread = !readCommentIds.has(comment.id)

          const directMentionMatch = mentionRegexes.some((regex) => regex.test(text))
          const simpleMentionMatch = normalizedTokens.some((token) => normalizedText.includes(`@${token}`))
          const list = resolveMentionList(comment.mentions || comment.mention_ids || comment.mentionIds)
          const listMentionMatch = list.some((value) => normalizedTokens.includes(value))

          if (text.includes('@')) {
            console.log('💬 Comment analysis:', {
              ticketId: ticket.id,
              commentId: comment.id,
              text,
              directMentionMatch,
              simpleMentionMatch,
              listMentionMatch,
              mentionRegexes: mentionRegexes.map((regex) => regex.toString()),
              normalizedTokens,
              list,
              isUnread,
              readCommentIds: Array.from(readCommentIds)
            })
          }

          return isUnread && (directMentionMatch || simpleMentionMatch || listMentionMatch)
        })
        
        if (unreadMentionComments.length > 0) {
          unreadMap[ticket.id] = unreadMentionComments.map((c: any) => c.id)
          console.log('✅ Found unread mentions for ticket:', ticket.id, unreadMap[ticket.id])
        }
      })
      
      console.log('📬 useUnreadMentions: unread map computed', JSON.stringify(unreadMap, null, 2))
      setUnreadMentions(unreadMap)
    } catch (err) {
      console.error('❌ Exception loading unread mentions:', err)
      setUnreadMentions({})
    } finally {
      setIsLoading(false)
    }
  }, [projectId, tickets, userId, userEmail, userDisplayName, extraAliases])

  useEffect(() => {
    loadUnreadMentions()
  }, [loadUnreadMentions])

  // Subscribe to realtime updates for tickets to detect new comments
  useEffect(() => {
    if (!projectId || !userId) return

    console.log('🔔 useUnreadMentions: Setting up realtime subscription for project:', projectId)

    const channel = supabase.channel(`mentions:${projectId}:${userId}`)

    // Listen for ticket UPDATE events (new comments added)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'object_tickets' },
      (payload) => {
        console.log('🔔 useUnreadMentions: Ticket updated, reloading mentions', {
          ticketId: payload.new.id,
          hasNewComments: !!payload.new.comments
        })
        // Reload mentions when any ticket is updated
        // The loadUnreadMentions will check all tickets and compute unread mentions
        setTimeout(() => loadUnreadMentions(), 500) // Small delay to ensure ticket data is fresh
      }
    )

    // Subscribe to comment_reads changes (when user marks comments as read)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comment_reads', filter: `user_id=eq.${userId}` },
      (payload) => {
        console.log('🔔 useUnreadMentions: Comment read status changed, reloading mentions', payload)
        setTimeout(() => loadUnreadMentions(), 300)
      }
    )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ useUnreadMentions: Realtime subscription active')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ useUnreadMentions: Realtime subscription error')
      }
    })

    return () => {
      console.log('🔔 useUnreadMentions: Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [projectId, userId, loadUnreadMentions])

  // Return whether a specific ticket has unread mentions
  const hasUnreadMentions = useCallback((ticketId: string): boolean => {
    return !!(unreadMentions[ticketId] && unreadMentions[ticketId].length > 0)
  }, [unreadMentions])

  // Return whether a building (zone object) has unread mentions in any of its tickets
  const buildingHasUnreadMentions = useCallback((buildingId: string, ticketsByBuilding: any[]): boolean => {
    const hasUnread = ticketsByBuilding.some(ticket => hasUnreadMentions(ticket.id))
    console.log('🏢 Building mention check:', {
      buildingId,
      ticketCount: ticketsByBuilding.length,
      hasUnread,
      unreadMentions
    })
    return hasUnread
  }, [hasUnreadMentions, unreadMentions])

  return {
    unreadMentions,
    isLoading,
    hasUnreadMentions,
    buildingHasUnreadMentions,
    reload: loadUnreadMentions
  }
}
