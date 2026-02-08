"use client";
import React, { useEffect, useState } from 'react';
import styles from './ClockWidget.module.css';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { attendanceService, AttendanceRecord } from '../lib/attendanceService';

export const ClockWidget = () => {
    const { user, profile } = useAuth();
    const [record, setRecord] = useState<AttendanceRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [duration, setDuration] = useState(0); // in seconds
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second for the digital clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch initial attendance status
    useEffect(() => {
        if (user) {
            fetchAttendance();
        }
    }, [user]);

    const fetchAttendance = async () => {
        try {
            if (!user) return;
            const data = await attendanceService.getTodayAttendance(user.id);
            setRecord(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Realtime Listener
    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('clock_widget_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance', filter: `user_id=eq.${user.id}` },
                () => {
                    fetchAttendance(); // Reload on any change by this user
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    // Timer logic for logged-in user
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (record?.clock_in && !record?.clock_out) {
            // Calculate elapsed time
            const startTime = new Date(record.clock_in).getTime();

            const updateTimer = () => {
                const now = new Date().getTime();
                const diff = Math.floor((now - startTime) / 1000);
                setDuration(diff);
            };

            updateTimer(); // initial call
            interval = setInterval(updateTimer, 1000);
        }

        return () => clearInterval(interval);
    }, [record]);

    const getGeoLocation = (): Promise<{ lat: number, lng: number } | undefined> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn("Geolocation not supported");
                resolve(undefined);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => {
                    console.error("Geo error:", err);
                    resolve(undefined);
                }
            );
        });
    };

    const handleClockIn = async () => {
        try {
            if (!user) return;

            let status: 'present' | 'late' = 'present';

            // Check Shift Timings
            if (profile?.shift_start && profile?.shift_end) {
                const now = new Date();
                const [startH, startM] = profile.shift_start.split(':').map(Number);
                const [endH, endM] = profile.shift_end.split(':').map(Number);

                const startTime = new Date(now);
                startTime.setHours(startH, startM, 0, 0);

                const endTime = new Date(now);
                endTime.setHours(endH, endM, 0, 0);

                // Allow clock-in up to 2 hours early
                const earlyBuffer = new Date(startTime);
                earlyBuffer.setHours(startH - 2);

                if (endTime < startTime) {
                    // Overnight Shift logic
                    if (now >= startTime) {
                        const graceTime = new Date(startTime);
                        graceTime.setMinutes(startM + 15);
                        if (now > graceTime) status = 'late';
                    } else if (now <= endTime) {
                        status = 'late';
                    } else if (now < earlyBuffer) {
                        alert(`You are too early! Shift starts at ${profile.shift_start}`);
                        return;
                    }
                } else {
                    // Standard Day Shift
                    if (now < earlyBuffer) {
                        alert(`You are too early! Shift starts at ${profile.shift_start}`);
                        return;
                    }
                    if (now > endTime) {
                        alert(`Shift ended at ${profile.shift_end}. You cannot clock in now.`);
                        return;
                    }

                    const graceTime = new Date(startTime);
                    graceTime.setMinutes(startM + 15);

                    if (now > graceTime) {
                        status = 'late';
                    }
                }
            }

            setLoading(true);

            // Capture photo
            const photoBlob = await attendanceService.capturePhoto();
            if (!photoBlob) {
                const proceed = confirm('Camera access failed. Continue without photo?');
                if (!proceed) {
                    setLoading(false);
                    return;
                }
            }

            const loc = await getGeoLocation();
            await attendanceService.clockIn(user.id, loc, status, photoBlob);
            await fetchAttendance();
        } catch (err) {
            console.error(err);
            alert("Failed to clock in");
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        try {
            if (!record) return;
            setLoading(true);

            // Capture photo
            const photoBlob = await attendanceService.capturePhoto();
            if (!photoBlob) {
                const proceed = confirm('Camera access failed. Continue without photo?');
                if (!proceed) {
                    setLoading(false);
                    return;
                }
            }

            const loc = await getGeoLocation();
            await attendanceService.clockOut(record.id, loc, photoBlob);
            await fetchAttendance();
            setDuration(0);
        } catch (err) {
            console.error(err);
            alert("Failed to clock out");
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (subSeconds: number) => {
        const h = Math.floor(subSeconds / 3600);
        const m = Math.floor((subSeconds % 3600) / 60);
        const s = subSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const isClockedIn = record?.clock_in && !record?.clock_out;
    const isClockedOut = !!record?.clock_out;

    return (
        <div className={styles.container}>
            <div className={styles.statusIndicator}>
                <div className={`${styles.dot} ${isClockedIn ? styles.active : ''}`} />
                <span>{isClockedIn ? 'Working' : isClockedOut ? 'Finished' : 'Absent'}</span>
            </div>

            <div className={styles.currentTime}>{formatTime(currentTime)}</div>
            <div className={styles.date}>{formatDate(currentTime)}</div>

            {profile?.shift_start && profile?.shift_end && (
                <div style={{
                    marginTop: '8px',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(0,0,0,0.05)',
                    padding: '4px 12px',
                    borderRadius: '12px'
                }}>
                    Shift: {profile.shift_start} - {profile.shift_end}
                </div>
            )}

            {isClockedIn ? (
                <div className={`${styles.timerCircle} ${styles.active}`}>
                    <div className={styles.timerLabel}>Effective Hours</div>
                    <div className={styles.timerValue}>{formatDuration(duration)}</div>
                </div>
            ) : (
                <div className={styles.timerCircle}>
                    <div className={styles.timerLabel} style={{ color: 'var(--text-muted)' }}>Ready to Start</div>
                    <div className={styles.timerValue} style={{ color: 'var(--text-muted)' }}>--:--:--</div>
                </div>
            )}

            <div className={styles.actions}>
                {!isClockedIn && !isClockedOut && (
                    <button className={`${styles.clockBtn} ${styles.btnIn}`} onClick={handleClockIn} disabled={loading}>
                        {loading ? '...' : 'CLOCK IN'}
                    </button>
                )}

                {isClockedIn && (
                    <button className={`${styles.clockBtn} ${styles.btnOut}`} onClick={handleClockOut} disabled={loading}>
                        {loading ? '...' : 'CLOCK OUT'}
                    </button>
                )}

                {isClockedOut && (
                    <button className={`${styles.clockBtn} ${styles.btnDisabled}`} disabled>
                        COMPLETED
                    </button>
                )}
            </div>
        </div>
    );
};
