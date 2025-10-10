// Unified notification management hook
// Handles all notification types with extensible architecture
import { useMemo, useCallback } from 'react'
import { useUnreadMentions } from './useUnreadMentions'
import type { BuildingNotifications, NotificationType } from '../types/notifications'

interface UseNotificationsProps {
  projectId: string | null
  tickets: any[]
  userId: string | null
  userEmail: string | null
}

export function useNotifications({
  projectId,
  tickets,
  userId,
  userEmail
}: UseNotificationsProps) {
  // Load comment mention notifications
  const {
    unreadMentions,
    isLoading: mentionsLoading,
    hasUnreadMentions,
    buildingHasUnreadMentions,
    reload: reloadMentions
  } = useUnreadMentions(projectId, tickets, userId, userEmail)

  // Future: Add other notification type hooks here
  // const { unreadStatusChanges, ... } = useStatusChangeNotifications(...)
  // const { unreadAssignments, ... } = useAssignmentNotifications(...)

  // Aggregate notifications by building (zone object)
  const notificationsByBuilding = useMemo(() => {
    const result: { [buildingId: string]: BuildingNotifications } = {}

    // Process comment mentions
    tickets.forEach(ticket => {
      const buildingId = ticket.zone_object_id
      if (!buildingId) return

      const hasCommentMentions = hasUnreadMentions(ticket.id)
      
      if (hasCommentMentions) {
        if (!result[buildingId]) {
          result[buildingId] = {
            buildingId,
            unreadCount: 0,
            notifications: [],
            hasCommentMentions: false
          }
        }
        
        result[buildingId].hasCommentMentions = true
        result[buildingId].unreadCount += unreadMentions[ticket.id]?.length || 0
        
        // Create notification objects for each unread mention
        const mentionCommentIds = unreadMentions[ticket.id] || []
        const comments = ticket.comments || []
        
        mentionCommentIds.forEach(commentId => {
          const comment = comments.find((c: any) => c.id === commentId)
          if (comment) {
            result[buildingId].notifications.push({
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
    })

    // Future: Process other notification types here
    // - Status changes
    // - Assignments
    // - Priority changes
    // - Checklist updates

    return result
  }, [tickets, unreadMentions, hasUnreadMentions, userId])

  // Check if a specific building has any unread notifications
  const buildingHasNotifications = useCallback((buildingId: string): boolean => {
    return !!notificationsByBuilding[buildingId] && 
           notificationsByBuilding[buildingId].unreadCount > 0
  }, [notificationsByBuilding])

  // Get notification count for a building
  const getBuildingNotificationCount = useCallback((buildingId: string): number => {
    return notificationsByBuilding[buildingId]?.unreadCount || 0
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
    getBuildingNotificationCount,
    buildingHasUnreadMentions, // Legacy compatibility
    markBuildingAsRead,
    reload,
    isLoading: mentionsLoading
  }
}

