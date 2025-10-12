// Unified notification management hook
// Handles all notification types with extensible architecture
import { useMemo, useCallback, useEffect, useState } from 'react'
import { useUnreadMentions } from './useUnreadMentions'
import type { BuildingNotifications, NotificationType } from '../types/notifications'
import { supabase } from '../lib/supabase'

interface UseNotificationsProps {
  projectId: string | null
  tickets: any[]
  userId: string | null
  userEmail: string | null
  userDisplayName?: string | null
}

export function useNotifications({
  projectId,
  tickets,
  userId,
  userEmail,
  userDisplayName
}: UseNotificationsProps) {
  const [profileAliases, setProfileAliases] = useState<string[]>([])

  useEffect(() => {
    if (!userId) {
      setProfileAliases([])
      return
    }

    let cancelled = false

    const loadProfileAliases = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          console.warn('[useNotifications] Failed to load profile aliases', error)
        }

        if (!cancelled) {
          const aliases: string[] = []
          const addAlias = (value?: unknown) => {
            if (typeof value !== 'string') return
            const trimmed = value.trim()
            if (!trimmed) return
            aliases.push(trimmed)
          }

          if (data) {
            const record = data as Record<string, unknown>
            addAlias(record.handle)
            addAlias(record.username)
            addAlias(record.display_name)
            addAlias(record.full_name)
            addAlias(record.slug)
            addAlias(record.email)
            addAlias(record.name)
          }

          console.log('[useNotifications] profile aliases', JSON.stringify({ userId, aliases }, null, 2))
          setProfileAliases(aliases)
        }
      } catch (profileErr) {
        if (!cancelled) {
          console.warn('[useNotifications] Exception while loading profile aliases', profileErr)
          setProfileAliases([])
        }
      }
    }

    void loadProfileAliases()

    return () => {
      cancelled = true
    }
  }, [userId])

  // Load comment mention notifications
  const {
    unreadMentions,
    isLoading: mentionsLoading,
    hasUnreadMentions,
    buildingHasUnreadMentions,
    reload: reloadMentions
  } = useUnreadMentions(projectId, tickets, userId, userEmail, userDisplayName, profileAliases)

  // Future: Add other notification type hooks here
  // const { unreadStatusChanges, ... } = useStatusChangeNotifications(...)
  // const { unreadAssignments, ... } = useAssignmentNotifications(...)

  // Aggregate notifications by building (zone object)
  const notificationsByBuilding = useMemo(() => {
    const result: { [buildingId: string]: BuildingNotifications } = {}

    const ensureEntry = (buildingId: string): BuildingNotifications => {
      if (!result[buildingId]) {
        result[buildingId] = {
          buildingId,
          unreadCount: 0,
          notifications: [],
          hasCommentMentions: false,
          hasAssignments: false,
          assignmentCount: 0
        }
      }
      return result[buildingId]
    }

    console.log('[useNotifications] tickets snapshot', JSON.stringify({
      total: tickets.length,
      ticketIds: tickets.map((t) => t?.id ?? null)
    }, null, 2))

    // Process comment mentions
    tickets.forEach(ticket => {
      console.log('[useNotifications] processing ticket', JSON.stringify({
        ticketId: ticket?.id ?? null,
        zoneObjectId: ticket?.zone_object_id ?? null,
        title: ticket?.title ?? null,
        hasComments: Array.isArray(ticket?.comments) ? ticket.comments.length : undefined,
        hasUnread: hasUnreadMentions(ticket?.id)
      }, null, 2))
      const buildingId = ticket.zone_object_id
      if (!buildingId) return

      const hasCommentMentions = hasUnreadMentions(ticket.id)
      
      if (hasCommentMentions) {
        const entry = ensureEntry(buildingId)
        entry.hasCommentMentions = true
        entry.unreadCount += unreadMentions[ticket.id]?.length || 0
        
        // Create notification objects for each unread mention
        const mentionCommentIds = unreadMentions[ticket.id] || []
        const comments = ticket.comments || []
        
        mentionCommentIds.forEach(commentId => {
          const comment = comments.find((c: any) => c.id === commentId)
          if (comment) {
            entry.notifications.push({
              id: `mention-${commentId}`,
              type: 'comment_mention' as NotificationType,
              ticketId: ticket.id,
              zoneObjectId: buildingId,
              userId: userId || '',
              read: false,
              createdAt: comment.ts || new Date().toISOString(),
              metadata: {
                commentId: comment.id,
                commentText: comment.text,
                mentionedBy: comment.author_id || '',
                mentionedByName: comment.author || 'Unknown'
              }
            })
          }
        })
      }

      // Process assignments for current user
      if (userId && ticket.assignee_id && ticket.assignee_id === userId) {
        const isArchived = typeof ticket.board_column === 'string' && ticket.board_column === 'archived'
        const isDone = typeof ticket.status === 'string' && ticket.status.toLowerCase() === 'done'
        if (!isArchived && !isDone) {
          const entry = ensureEntry(buildingId)
          entry.hasAssignments = true
          entry.assignmentCount += 1
          entry.unreadCount += 1
          entry.notifications.push({
            id: `assignment-${ticket.id}`,
            type: 'assignment',
            ticketId: ticket.id,
            zoneObjectId: buildingId,
            userId,
            read: false,
            createdAt: ticket.updated_at || ticket.created_at || new Date().toISOString(),
            metadata: {
              ticketTitle: ticket.title,
              priority: ticket.priority,
              status: ticket.status
            }
          })
        }
      }
    })

    // Future: Process other notification types here
    // - Status changes
    // - Priority changes
    // - Checklist updates
    return result
  }, [tickets, unreadMentions, hasUnreadMentions, userId])

  useEffect(() => {
    console.log('[useNotifications] notifications snapshot raw', { userId, notificationsByBuilding })
    try {
      console.log('[useNotifications] notifications snapshot', JSON.stringify({
        userId,
        notificationsByBuilding
      }, null, 2))
    } catch (err) {
      console.log('[useNotifications] notifications snapshot (serialization failed)', {
        userId,
        error: err instanceof Error ? err.message : err
      })
    }
  }, [notificationsByBuilding, userId])

  // Check if a specific building has any unread notifications
  const buildingHasNotifications = useCallback((buildingId: string): boolean => {
    return !!notificationsByBuilding[buildingId] && 
           notificationsByBuilding[buildingId].unreadCount > 0
  }, [notificationsByBuilding])

  const buildingHasAssignments = useCallback((buildingId: string): boolean => {
    return !!notificationsByBuilding[buildingId]?.hasAssignments
  }, [notificationsByBuilding])

  // Get notification count for a building
  const getBuildingNotificationCount = useCallback((buildingId: string): number => {
    return notificationsByBuilding[buildingId]?.unreadCount || 0
  }, [notificationsByBuilding])

  const getBuildingAssignmentCount = useCallback((buildingId: string): number => {
    return notificationsByBuilding[buildingId]?.assignmentCount || 0
  }, [notificationsByBuilding])

  // Mark all notifications for a building as read
  const markBuildingAsRead = useCallback(async (buildingId: string) => {
    // Currently only handles comment mentions
    // Future: Handle other notification types
    await reloadMentions()
  }, [reloadMentions])

  // Reload all notifications
  const reload = useCallback(() => {
    reloadMentions()
    // Future: Reload other notification types
  }, [reloadMentions])

  return {
    notificationsByBuilding,
    buildingHasNotifications,
    buildingHasAssignments,
    getBuildingNotificationCount,
    getBuildingAssignmentCount,
    buildingHasUnreadMentions, // Legacy compatibility
    markBuildingAsRead,
    reload,
    isLoading: mentionsLoading
  }
}
