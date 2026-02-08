
import { supabase } from "./supabaseClient";

export interface LeaveRequest {
    id: string;
    user_id: string;
    type: 'sick' | 'casual' | 'paid';
    start_date: string;
    end_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at?: string;
}

export const leaveService = {
    async requestLeave(userId: string, leave: Omit<LeaveRequest, 'id' | 'user_id' | 'status' | 'created_at'>) {
        const { data, error } = await supabase
            .from('leave_requests')
            .insert([
                {
                    user_id: userId,
                    leave_type: leave.type, // Map 'type' to 'leave_type'
                    start_date: leave.start_date,
                    end_date: leave.end_date,
                    reason: leave.reason,
                    status: 'pending'
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getMyLeaves(userId: string) {
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching leaves:", error);
            return [];
        }
        return data as any[];
    },

    async getAllEnsurePendingLeaves() {
        // Admin function
        const { data, error } = await supabase
            .from('leaves')
            .select('*, users(name, email)') // Join with users to see who requested
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },

    async updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected', adminNote?: string) {
        const { data, error } = await supabase
            .from('leaves')
            .update({ status, admin_note: adminNote })
            .eq('id', leaveId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
