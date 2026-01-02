
import { supabase } from "./supabaseClient";

export interface AttendanceRecord {
    id: string;
    user_id: string;
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    status: 'present' | 'absent' | 'half-day';
    total_hours: number;
}

export const attendanceService = {
    async getTodayAttendance(userId: string) {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error fetching attendance:', error);
            return null;
        }
        return data as AttendanceRecord | null;
    },

    async checkGeofence(location?: { lat: number, lng: number }) {
        if (!location) return true; // If no location provided (or device disabled), skip or fail? Policy depends. For now allow but warn.

        const { data } = await supabase.from('settings').select('value').eq('key', 'general').single();
        if (!data || !data.value || !data.value.office_lat) return true; // No geofence set

        const officeLat = data.value.office_lat;
        const officeLng = data.value.office_lng;
        const radius = data.value.radius_meters || 100;

        // Haversine formula
        const R = 6371e3; // metres
        const φ1 = location.lat * Math.PI / 180;
        const φ2 = officeLat * Math.PI / 180;
        const Δφ = (officeLat - location.lat) * Math.PI / 180;
        const Δλ = (officeLng - location.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // in metres

        if (d > radius) {
            throw new Error(`You are ${Math.round(d)}m away from office. Must be within ${radius}m.`);
        }
        return true;
    },

    async clockIn(userId: string, location?: { lat: number, lng: number }) {
        await this.checkGeofence(location);

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('attendance')
            .insert([
                {
                    user_id: userId,
                    date: today,
                    clock_in: now,
                    status: 'present',
                    location_in: location
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async clockOut(attendanceId: string, location?: { lat: number, lng: number }) {
        await this.checkGeofence(location);

        const now = new Date().toISOString();

        // We need to calculate total hours. 
        // Ideally this is done in a database trigger or edge function, but we can do a rough calc here or let the backend handle it.
        // For now, just update the clock_out time.

        const { data, error } = await supabase
            .from('attendance')
            .update({
                clock_out: now,
                location_out: location
            })
            .eq('id', attendanceId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
