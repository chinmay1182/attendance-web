
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import styles from './dashboard.module.css';

import { usePathname } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

export const Navbar = () => {
    const { logout, profile } = useAuth();
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
                {/* Employee Tabs (Visible to Non-Management Users) */}
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
                        {/* Operational */}
                        <Link href="/team" style={getLinkStyle('/team')}>Team</Link>
                        <Link href="/stats" style={getLinkStyle('/stats')}>Stats</Link>
                        <Link href="/notices" style={getLinkStyle('/notices')}>Notices</Link>
                        <Link href="/shifts" style={getLinkStyle('/shifts')}>Shifts</Link>

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

                            {/* Dropdown Menu */}
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

                {/* Expenses: Visible to Employee & HR, Hidden for Admin */}
                {profile?.role !== 'admin' && (
                    <Link href="/expenses" style={getLinkStyle('/expenses')}>Expenses</Link>
                )}

                <div style={{ width: 1, height: 24, background: 'var(--glass-border)', margin: '0 8px' }}></div>

                {/* Icons Section */}
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
                    <span className="material-symbols-outlined">
                        notification_multiple
                    </span>
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
