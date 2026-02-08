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
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
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

            // Subscribe to realtime attendance updates (for clock-in/out)
            const attendanceChannel = supabase.channel('attendance_tracking_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
                    console.log('Attendance update received:', payload);
                    fetchLocations(); // Refetch to update punch times and photos
                })
                .subscribe();

            return () => {
                supabase.removeChannel(attendanceChannel);
            };
        }
    }, [profile]);

    const fetchLocations = async () => {
        try {
            // Fetch today's attendance with user details
            const today = new Date().toISOString().split('T')[0];
            const { data: attendanceData, error } = await supabase
                .from('attendance')
                .select(`
                    *,
                    user:users(name, photo_url, email)
                `)
                .eq('date', today)
                .order('clock_in', { ascending: false });

            if (error) {
                console.error('Error fetching attendance:', error);
                return;
            }

            if (attendanceData) {
                // Map attendance data to UserLocation format
                const formattedData = attendanceData.map((att: any) => ({
                    user_id: att.user_id,
                    latitude: att.location_in?.lat || 0,
                    longitude: att.location_in?.lng || 0,
                    updated_at: att.clock_out || att.clock_in,
                    user: {
                        name: att.user?.name,
                        photoURL: att.user?.photo_url
                    },
                    attendance: {
                        punch_in: att.clock_in,
                        punch_out: att.clock_out,
                        punch_in_photo: att.photo_in,
                        punch_out_photo: att.photo_out
                    }
                }));

                console.log('Formatted locations:', formattedData);
                setLocations(formattedData);
            }
        } catch (err) {
            console.error('fetchLocations error:', err);
        }
    };

    const getPhotoUrl = (path: string | null): string | null => {
        if (!path) return null;

        const { data } = supabase.storage
            .from('attendance-photos')
            .getPublicUrl(path);

        return data.publicUrl;
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
                        markers={locations
                            .filter(loc => loc.latitude !== 0 && loc.longitude !== 0)
                            .map(loc => ({
                                id: loc.user_id,
                                lat: loc.latitude,
                                lng: loc.longitude,
                                title: loc.user?.name || 'Unknown User',
                                isSelected: loc.user_id === selectedEmployee
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
                                <tr
                                    key={loc.user_id}
                                    onClick={() => setSelectedEmployee(loc.user_id)}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: selectedEmployee === loc.user_id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                                    }}
                                >
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
                                        {loc.attendance?.punch_out ? (
                                            <span className={`${styles.statusBadge} ${styles.out}`}>Clocked Out</span>
                                        ) : (
                                            <span className={`${styles.statusBadge} ${styles.in}`}>Clocked In</span>
                                        )}
                                    </td>
                                    <td>
                                        {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                                    </td>
                                    <td>{new Date(loc.updated_at).toLocaleTimeString()}</td>
                                    <td>
                                        {loc.attendance?.punch_in ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{new Date(loc.attendance.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {loc.attendance.punch_in_photo && getPhotoUrl(loc.attendance.punch_in_photo) && (
                                                    <div style={{ position: 'relative' }}>
                                                        <img
                                                            src={getPhotoUrl(loc.attendance.punch_in_photo) || ''}
                                                            className={styles.punchImage}
                                                            alt="In"
                                                            title="Punch In Photo"
                                                            crossOrigin="anonymous"
                                                            referrerPolicy="no-referrer"
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
                                                {loc.attendance.punch_out_photo && getPhotoUrl(loc.attendance.punch_out_photo) && (
                                                    <div style={{ position: 'relative' }}>
                                                        <img
                                                            src={getPhotoUrl(loc.attendance.punch_out_photo) || ''}
                                                            className={styles.punchImage}
                                                            alt="Out"
                                                            title="Punch Out Photo"
                                                            crossOrigin="anonymous"
                                                            referrerPolicy="no-referrer"
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
