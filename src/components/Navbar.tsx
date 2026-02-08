
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import styles from './Navbar.module.css';

import { usePathname } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

import { Skeleton } from './Skeleton';

export const Navbar = () => {
    const { logout, profile, user, loading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const [isHrDrpOpen, setIsHrDrpOpen] = useState(false);



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
        <nav className={`${styles.sidebarNav} sidebar-nav`}>
            {/* Logo Section */}
            <div className={styles.logoSection}>
                <Image
                    src="/myaccount.svg"
                    alt="Attendance Pro"
                    width={180}
                    height={40}
                    priority
                    className={styles.logoImage}
                />
            </div>

            {/* Navigation Links - Scrollable Area */}
            <div className={styles.scrollArea}>
                {loading ? (
                    <div className={styles.loadingContainer}>
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
                                <Link href="/dashboard" className={`${styles.navLink} ${pathname === '/dashboard' ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>home</span>
                                    Home
                                </Link>

                                <Link href="/calendar" className={`${styles.navLink} ${pathname.startsWith('/calendar') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_month</span>
                                    Calendar
                                </Link>
                                <Link href="/regularization" className={`${styles.navLink} ${pathname.startsWith('/regularization') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>update</span>
                                    Regularize
                                </Link>
                                <Link href="/leave-requests" className={`${styles.navLink} ${pathname.startsWith('/leave-requests') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>event_available</span>
                                    Leave Requests
                                </Link>
                                <Link href="/documents" className={`${styles.navLink} ${pathname.startsWith('/documents') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder</span>
                                    Documents
                                </Link>
                                <Link href="/sites" className={`${styles.navLink} ${pathname.startsWith('/sites') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>location_on</span>
                                    My Sites
                                </Link>
                                <Link href="/company" className={`${styles.navLink} ${pathname.startsWith('/company') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>business</span>
                                    Company
                                </Link>
                            </>
                        )}

                        {/* Management & HR Menu */}
                        {isManagement && (
                            <>
                                {/* Management Section Spacer */}
                                <div className={styles.spacer}></div>

                                <Link href="/dashboard" className={`${styles.navLink} ${pathname === '/dashboard' ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>home</span>
                                    Home
                                </Link>

                                <Link href="/team" className={`${styles.navLink} ${pathname.startsWith('/team') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span>
                                    Team
                                </Link>
                                <Link href="/stats" className={`${styles.navLink} ${pathname.startsWith('/stats') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bar_chart</span>
                                    Stats
                                </Link>
                                <Link href="/notices" className={`${styles.navLink} ${pathname.startsWith('/notices') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>campaign</span>
                                    Notices
                                </Link>
                                <Link href="/sites" className={`${styles.navLink} ${pathname.startsWith('/sites') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>map</span>
                                    Sites
                                </Link>

                                <Link href="/location-tracking" className={`${styles.navLink} ${pathname.startsWith('/location-tracking') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>location_searching</span>
                                    Employee Tracking
                                </Link>

                                <Link href="/employee-docs" className={`${styles.navLink} ${pathname.startsWith('/employee-docs') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder_shared</span>
                                    Employee Docs
                                </Link>

                                <Link href="/companies" className={`${styles.navLink} ${pathname.startsWith('/companies') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>domain</span>
                                    Manage Companies
                                </Link>

                                {/* HR Dropdown - Converted to Expandable List */}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <button
                                        onClick={() => setIsHrDrpOpen(!isHrDrpOpen)}
                                        className={`${styles.navLink} ${styles.dropdownButton} ${isHrDrpOpen ? styles.navLinkActive : styles.navLinkInactive}`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>badge</span>
                                            HR Management
                                        </div>
                                        <span className={`material-symbols-outlined ${styles.dropdownArrow}`} style={{
                                            transform: isHrDrpOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                                        }}>keyboard_arrow_down</span>
                                    </button>

                                    {/* Expandable Content */}
                                    {isHrDrpOpen && (
                                        <div className={styles.dropdownContent}>
                                            <Link href="/recruitment" className={`${styles.navLink} ${pathname.startsWith('/recruitment') ? styles.navLinkActive : styles.navLinkInactive}`}>Hiring</Link>
                                            <Link href="/payroll" className={`${styles.navLink} ${pathname.startsWith('/payroll') ? styles.navLinkActive : styles.navLinkInactive}`}>Payroll</Link>
                                            <Link href="/tasks" className={`${styles.navLink} ${pathname.startsWith('/tasks') ? styles.navLinkActive : styles.navLinkInactive}`}>Tasks</Link>
                                            <Link href="/leave-policy" className={`${styles.navLink} ${pathname.startsWith('/leave-policy') ? styles.navLinkActive : styles.navLinkInactive}`}>Leaves</Link>
                                        </div>
                                    )}
                                </div>

                                <Link href="/performance" className={`${styles.navLink} ${pathname.startsWith('/performance') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>psychology</span>
                                    Performance
                                </Link>
                                <Link href="/rewards" className={`${styles.navLink} ${pathname.startsWith('/rewards') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>emoji_events</span>
                                    Rewards
                                </Link>
                            </>
                        )}

                        {/* Admin Menu */}
                        {profile?.role === 'admin' && (
                            <>
                                {/* System Section Spacer */}
                                <div className={styles.spacer}></div>

                                <Link href="/org-structure" className={`${styles.navLink} ${pathname.startsWith('/org-structure') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_tree</span>
                                    Organization
                                </Link>
                                <Link href="/audit-logs" className={`${styles.navLink} ${pathname.startsWith('/audit-logs') ? styles.navLinkActive : styles.navLinkInactive}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
                                    Audit Logs
                                </Link>
                            </>
                        )}



                        <Link href="/help" className={`${styles.navLink} ${pathname.startsWith('/help') ? styles.navLinkActive : styles.navLinkInactive}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>help</span>
                            Help & Support
                        </Link>

                        <Link href="/chat" className={`${styles.navLink} ${pathname.startsWith('/chat') ? styles.navLinkActive : styles.navLinkInactive}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat</span>
                            Messages
                        </Link>
                        <Link href="/settings" className={`${styles.navLink} ${pathname.startsWith('/settings') ? styles.navLinkActive : styles.navLinkInactive}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
                            Settings
                        </Link>
                        <button onClick={toggleTheme} className={`${styles.navLink} ${styles.navLinkInactive}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                {theme === 'light' ? 'light_mode' : 'moon_stars'}
                            </span>
                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </button>
                    </>
                )}
            </div>

            {/* Bottom Actions - NOW JUST PROFILE */}
            <div className={styles.bottomActions}>
                {/* User Profile / Logout */}
                <div className={styles.userProfile}>
                    <div className={styles.avatar}>
                        {profile?.name?.charAt(0) || 'U'}
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>
                            {profile?.name || 'User'}
                        </div>
                        <div className={styles.userRole}>
                            {profile?.role || 'Employee'}
                        </div>
                    </div>
                    <button onClick={logout} className={styles.logoutButton}>
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </div>
        </nav>
    )
}


