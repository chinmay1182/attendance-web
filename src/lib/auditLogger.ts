import { supabase } from './supabaseClient';

/**
 * Audit Log Actions - Common actions to track
 */
export const AuditActions = {
    // Authentication
    USER_LOGIN: 'User Login',
    USER_LOGOUT: 'User Logout',
    USER_SIGNUP: 'User Signup',

    // User Management
    CREATE_USER: 'Create User',
    UPDATE_USER: 'Update User',
    DELETE_USER: 'Delete User',

    // Attendance (Employee Actions)
    CLOCK_IN: 'Clock In',
    CLOCK_OUT: 'Clock Out',
    UPDATE_ATTENDANCE: 'Update Attendance',
    VIEW_ATTENDANCE: 'View Attendance',

    // Leave Management (Employee Actions)
    CREATE_LEAVE: 'Create Leave Request',
    APPROVE_LEAVE: 'Approve Leave',
    REJECT_LEAVE: 'Reject Leave',
    CANCEL_LEAVE: 'Cancel Leave',
    VIEW_LEAVE: 'View Leave',

    // Rewards (Employee Actions)
    CREATE_REWARD: 'Create Reward',
    UPDATE_REWARD: 'Update Reward',
    DELETE_REWARD: 'Delete Reward',
    GRANT_REWARD: 'Grant Reward',
    VIEW_REWARDS: 'View Rewards',

    // Performance (Employee Actions)
    ASSIGN_GOAL: 'Assign Performance Goal',
    UPDATE_GOAL: 'Update Goal Progress',
    DELETE_GOAL: 'Delete Goal',
    VIEW_GOALS: 'View Performance Goals',

    // Documents (Employee Actions)
    UPLOAD_DOCUMENT: 'Upload Document',
    DELETE_DOCUMENT: 'Delete Document',
    DOWNLOAD_DOCUMENT: 'Download Document',
    VIEW_DOCUMENTS: 'View Documents',

    // Profile (Employee Actions)
    UPDATE_SETTINGS: 'Update Settings',
    UPDATE_PROFILE: 'Update Profile',
    VIEW_PROFILE: 'View Profile',

    // Company (Employee Actions)
    VIEW_COMPANY: 'View Company Info',
    VIEW_TEAM: 'View Team',

    // Audit Logs
    EXPORT_AUDIT_LOGS: 'Export Audit Logs',
    VIEW_AUDIT_LOGS: 'View Audit Logs',
} as const;

/**
 * Log an audit event
 * @param action - The action being performed (use AuditActions constants)
 * @param details - Additional details about the action
 * @param targetUserId - Optional: ID of the user being affected (if different from actor)
 */
export async function logAudit(
    action: string,
    details: string,
    targetUserId?: string
): Promise<void> {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('Cannot log audit: No authenticated user');
            return;
        }

        // Insert audit log
        const { error } = await supabase.from('audit_logs').insert({
            actor_id: user.id,
            action,
            details,
            user_id: targetUserId || user.id,
        });

        if (error) {
            console.error('Failed to log audit:', error);
        }
    } catch (err) {
        console.error('Audit logging error:', err);
    }
}

/**
 * Batch log multiple audit events
 * Useful for operations that affect multiple records
 */
export async function logAuditBatch(
    logs: Array<{
        action: string;
        details: string;
        targetUserId?: string;
    }>
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('Cannot log audit batch: No authenticated user');
            return;
        }

        const auditLogs = logs.map(log => ({
            actor_id: user.id,
            action: log.action,
            details: log.details,
            user_id: log.targetUserId || user.id,
        }));

        const { error } = await supabase.from('audit_logs').insert(auditLogs);

        if (error) {
            console.error('Failed to log audit batch:', error);
        }
    } catch (err) {
        console.error('Audit batch logging error:', err);
    }
}

/**
 * Helper function to format details for common operations
 */
export const formatAuditDetails = {
    created: (itemType: string, itemName: string) =>
        `Created ${itemType}: ${itemName}`,

    updated: (itemType: string, itemName: string, changes?: string) =>
        `Updated ${itemType}: ${itemName}${changes ? ` - ${changes}` : ''}`,

    deleted: (itemType: string, itemName: string) =>
        `Deleted ${itemType}: ${itemName}`,

    granted: (itemType: string, amount: number | string, recipient: string) =>
        `Granted ${amount} ${itemType} to ${recipient}`,

    approved: (itemType: string, itemName: string) =>
        `Approved ${itemType}: ${itemName}`,

    rejected: (itemType: string, itemName: string, reason?: string) =>
        `Rejected ${itemType}: ${itemName}${reason ? ` - Reason: ${reason}` : ''}`,
};
