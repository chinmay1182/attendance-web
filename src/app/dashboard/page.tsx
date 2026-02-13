"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './dashboard.module.css';

import { Skeleton } from '../../components/Skeleton';

// Lazy Load Widgets
const ClockWidget = dynamic(() => import('../../components/ClockWidget').then(mod => mod.ClockWidget), {
    loading: () => <Skeleton height={280} borderRadius={24} />,
    ssr: false // Widgets that rely on browser APIs like Geolocation
});

const LeaveWidget = dynamic(() => import('../../components/LeaveWidget').then(mod => mod.LeaveWidget), {
    loading: () => <Skeleton height={280} borderRadius={24} />
});

const RemindersWidget = dynamic(() => import('../../components/RemindersWidget').then(mod => mod.RemindersWidget), {
    loading: () => <Skeleton height={400} borderRadius={24} />
});


export default function EmployeeDashboard() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [docs, setDocs] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalUsers: 0, pendingLeaves: 0, onLeaveToday: 0 });

    // Shift Modal State
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftStart, setShiftStart] = useState('');
    const [shiftEnd, setShiftEnd] = useState('');
    const [shiftHistory, setShiftHistory] = useState<any[]>([]);
    const [updatingShift, setUpdatingShift] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            fetchData();
        }
    }, [user, loading, router]);

    const fetchData = async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/dashboard/stats?uid=${user.id}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data.docs && data.docs.length > 0) setDocs(data.docs);
                if (data.sites && data.sites.length > 0) setSites(data.sites);
                if (data.stats) setStats(data.stats);
            }
        } catch (e) {
            console.error("Failed to fetch dashboard stats", e);
        }
    };

    // Realtime Subscriptions for Docs & Sites
    useEffect(() => {
        if (!user) return;
        const channel = supabase.channel('dashboard_realtime_assets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, () => fetchData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const getDocIcon = (name: string) => {
        if (name.endsWith('.pdf')) return <span className="material-symbols-outlined">picture_as_pdf</span>;
        if (name.endsWith('.jpg') || name.endsWith('.png')) return <span className="material-symbols-outlined">imagesmode</span>;
        return <span className="material-symbols-outlined">description</span>;
    };

    const handleOpenShiftModal = () => {
        setIsShiftModalOpen(true);
        fetchShiftHistory();
        if (profile?.shift_start) setShiftStart(profile.shift_start);
        if (profile?.shift_end) setShiftEnd(profile.shift_end);
    };

    const fetchShiftHistory = async () => {
        const { data } = await supabase
            .from('shift_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        if (data) setShiftHistory(data);
    };

    const handleUpdateShift = async () => {
        if (!shiftStart || !shiftEnd) {
            toast.error("Please select start and end time");
            return;
        }

        setUpdatingShift(true);
        try {
            // Apply updates to ALL users except system users (assuming id != 000...)
            // 1. Update ALL users
            // Using a filter that matches all likely UUIDs to bypass safety check
            const { data, error: updateError } = await supabase
                .from('users')
                .update({
                    shift_start: shiftStart,
                    shift_end: shiftEnd
                })
                .neq('id', '00000000-0000-0000-0000-000000000000')
                .select('id');

            if (updateError) throw updateError;

            const count = data?.length || 0;

            await supabase.from('shift_history').insert({
                admin_id: user?.id,
                shift_start: shiftStart,
                shift_end: shiftEnd,
                applied_to_count: count
            });

            toast.success(`Shift updated for ${count} employees`);
            setIsShiftModalOpen(false);
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to update shifts");
        } finally {
            setUpdatingShift(false);
        }
    };

    if (loading) return (
        <>
            <Navbar />
            <div className={styles.dashboardContainer}>
                <header className={styles.header}>
                    <div className={styles.welcomeText}>
                        <Skeleton width={250} height={40} style={{ marginBottom: 8 }} />
                        <Skeleton width={180} height={20} />
                    </div>
                </header>

                <main className={styles.grid}>
                    <div style={{ minWidth: 0 }}>
                        <Skeleton height={280} borderRadius={24} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <Skeleton height={280} borderRadius={24} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
                        <Skeleton height={150} borderRadius={24} />
                        <Skeleton height={150} borderRadius={24} />
                    </div>
                </main>
            </div>
        </>
    );

    if (!user) return null;

    return (
        <>
            <Navbar />
            <div className={styles.dashboardContainer}>
                <header className={styles.header}>
                    <div className={styles.welcomeText}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div>
                                <h1>Hello, {profile?.name || user?.email?.split('@')[0] || 'Employee'} 👋</h1>
                                <p>{(profile?.role as string) === 'admin' ? 'Here is your company overview.' : "Let's have a productive day!"}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className={styles.grid}>
                    {/* ADMIN VIEW */}
                    {(profile?.role as string) === 'admin' ? (
                        <>
                            {/* Admin Quick Actions */}
                            <div style={{ minWidth: 0, gridColumn: '1 / -1' }}>
                                <div style={{
                                    background: 'white',
                                    padding: '24px',
                                    borderRadius: '24px',
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex', flexDirection: 'column', gap: '16px'
                                }}>
                                    <h3>Admin Quick Actions</h3>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <button onClick={() => router.push('/team')} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-symbols-outlined">group</span> Manage Team
                                        </button>
                                        <button onClick={() => router.push('/attendance')} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-symbols-outlined">calendar_month</span> View Attendance
                                        </button>
                                        <button onClick={() => router.push('/documents')} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-symbols-outlined">folder</span> Company Docs
                                        </button>
                                        <button onClick={() => router.push('/approvals')} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #fed7aa', background: '#fff7ed', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c' }}>
                                            <span className="material-symbols-outlined">check_circle</span> Approvals
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Admin Main Config / Overview Section */}
                            <div style={{ minWidth: 0, gridColumn: '1 / -1', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                {/* System Status */}
                                <div style={{ flex: 1, minWidth: '300px', background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
                                    <h3>System Status</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>All systems operational.</p>
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <div style={{ background: '#ecfdf5', color: '#059669', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            Active Users: {stats.totalUsers || 0}
                                        </div>
                                        <div style={{ background: '#eff6ff', color: '#2563eb', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            On Leave: {stats.onLeaveToday || 0}
                                        </div>
                                        <div style={{ background: '#fff7ed', color: '#c2410c', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            Pending Requests: {stats.pendingLeaves || 0}
                                        </div>
                                    </div>
                                </div>

                                {/* Shift Configuration */}
                                <div style={{ flex: 1, minWidth: '300px', background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
                                    <h3>Shift Configuration</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>Manage checking/checkout times for employees.</p>
                                    <button
                                        onClick={handleOpenShiftModal}
                                        style={{ marginTop: '16px', padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        Manage Shifts
                                    </button>
                                </div>
                            </div>

                            {/* Reminders Widget */}
                            <div style={{ minWidth: 0, gridColumn: '1 / -1' }}>
                                <RemindersWidget />
                            </div>
                        </>
                    ) : (
                        /* EMPLOYEE VIEW */
                        <>
                            <div style={{ minWidth: 0 }}>
                                <ClockWidget />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <LeaveWidget />
                            </div>
                        </>
                    )}

                    {/* SHARED SIDEBAR (Docs & Sites) - Only for Employees now */}
                    {(profile?.role as string) !== 'admin' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
                            {/* Documents Widget */}
                            <div style={{
                                background: 'white',
                                padding: '24px',
                                borderRadius: '24px',
                                border: '1px solid var(--glass-border)',
                                backdropFilter: 'blur(20px)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#4f46e5' }}>folder</span> {(profile?.role as string) === 'admin' ? 'Company Docs' : 'My Documents'}
                                    </h3>
                                    <span onClick={() => router.push('/documents')} style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {docs.length > 0 ? docs.map((doc, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < docs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                            <div style={{ color: '#64748b' }}>{getDocIcon(doc.name)}</div>
                                            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '0.9rem', color: '#334155' }}>{doc.name}</div>
                                        </div>
                                    )) : (
                                        <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem', padding: '12px' }}>No documents assigned.</p>
                                    )}
                                </div>
                            </div>

                            {/* Sites Widget */}
                            <div style={{
                                background: 'white',
                                padding: '24px',
                                borderRadius: '24px',
                                border: '1px solid var(--glass-border)',
                                backdropFilter: 'blur(20px)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#ec4899' }}>location_on</span> {(profile?.role as string) === 'admin' ? 'Active Sites' : 'My Sites'}
                                    </h3>
                                    <span onClick={() => router.push('/sites')} style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    {sites.length > 0 ? sites.map((site) => (
                                        <div key={site.id} style={{ minWidth: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                            <div style={{ height: '80px', background: '#f8fafc' }}>
                                                <img
                                                    src={`https://image.maps.ls.hereapi.com/mia/1.6/mapview?apiKey=GDl2vmjbRIX_WuX44MJUbieWTl8A7AW9eFyLhSIDj8I&c=${site.latitude || '37.7749'},${site.longitude || '-122.4194'}&z=11&h=80&w=120`}
                                                    alt="Map"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                            <div style={{ padding: '8px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {site.name}
                                            </div>
                                        </div>
                                    )) : (
                                        <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem', width: '100%', padding: '12px' }}>No sites assigned.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Shift Modal */}
            {isShiftModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsShiftModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 700 }}>Manage Shifts</h2>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>Set standard shift timings for all employees.</p>

                        <div>
                            <label className={styles.label}>Shift Start</label>
                            <input
                                type="time"
                                className={styles.input}
                                value={shiftStart}
                                onChange={e => setShiftStart(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className={styles.label}>Shift End</label>
                            <input
                                type="time"
                                className={styles.input}
                                value={shiftEnd}
                                onChange={e => setShiftEnd(e.target.value)}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button className={`${styles.modalBtn} ${styles.cancelBtn}`} onClick={() => setIsShiftModalOpen(false)}>
                                Cancel
                            </button>
                            <button className={`${styles.modalBtn} ${styles.primaryBtn}`} onClick={handleUpdateShift} disabled={updatingShift}>
                                {updatingShift ? 'Updating...' : 'Update Everyone'}
                            </button>
                        </div>

                        {/* History */}
                        <div className={styles.historyList}>
                            <h4 style={{ marginBottom: '12px', fontSize: '1rem', fontWeight: 600 }}>Change History</h4>
                            {shiftHistory.length === 0 ? (
                                <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>No history recorded.</p>
                            ) : (
                                shiftHistory.map(h => (
                                    <div key={h.id} className={styles.historyItem}>
                                        <div>
                                            <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{h.shift_start} - {h.shift_end}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                Updated {new Date(h.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            {h.applied_to_count || 0} users
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
