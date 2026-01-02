
import { supabase } from "./supabaseClient";
import { UserProfile } from "../types/user";
import { AttendanceRecord } from "./attendanceService";

export const adminService = {
    async getAllUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('name');

        if (error) throw error;
        return data as UserProfile[];
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
