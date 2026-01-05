
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
            .from('leaves')
            .insert([
                {
                    user_id: userId,
                    type: leave.type,
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
        try {
            const res = await fetch(`/api/leaves?uid=${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store'
            });
            if (!res.ok) throw new Error("Failed to fetch leaves");
            const data = await res.json();
            return data as LeaveRequest[];
        } catch (error) {
            console.error("Error fetching leaves:", error);
            return [];
        }
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
