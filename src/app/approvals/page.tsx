"use client";
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './approvals.module.css';

const GoogleMap = dynamic(() => import('../../components/GoogleMap'), { ssr: false });

type Approval = {
    id: string;
    user_id: string;
    site_id: string;
    clock_in: string;
    location_in: { lat: number, lng: number };
    photo_in: string;
    approval_status: 'Approved' | 'Pending' | 'Rejected';
    user: { name: string, email: string, department: string };
    site: { name: string, address: string, latitude: number, longitude: number };
};

export default function ApprovalsPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [pending, setPending] = useState<Approval[]>([]);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (profile?.role === 'admin' || profile?.role === 'hr') {
            fetchPending();
        } else {
            router.push('/dashboard');
        }
    }, [user, loading, profile]);

    const fetchPending = async () => {
        const { data, error } = await supabase
            .from('attendance')
            .select('*, user:users(name, email, department), site:sites(id, name, address, latitude, longitude, radius_meters)')
            .eq('approval_status', 'Pending')
            .order('clock_in', { ascending: true });

        if (error) {
            console.error("Error fetching pending approvals:", error);
            toast.error("Failed to load approvals");
        } else {
            setPending(data as any);
        }
    };

    const handleAction = async (id: string, action: 'Approved' | 'Rejected') => {
        setProcessing(id);
        const { error } = await supabase
            .from('attendance')
            .update({
                approval_status: action,
                admin_notes: action === 'Rejected' ? 'Rejected by Admin' : null,
                status: action === 'Rejected' ? 'absent' : 'present' // If rejected, mark as absent? Or keep pending? Let's say absent for now.
            })
            .eq('id', id);

        if (error) {
            toast.error(`Failed to ${action.toLowerCase()}`);
        } else {
            toast.success(`Request ${action}`);
            setPending(prev => prev.filter(p => p.id !== id));
        }
        setProcessing(null);
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div className={styles.container}>Loading...</div>;

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h1 className={styles.title}>Pending Approvals</h1>
                    <div className={styles.badge}>{pending.length} Requests</div>
                </div>

                {pending.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px' }}>check_circle</span>
                        <p>No pending approvals. All caught up!</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {pending.map(item => (
                            <div key={item.id} className={styles.card}>
                                <div className={styles.header}>
                                    <div className={styles.user}>
                                        <div className={styles.avatar}>{item.user?.name?.charAt(0)}</div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{item.user?.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.user?.department}</div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatDate(item.clock_in)}</span>
                                </div>

                                <div className={styles.meta}>
                                    <div className={styles.metaRow}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ec4899' }}>location_on</span>
                                        Checked In At: <strong>{item.site?.name || 'Unknown Location'}</strong>
                                    </div>
                                    {item.site?.address && (
                                        <div style={{ paddingLeft: '26px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                            {item.site.address}
                                        </div>
                                    )}
                                    <div className={styles.metaRow} style={{ marginTop: '8px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f59e0b' }}>warning</span>
                                        Reason: Incorrect Site Check-In
                                    </div>
                                </div>

                                <div style={{ height: '120px', margin: '16px 0', borderRadius: '8px', overflow: 'hidden' }}>
                                    {item.location_in ? (
                                        <GoogleMap
                                            center={{ lat: item.location_in.lat, lng: item.location_in.lng }}
                                            zoom={14}
                                            markers={[{ id: '1', lat: item.location_in.lat, lng: item.location_in.lng, title: 'Check-In' }]}
                                            sites={item.site ? [(item.site as any)] : []}
                                            interactive={true}
                                        />
                                    ) : (
                                        <div style={{ background: '#f8fafc', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>No Location Data</div>
                                    )}
                                </div>

                                <div className={styles.actions}>
                                    <button
                                        className={`${styles.btn} ${styles.btnReject}`}
                                        onClick={() => handleAction(item.id, 'Rejected')}
                                        disabled={processing === item.id}
                                    >
                                        Reject
                                    </button>
                                    <button
                                        className={`${styles.btn} ${styles.btnApprove}`}
                                        onClick={() => handleAction(item.id, 'Approved')}
                                        disabled={processing === item.id}
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
