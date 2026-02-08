"use client";
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './location-tracking.module.css';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

// Dynamically import Map component to avoid SSR issues
const Map = dynamic(() => import('../../components/LeafletMap'), {
    ssr: false,
    loading: () => <p>Loading Map...</p>
});

type UserLocation = {
    user_id: string;
    latitude: number;
    longitude: number;
    updated_at: string;
    user?: {
        name: string;
        photoURL?: string;
    };
    attendance?: {
        punch_in: string;
        punch_out: string;
        punch_in_photo: string;
        punch_out_photo: string;
    };
};

export default function LocationTrackingPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [locations, setLocations] = useState<UserLocation[]>([]);
    const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (!loading && profile?.role !== 'admin' && profile?.role !== 'hr') {
            router.push('/dashboard');
        }
    }, [profile, loading, router]);

    useEffect(() => {
        if (profile?.role === 'admin' || profile?.role === 'hr') {
            fetchLocations(); // Initial fetch

            // Subscribe to realtime location updates
            const channel = supabase.channel('tracking_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, (payload) => {
                    const newLocation = payload.new as UserLocation;
                    setLocations(prev => {
                        // Update existing or add new
                        const index = prev.findIndex(l => l.user_id === newLocation.user_id);
                        if (index > -1) {
                            const updated = [...prev];
                            updated[index] = { ...updated[index], ...newLocation };
                            return updated;
                        } else {
                            // If new user appears, we might need to fetch their name separately or refetch all
                            // For simplicity, refetching all to ensure joined data is correct
                            fetchLocations();
                            return prev;
                        }
                    });
                })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [profile]);

    const fetchLocations = async () => {
        // Fetch locations and users
        const { data: locationData, error } = await supabase
            .from('user_locations')
            .select(`
                user_id, latitude, longitude, updated_at,
                user:users(name)
            `);

        if (locationData) {
            // Fetch today's attendance for these users
            const today = new Date().toISOString().split('T')[0];
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('user_id, punch_in, punch_out, punch_in_photo, punch_out_photo')
                .eq('date', today)
                .in('user_id', locationData.map((l: any) => l.user_id));

            // Map Supabase response to UserLocation type safely with joined attendance
            const formattedData = locationData.map((item: any) => {
                const att = attendanceData?.find((a: any) => a.user_id === item.user_id);
                return {
                    user_id: item.user_id,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    updated_at: item.updated_at,
                    user: item.user,
                    attendance: att ? {
                        punch_in: att.punch_in,
                        punch_out: att.punch_out,
                        punch_in_photo: att.punch_in_photo,
                        punch_out_photo: att.punch_out_photo
                    } : undefined
                };
            });
            setLocations(formattedData);
        }
    };

    const handleExportHistory = async () => {
        try {
            const XLSX = await import('xlsx');
            const { data, error } = await supabase
                .from('attendance')
                .select(`
                    *,
                    user:users(name, department, email)
                `)
                .gte('date', exportStartDate)
                .lte('date', exportEndDate)
                .order('date', { ascending: false });

            if (data && data.length > 0) {
                const dataToExport = data.map((row: any) => ({
                    Date: row.date,
                    Employee: row.user?.name || 'Unknown',
                    Department: row.user?.department || '-',
                    Status: row.status,
                    PunchIn: row.punch_in ? new Date(row.punch_in).toLocaleTimeString() : '-',
                    PunchOut: row.punch_out ? new Date(row.punch_out).toLocaleTimeString() : '-',
                    Hours: row.total_hours || 0
                }));

                const ws = XLSX.utils.json_to_sheet(dataToExport);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Tracking History");
                XLSX.writeFile(wb, `Tracking_Export_${exportStartDate}_to_${exportEndDate}.xlsx`);
            } else {
                alert('No data found for the selected date range.');
            }
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export data.");
        }
    };

    if (loading) return null;

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Live Employee Tracking</h1>

                <div className={styles.mapContainer}>
                    <Map
                        markers={locations.map(loc => ({
                            id: loc.user_id,
                            lat: loc.latitude,
                            lng: loc.longitude,
                            title: loc.user?.name || 'Unknown User'
                        }))}
                    />
                </div>

                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <div>
                            <h2 className={styles.tableTitle}>Live Status</h2>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                                <input
                                    type="date"
                                    value={exportStartDate}
                                    onChange={(e) => setExportStartDate(e.target.value)}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                />
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>to</span>
                                <input
                                    type="date"
                                    value={exportEndDate}
                                    onChange={(e) => setExportEndDate(e.target.value)}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                />
                                <button
                                    onClick={handleExportHistory}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        background: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        color: '#334155'
                                    }}
                                >
                                    Export History
                                </button>
                            </div>
                        </div>
                        <div className={styles.statusCard}>
                            <div className={styles.statusItem}>
                                <div className={styles.dot} style={{ background: '#22c55e' }}></div> Live
                            </div>
                            <div className={styles.statusItem}>
                                <div className={styles.dot} style={{ background: '#94a3b8' }}></div> Offline
                            </div>
                        </div>
                    </div>

                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Status</th>
                                <th>Current Location</th>
                                <th>Last Updated</th>
                                <th>Punch In</th>
                                <th>Punch Out</th>
                                <th>Radius</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                                        No active employees found currently.
                                    </td>
                                </tr>
                            )}
                            {locations.map(loc => (
                                <tr key={loc.user_id}>
                                    <td>
                                        <div className={styles.employeeCell}>
                                            <div className={styles.avatar}>
                                                {loc.user?.photoURL ? (
                                                    <img src={loc.user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    loc.user?.name?.charAt(0) || 'U'
                                                )}
                                            </div>
                                            <div>
                                                <div className={styles.userName}>{loc.user?.name || 'Unknown'}</div>
                                                <div className={styles.userStatus}>ID: {loc.user_id.slice(0, 6)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles.in}`}>Active</span>
                                    </td>
                                    <td>
                                        {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                                    </td>
                                    <td>{new Date(loc.updated_at).toLocaleTimeString()}</td>
                                    <td>
                                        {loc.attendance?.punch_in ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{new Date(loc.attendance.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {loc.attendance.punch_in_photo && (
                                                    <div style={{ position: 'relative' }}>
                                                        <img
                                                            src={loc.attendance.punch_in_photo}
                                                            className={styles.punchImage}
                                                            alt="In"
                                                            title="Punch In Photo"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        {loc.attendance?.punch_out ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{new Date(loc.attendance.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {loc.attendance.punch_out_photo && (
                                                    <div style={{ position: 'relative' }}>
                                                        <img
                                                            src={loc.attendance.punch_out_photo}
                                                            className={styles.punchImage}
                                                            alt="Out"
                                                            title="Punch Out Photo"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        Within 50m
                                    </td>
                                    <td>
                                        <button className={styles.actionBtn}>View History</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
