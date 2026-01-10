
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
        const isActive = pathname === path || (path !== '/dashboard' && pathname.startsWith(path));
        return {
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: isActive ? 600 : 500,
            textDecoration: 'none',
            padding: '12px 16px',
            borderRadius: '12px',
            background: isActive ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            fontSize: '0.95rem',
            marginBottom: '2px'
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
                if (newNotice.audience === 'user' && newNotice.target_id === user.id) relevant = true;

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
                if (!isManagement && payload.eventType === 'UPDATE' && record.user_id === user.id) {
                    import('react-hot-toast').then(({ default: toast }) => {
                        toast(`YOUR Leave Request was ${record.status.toUpperCase()}`, {
                            icon: record.status === 'approved' ? '✅' : '❌'
                        });
                    });
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
                const task = payload.new as any;
                if (task.user_id === user.id) {
                    import('react-hot-toast').then(({ default: toast }) => {
                        toast('📌 New Task Assigned/Logged: ' + task.title);
                    });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, profile, isManagement]);

    return (
        <nav className="sidebar-nav" style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            transition: 'all 0.3s ease'
        }}>
            {/* Logo Section */}
            <div style={{ paddingBottom: '24px', width: '100%' }}>
                <Image src="/myaccount.svg" alt="Attendance Pro" width={180} height={40} priority style={{ objectFit: 'contain', alignSelf: 'flex-start' }} />
            </div>

            {/* Navigation Links - Scrollable Area */}
            <div style={{
                flex: 1,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                overflowY: 'auto',
                paddingRight: '8px' // Space for scrollbar
            }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Skeleton width="100%" height={48} borderRadius={12} />
                        <Skeleton width="100%" height={48} borderRadius={12} />
                        <Skeleton width="100%" height={48} borderRadius={12} />
                        <Skeleton width="100%" height={48} borderRadius={12} />
                    </div>
                ) : (
                    <>
                        {/* Employee Menu */}
                        {!isManagement && (
                            <>
                                <Link href="/dashboard" style={getLinkStyle('/dashboard')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
                                    Dashboard
                                </Link>
                                <Link href="/calendar" style={getLinkStyle('/calendar')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_month</span>
                                    Calendar
                                </Link>
                                <Link href="/regularization" style={getLinkStyle('/regularization')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>update</span>
                                    Regularize
                                </Link>
                                <Link href="/documents" style={getLinkStyle('/documents')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder</span>
                                    Documents
                                </Link>
                                <Link href="/sites" style={getLinkStyle('/sites')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>location_on</span>
                                    My Sites
                                </Link>
                                <Link href="/company" style={getLinkStyle('/company')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>business</span>
                                    Company
                                </Link>
                            </>
                        )}

                        {/* Management & HR Menu */}
                        {isManagement && (
                            <>
                                <div style={{
                                    textTransform: 'uppercase',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    marginTop: '16px',
                                    marginBottom: '8px',
                                    letterSpacing: '0.05em'
                                }}>
                                    Management
                                </div>
                                <Link href="/team" style={getLinkStyle('/team')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span>
                                    Team
                                </Link>
                                <Link href="/stats" style={getLinkStyle('/stats')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bar_chart</span>
                                    Stats
                                </Link>
                                <Link href="/notices" style={getLinkStyle('/notices')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>campaign</span>
                                    Notices
                                </Link>
                                <Link href="/sites" style={getLinkStyle('/sites')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>map</span>
                                    Sites
                                </Link>

                                {/* HR Dropdown - Converted to Expandable List */}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <button
                                        onClick={() => setIsHrDrpOpen(!isHrDrpOpen)}
                                        style={{
                                            ...getLinkStyle('hr-group'),
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            background: 'transparent',
                                            border: 'none',
                                            width: '100%',
                                            display: 'flex',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>badge</span>
                                            HR Management
                                        </div>
                                        <span className="material-symbols-outlined" style={{
                                            transform: isHrDrpOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s'
                                        }}>keyboard_arrow_down</span>
                                    </button>

                                    {/* Expandable Content */}
                                    {isHrDrpOpen && (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            paddingLeft: '16px',
                                            borderLeft: '2px solid var(--glass-border)',
                                            marginLeft: '12px',
                                            marginTop: '4px'
                                        }}>
                                            <Link href="/recruitment" style={getLinkStyle('/recruitment')}>Hiring</Link>
                                            <Link href="/payroll" style={getLinkStyle('/payroll')}>Payroll</Link>
                                            <Link href="/tasks" style={getLinkStyle('/tasks')}>Tasks</Link>
                                            <Link href="/leave-policy" style={getLinkStyle('/leave-policy')}>Leaves</Link>
                                        </div>
                                    )}
                                </div>

                                <Link href="/performance" style={getLinkStyle('/performance')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>psychology</span>
                                    Performance
                                </Link>
                                <Link href="/rewards" style={getLinkStyle('/rewards')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>emoji_events</span>
                                    Rewards
                                </Link>
                            </>
                        )}

                        {/* Admin Menu */}
                        {profile?.role === 'admin' && (
                            <>
                                <div style={{
                                    textTransform: 'uppercase',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    marginTop: '16px',
                                    marginBottom: '8px',
                                    letterSpacing: '0.05em'
                                }}>
                                    System
                                </div>
                                <Link href="/org-structure" style={getLinkStyle('/org-structure')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_tree</span>
                                    Organization
                                </Link>
                                <Link href="/audit-logs" style={getLinkStyle('/audit-logs')}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
                                    Audit Logs
                                </Link>
                            </>
                        )}

                        <div style={{ height: '1px', background: 'var(--glass-border)', margin: '16px 0' }}></div>

                        <Link href="/help" style={getLinkStyle('/help')}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>help</span>
                            Help & Support
                        </Link>
                    </>
                )}
            </div>

            {/* Bottom Actions */}
            <div style={{
                marginTop: 'auto',
                paddingTop: '20px',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%'
            }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                    <Link href="/chat" style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.5)',
                        borderRadius: '12px',
                        color: 'var(--text-main)'
                    }}>
                        <span className="material-symbols-outlined">chat</span>
                    </Link>
                    <Link href="/settings" style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.5)',
                        borderRadius: '12px',
                        color: 'var(--text-main)'
                    }}>
                        <span className="material-symbols-outlined">settings</span>
                    </Link>
                    <button onClick={toggleTheme} style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.5)',
                        borderRadius: '12px',
                        color: 'var(--text-main)',
                        border: 'none',
                        cursor: 'pointer'
                    }}>
                        <span className="material-symbols-outlined">
                            {theme === 'light' ? 'light_mode' : 'moon_stars'}
                        </span>
                    </button>
                </div>

                {/* User Profile / Logout */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.5)',
                    borderRadius: '16px',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700
                    }}>
                        {profile?.name?.charAt(0) || 'U'}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {profile?.name || 'User'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {profile?.role || 'Employee'}
                        </div>
                    </div>
                    <button onClick={logout} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </div>
        </nav>
    )
}


