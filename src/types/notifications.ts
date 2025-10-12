// Extensible notification type system
// Start with comment mentions, ready for future notification types

export type NotificationType = 
  | 'comment_mention'
  | 'status_change'      // future: when ticket status changes
  | 'assignment'          // future: when assigned to ticket
  | 'priority_change'     // future: when priority changes
  | 'checklist_update'    // future: when checklist item completed

export interface Notification {
  id: string
  type: NotificationType
  ticketId: string
  zoneObjectId: string
  userId: string          // recipient user ID
  read: boolean
  createdAt: string
  metadata: Record<string, any>  // flexible data per notification type
}

// Type-specific metadata interfaces for better type safety
export interface CommentMentionMetadata {
  commentId: string
  commentText: string
  mentionedBy: string
  mentionedByName?: string
}

export interface StatusChangeMetadata {
  oldStatus: string
  newStatus: string
  changedBy: string
  changedByName?: string
}

export interface AssignmentMetadata {
  assignedBy: string
  assignedByName?: string
  previousAssignee?: string
}

// Building-level notification aggregation
export interface BuildingNotifications {
  buildingId: string
  unreadCount: number
  notifications: Notification[]
  hasCommentMentions: boolean
  hasAssignments: boolean
  assignmentCount: number
  commentCount?: number
  // Future: hasStatusChanges, hasAssignments, etc.
}
