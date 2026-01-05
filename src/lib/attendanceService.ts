
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
        try {
            const res = await fetch(`/api/attendance/today?uid=${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store' // Next.js: ensure we don't cache locally in the fetch client overly aggressively if logic depends on it
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data as AttendanceRecord | null;
        } catch (err) {
            console.error('Error fetching attendance via API:', err);
            return null;
        }
    },

    async checkGeofence(location?: { lat: number, lng: number }) {
        if (!location) return true;

        let officeLat, officeLng, radius;

        try {
            // Use cached API
            const res = await fetch('/api/sites/settings', { cache: 'no-store' });
            if (res.ok) {
                const { value } = await res.json();
                if (value) {
                    officeLat = value.office_lat;
                    officeLng = value.office_lng;
                    radius = value.radius_meters || 100;
                }
            }
        } catch (e) {
            console.error("Failed to fetch geofence settings via API", e);
            // Fallback to allowing or maybe direct DB call if critical? 
            // For safety/availability, we might default to 'allow' if system is down, 
            // OR strictly perform a direct DB lookup as backup.
            // Let's do a direct DB lookup as backup.
            const { data } = await supabase.from('settings').select('value').eq('key', 'general').single();
            if (data && data.value) {
                officeLat = data.value.office_lat;
                officeLng = data.value.office_lng;
                radius = data.value.radius_meters || 100;
            }
        }

        if (!officeLat) return true; // No geofence set

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
