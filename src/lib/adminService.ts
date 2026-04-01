
import { supabase } from "./supabaseClient";
import { UserProfile } from "../types/user";
import { AttendanceRecord } from "./attendanceService";

export const adminService = {
    async getAllUsers(uid: string) {
        try {
            const res = await fetch(`/api/company/users?uid=${encodeURIComponent(uid)}`, {
                cache: 'no-store' // Always fetch fresh from API (which handles Redis caching)
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            return (data.users || []) as UserProfile[];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    },

    async getTodayAttendanceForAll() {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', today);

        if (error) throw error;
        return data as AttendanceRecord[];
    },

    async getAttendanceHistory() {
        const { data, error } = await supabase
            .from('attendance')
            .select('*, users(name, email)')
            .order('date', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data;
    }
};
