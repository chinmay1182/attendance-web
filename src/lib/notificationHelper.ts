import { supabase } from './supabaseClient';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'leave' | 'reward' | 'goal' | 'attendance' | 'document' | 'system' | 'task';

export interface Notification {
    id: string;
    created_at: string;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    category?: NotificationCategory;
    is_read: boolean;
    action_url?: string;
    related_id?: string;
}

/**
 * Create a notification for a specific user
 */
export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'info',
    category?: NotificationCategory,
    actionUrl?: string,
    relatedId?: string
): Promise<void> {
    try {
        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            title,
            message,
            type,
            category,
            action_url: actionUrl,
            related_id: relatedId,
        });

        if (error) {
            console.error('Failed to create notification:', error);
        }
    } catch (err) {
        console.error('Notification creation error:', err);
    }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
    userIds: string[],
    title: string,
    message: string,
    type: NotificationType = 'info',
    category?: NotificationCategory,
    actionUrl?: string
): Promise<void> {
    try {
        const notifications = userIds.map(userId => ({
            user_id: userId,
            title,
            message,
            type,
            category,
            action_url: actionUrl,
        }));

        const { error } = await supabase.from('notifications').insert(notifications);

        if (error) {
            console.error('Failed to create bulk notifications:', error);
        }
    } catch (err) {
        console.error('Bulk notification creation error:', err);
    }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Failed to mark notification as read:', error);
        }
    } catch (err) {
        console.error('Mark as read error:', err);
    }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllAsRead(userId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Failed to mark all as read:', error);
        }
    } catch (err) {
        console.error('Mark all as read error:', err);
    }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) {
            console.error('Failed to delete notification:', error);
        }
    } catch (err) {
        console.error('Delete notification error:', err);
    }
}

/**
 * Get unread count for user
 */
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Failed to get unread count:', error);
            return 0;
        }

        return count || 0;
    } catch (err) {
        console.error('Get unread count error:', err);
        return 0;
    }
}

/**
 * Notification templates for common actions
 */
export const NotificationTemplates = {
    // Rewards
    rewardGranted: (points: number) => ({
        title: '🎉 Reward Granted!',
        message: `You received ${points} reward points!`,
        type: 'success' as NotificationType,
        category: 'reward' as NotificationCategory,
        actionUrl: '/rewards',
    }),

    // Performance
    goalAssigned: (goalTitle: string) => ({
        title: '🎯 New Goal Assigned',
        message: `A new performance goal has been assigned: ${goalTitle}`,
        type: 'info' as NotificationType,
        category: 'goal' as NotificationCategory,
        actionUrl: '/performance',
    }),

    goalProgressUpdated: (goalTitle: string, progress: number) => ({
        title: '📊 Goal Progress Updated',
        message: `Your goal "${goalTitle}" progress updated to ${progress}%`,
        type: 'info' as NotificationType,
        category: 'goal' as NotificationCategory,
        actionUrl: '/performance',
    }),

    // Leave
    leaveApproved: () => ({
        title: '✅ Leave Approved',
        message: 'Your leave request has been approved',
        type: 'success' as NotificationType,
        category: 'leave' as NotificationCategory,
        actionUrl: '/leave-requests',
    }),

    leaveRejected: (reason?: string) => ({
        title: '❌ Leave Rejected',
        message: reason ? `Your leave request was rejected: ${reason}` : 'Your leave request was rejected',
        type: 'error' as NotificationType,
        category: 'leave' as NotificationCategory,
        actionUrl: '/leave-requests',
    }),

    leaveRequested: (employeeName: string) => ({
        title: '📝 New Leave Request',
        message: `${employeeName} submitted a leave request`,
        type: 'info' as NotificationType,
        category: 'leave' as NotificationCategory,
        actionUrl: '/leave-policy',
    }),

    // Documents
    documentUploaded: (fileName: string) => ({
        title: '📄 Document Uploaded',
        message: `New document uploaded: ${fileName}`,
        type: 'info' as NotificationType,
        category: 'document' as NotificationCategory,
        actionUrl: '/documents',
    }),

    // Tasks
    taskAssigned: (taskTitle: string) => ({
        title: '📌 New Task Assigned',
        message: `You have been assigned a new task: ${taskTitle}`,
        type: 'info' as NotificationType,
        category: 'task' as NotificationCategory,
        actionUrl: '/tasks',
    }),

    // System
    welcome: () => ({
        title: '👋 Welcome!',
        message: 'Welcome to the attendance management system',
        type: 'info' as NotificationType,
        category: 'system' as NotificationCategory,
        actionUrl: '/dashboard',
    }),
};
