
import { supabase } from "./supabaseClient";

export interface AttendanceRecord {
    id: string;
    user_id: string;
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    status: 'present' | 'absent' | 'half-day' | 'late';
    total_hours: number;
    photo_in?: string | null;
    photo_out?: string | null;
    location_in?: { lat: number, lng: number } | null;
    location_out?: { lat: number, lng: number } | null;
}

export const attendanceService = {
    async getTodayAttendance(userId: string) {
        try {
            const res = await fetch(`/api/attendance/today?uid=${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store'
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
            const { data } = await supabase.from('settings').select('value').eq('key', 'general').single();
            if (data && data.value) {
                officeLat = data.value.office_lat;
                officeLng = data.value.office_lng;
                radius = data.value.radius_meters || 100;
            }
        }

        if (!officeLat) return true;

        // Haversine formula
        const R = 6371e3;
        const φ1 = location.lat * Math.PI / 180;
        const φ2 = officeLat * Math.PI / 180;
        const Δφ = (officeLat - location.lat) * Math.PI / 180;
        const Δλ = (officeLng - location.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;

        if (d > radius) {
            throw new Error(`You are ${Math.round(d)}m away from office. Must be within ${radius}m.`);
        }
        return true;
    },

    async capturePhoto(): Promise<Blob | null> {
        try {
            // Check if browser supports camera
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('Camera not supported in this browser');
                return null;
            }

            return new Promise((resolve, reject) => {
                const video = document.createElement('video');
                const canvas = document.createElement('canvas');
                let stream: MediaStream | null = null;

                // Timeout after 10 seconds
                const timeout = setTimeout(() => {
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                    reject(new Error('Camera capture timeout'));
                }, 10000);

                navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                })
                    .then(mediaStream => {
                        stream = mediaStream;
                        video.srcObject = stream;
                        video.setAttribute('playsinline', 'true'); // For iOS
                        video.play();

                        // Wait for video to be ready
                        video.onloadedmetadata = () => {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;

                            // Capture frame after video is ready
                            setTimeout(() => {
                                try {
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                        ctx.drawImage(video, 0, 0);
                                        canvas.toBlob((blob) => {
                                            clearTimeout(timeout);
                                            // Stop camera
                                            if (stream) {
                                                stream.getTracks().forEach(track => track.stop());
                                            }
                                            resolve(blob);
                                        }, 'image/jpeg', 0.85);
                                    } else {
                                        clearTimeout(timeout);
                                        if (stream) {
                                            stream.getTracks().forEach(track => track.stop());
                                        }
                                        resolve(null);
                                    }
                                } catch (err) {
                                    clearTimeout(timeout);
                                    if (stream) {
                                        stream.getTracks().forEach(track => track.stop());
                                    }
                                    console.error('Error capturing frame:', err);
                                    resolve(null);
                                }
                            }, 1000); // Increased delay for better capture
                        };

                        video.onerror = (err) => {
                            clearTimeout(timeout);
                            if (stream) {
                                stream.getTracks().forEach(track => track.stop());
                            }
                            console.error('Video error:', err);
                            resolve(null);
                        };
                    })
                    .catch(err => {
                        clearTimeout(timeout);
                        console.error('Camera access denied:', err);
                        resolve(null);
                    });
            });
        } catch (err) {
            console.error('capturePhoto error:', err);
            return null;
        }
    },

    async uploadPhoto(userId: string, photo: Blob, type: 'in' | 'out'): Promise<string | null> {
        try {
            const timestamp = new Date().getTime();
            const fileName = `${userId}/${type}_${timestamp}.jpg`;

            const { data, error } = await supabase.storage
                .from('attendance-photos')
                .upload(fileName, photo, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (error) {
                console.error('Photo upload error:', error);
                return null;
            }

            return data.path;
        } catch (err) {
            console.error('Upload failed:', err);
            return null;
        }
    },

    async clockIn(userId: string, location?: { lat: number, lng: number }, status: 'present' | 'late' | 'absent' = 'present', photoBlob?: Blob | null) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        let photoPath: string | null = null;

        // Upload photo if provided
        if (photoBlob) {
            photoPath = await this.uploadPhoto(userId, photoBlob, 'in');
        }

        const { data, error } = await supabase
            .from('attendance')
            .insert([
                {
                    user_id: userId,
                    date: today,
                    clock_in: now,
                    status: status,
                    location_in: location,
                    photo_in: photoPath
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async clockOut(attendanceId: string, location?: { lat: number, lng: number }, photoBlob?: Blob | null) {
        await this.checkGeofence(location);

        const now = new Date().toISOString();

        let photoPath: string | null = null;

        // Upload photo if provided
        if (photoBlob) {
            // Get user_id from attendance record
            const { data: record } = await supabase
                .from('attendance')
                .select('user_id')
                .eq('id', attendanceId)
                .single();

            if (record) {
                photoPath = await this.uploadPhoto(record.user_id, photoBlob, 'out');
            }
        }

        const { data, error } = await supabase
            .from('attendance')
            .update({
                clock_out: now,
                location_out: location,
                photo_out: photoPath
            })
            .eq('id', attendanceId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    getPhotoUrl(path: string | null): string | null {
        if (!path) return null;

        const { data } = supabase.storage
            .from('attendance-photos')
            .getPublicUrl(path);

        return data.publicUrl;
    }
};
