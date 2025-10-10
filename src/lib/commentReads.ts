// Comment read tracking helpers
import { supabase } from './supabase'

export interface CommentRead {
  id: string
  ticket_id: string
  comment_id: string
  user_id: string
  read_at: string
  created_at: string
}

/**
 * Mark a comment as read by current user
 */
export async function markCommentAsRead(
  ticketId: string,
  commentId: string,
  userId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { data, error } = await supabase
      .from('comment_reads')
      .upsert(
        {
          ticket_id: ticketId,
          comment_id: commentId,
          user_id: userId,
          read_at: new Date().toISOString()
        },
        {
          onConflict: 'ticket_id,comment_id,user_id'
        }
      )
    
    if (error) {
      console.error('❌ Error marking comment as read:', error)
      return { success: false, error }
    }
    
    return { success: true }
  } catch (err) {
    console.error('❌ Exception marking comment as read:', err)
    return { success: false, error: err }
  }
}

/**
 * Mark all comments in a ticket as read by current user
 */
export async function markAllCommentsAsRead(
  ticketId: string,
  commentIds: string[],
  userId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const reads = commentIds.map(commentId => ({
      ticket_id: ticketId,
      comment_id: commentId,
      user_id: userId,
      read_at: new Date().toISOString()
    }))
    
    const { data, error } = await supabase
      .from('comment_reads')
      .upsert(reads, {
        onConflict: 'ticket_id,comment_id,user_id'
      })
    
    if (error) {
      console.error('❌ Error marking comments as read:', error)
      return { success: false, error }
    }
    
    console.log(`✅ Marked ${commentIds.length} comments as read for ticket ${ticketId}`)
    return { success: true }
  } catch (err) {
    console.error('❌ Exception marking comments as read:', err)
    return { success: false, error: err }
  }
}

/**
 * Get read comment IDs for a ticket and user
 */
export async function getReadCommentIds(
  ticketId: string,
  userId: string
): Promise<{ commentIds: string[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from('comment_reads')
      .select('comment_id')
      .eq('ticket_id', ticketId)
      .eq('user_id', userId)
    
    if (error) {
      console.error('❌ Error fetching read comments:', error)
      return { commentIds: [], error }
    }
    
    const commentIds = (data || []).map(r => r.comment_id)
    return { commentIds }
  } catch (err) {
    console.error('❌ Exception fetching read comments:', err)
    return { commentIds: [], error: err }
  }
}

/**
 * Get unread comment IDs that mention the user
 */
export async function getUnreadMentionCommentIds(
  ticketId: string,
  comments: any[],
  userId: string,
  userEmail: string
): Promise<string[]> {
  try {
    // Get read comment IDs
    const { commentIds: readIds } = await getReadCommentIds(ticketId, userId)
    
    // Filter comments that mention user and are unread
    const username = userEmail.split('@')[0]
    const mentionPattern = new RegExp(`@${username}`, 'i')
    
    const unreadMentions = comments
      .filter(comment => {
        const text = comment.text || ''
        const isMentioned = mentionPattern.test(text)
        const isUnread = !readIds.includes(comment.id)
        return isMentioned && isUnread
      })
      .map(c => c.id)
    
    return unreadMentions
  } catch (err) {
    console.error('❌ Exception getting unread mentions:', err)
    return []
  }
}

