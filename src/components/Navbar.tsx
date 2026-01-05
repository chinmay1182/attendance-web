
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import styles from './dashboard.module.css';

import { usePathname } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

import { Skeleton } from './Skeleton';

export const Navbar = () => {
    const { logout, profile, user, loading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [isHrDrpOpen, setIsHrDrpOpen] = useState(false);

    const getLinkStyle = (path: string) => {
        const isActive = pathname === path;
        return {
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            background: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
        } as React.CSSProperties;
    };

    const isManagement = profile?.role === 'admin' || profile?.role === 'hr';

    // Realtime Notifications System
    React.useEffect(() => {
        // ... (Keep existing effect logic - assuming it works, or if I need to re-write it I would need the full content.
        // Since I'm using replace_file_content with a large range, I MUST include the effect body if I overwrite it.
        // For safety, I will replicate the effect logic from the previous view_file.)
        if (!user || !profile) return;

        const channel = supabase.channel('global_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notices' }, (payload: any) => {
                const newNotice = payload.new as any;
                let relevant = newNotice.audience === 'all';
                if (newNotice.audience === 'role' && newNotice.target_id === profile.role) relevant = true;
                if (newNotice.audience === 'user' && newNotice.target_id === user.uid) relevant = true;

                if (relevant) {
                    import('react-hot-toast').then(({ default: toast }) => {
                        toast('📢 New Notice: ' + newNotice.title, { duration: 5000 });
                    });
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, (payload: any) => {
                const record = payload.new as any;
                if (isManagement && payload.eventType === 'INSERT') {
                    import('react-hot-toast').then(({ default: toast }) => {
                        toast('📝 New Leave Request Submitted', { icon: 'exclamation' });
                    });
                }
                if (!isManagement && payload.eventType === 'UPDATE' && record.user_id === user.uid) {
                    import('react-hot-toast').then(({ default: toast }) => {
                        toast(`YOUR Leave Request was ${record.status.toUpperCase()}`, {
                            icon: record.status === 'approved' ? '✅' : '❌'
                        });
                    });
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
                const task = payload.new as any;
                if (task.user_id === user.uid) {
                    import('react-hot-toast').then(({ default: toast }) => {
                        toast('📌 New Task Assigned/Logged: ' + task.title);
                    });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, profile, isManagement]);

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 40px',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--glass-border)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            width: '100%'
        }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Image src="/myaccount.svg" alt="Attendance Pro" width={180} height={30} priority style={{ objectFit: 'contain' }} />
            </div>

            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {loading ? (
                    /* Shimmer Loading State for Tabs */
                    <div style={{ display: 'flex', gap: '12px', marginRight: '24px' }}>
                        <Skeleton width={80} height={36} borderRadius={8} />
                        <Skeleton width={80} height={36} borderRadius={8} />
                        <Skeleton width={80} height={36} borderRadius={8} />
                        <Skeleton width={80} height={36} borderRadius={8} />
                        <Skeleton width={80} height={36} borderRadius={8} />
                    </div>
                ) : (
                    /* Actual Nav Links */
                    <>
                        {/* Employee Tabs */}
                        {!isManagement && (
                            <>
                                <Link href="/dashboard" style={getLinkStyle('/dashboard')}>Home</Link>
                                <Link href="/calendar" style={getLinkStyle('/calendar')}>Calendar</Link>
                                <Link href="/regularization" style={getLinkStyle('/regularization')}>Regularize</Link>
                                <Link href="/documents" style={getLinkStyle('/documents')}>My Documents</Link>
                                <Link href="/sites" style={getLinkStyle('/sites')}>My Sites</Link>
                                <Link href="/company" style={getLinkStyle('/company')}>Company</Link>
                            </>
                        )}

                        {/* Management & HR Tabs */}
                        {isManagement && (
                            <>
                                <Link href="/team" style={getLinkStyle('/team')}>Team</Link>
                                <Link href="/stats" style={getLinkStyle('/stats')}>Stats</Link>
                                <Link href="/notices" style={getLinkStyle('/notices')}>Notices</Link>
                                <Link href="/sites" style={getLinkStyle('/sites')}>Sites</Link>

                                {/* HR Management Dropdown */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setIsHrDrpOpen(!isHrDrpOpen)}
                                        style={{
                                            color: 'var(--text-muted)',
                                            fontWeight: 600,
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '1rem',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        HR Management
                                        <span className="material-symbols-outlined">keyboard_arrow_down</span>
                                    </button>

                                    {isHrDrpOpen && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '120%',
                                            left: 0,
                                            background: 'var(--bg-card)',
                                            backdropFilter: 'blur(12px)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '12px',
                                            padding: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            minWidth: '180px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                            zIndex: 1000
                                        }}>
                                            <Link href="/recruitment" style={getLinkStyle('/recruitment')}>Hiring</Link>
                                            <Link href="/payroll" style={getLinkStyle('/payroll')}>Payroll</Link>
                                            <Link href="/tasks" style={getLinkStyle('/tasks')}>Tasks</Link>
                                            <Link href="/leave-policy" style={getLinkStyle('/leave-policy')}>Leaves</Link>
                                        </div>
                                    )}
                                </div>

                                <Link href="/performance" style={getLinkStyle('/performance')}>Performance</Link>
                                <Link href="/rewards" style={getLinkStyle('/rewards')}>Rewards</Link>
                                <Link href="/help" style={getLinkStyle('/help')}>Help</Link>
                            </>
                        )}

                        {/* System Admin */}
                        {profile?.role === 'admin' && (
                            <>
                                <Link href="/org-structure" style={getLinkStyle('/org-structure')}>Org</Link>
                                <Link href="/audit-logs" style={getLinkStyle('/audit-logs')}>Logs</Link>
                            </>
                        )}

                        {/* Expenses */}
                        {profile?.role !== 'admin' && (
                            <Link href="/expenses" style={getLinkStyle('/expenses')}>Expenses</Link>
                        )}
                    </>
                )}

                <div style={{ width: 1, height: 24, background: 'var(--glass-border)', margin: '0 8px' }}></div>

                {/* Icons Section - Always Visible */}
                <Link href="/chat" style={{ color: 'var(--text-muted)', padding: '8px', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined">chat</span>
                </Link>

                <Link href="/settings" style={{ color: 'var(--text-muted)', padding: '8px', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined">build</span>
                </Link>

                <button
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <span className="material-symbols-outlined">notification_multiple</span>
                </button>

                <button
                    onClick={toggleTheme}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <span className="material-symbols-outlined">
                        {theme === 'light' ? 'light_mode' : 'moon_stars'}
                    </span>
                </button>

                <button
                    onClick={logout}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: '8px 12px',
                        fontSize: '0.9rem'
                    }}
                >
                    Logout
                </button>
            </div>
        </nav>
    )
}
