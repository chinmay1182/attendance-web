
"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LeaveWidget.module.css';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { leaveService, LeaveRequest } from '../lib/leaveService';

export const LeaveWidget = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

    useEffect(() => {
        if (user) {
            loadLeaves();
        }
    }, [user]);

    const loadLeaves = async () => {
        if (!user) return;
        try {
            const data = await leaveService.getMyLeaves(user.id);
            setLeaves(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    // Real-time subscription for leave updates
    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('leave_widget_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'leave_requests', filter: `user_id=eq.${user.id}` },
                () => loadLeaves()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.title}>My Leaves</div>
                <span
                    onClick={() => router.push('/leave-requests')}
                    style={{
                        fontSize: '0.8rem',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    View All
                </span>
            </div>

            <div className={styles.list}>
                {leaves.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No leave history.</p>
                        <button
                            onClick={() => router.push('/leave-requests')}
                            style={{
                                padding: '8px 16px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 600
                            }}
                        >
                            Apply for Leave
                        </button>
                    </div>
                ) : (
                    leaves.slice(0, 5).map(leave => (
                        <div key={leave.id} className={`${styles.item} ${leave.status === 'pending' ? styles.itemPending :
                            leave.status === 'approved' ? styles.itemApproved :
                                styles.itemRejected
                            }`}>
                            <div>
                                <div className={styles.type}>{leave.type} Leave</div>
                                <div className={styles.date}>{leave.start_date}</div>
                            </div>
                            <span className={styles.badge} style={{
                                color: leave.status === 'pending' ? '#eab308' :
                                    leave.status === 'approved' ? '#22c55e' : '#ef4444'
                            }}>
                                {leave.status}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
