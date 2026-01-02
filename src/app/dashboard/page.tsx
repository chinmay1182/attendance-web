
"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ClockWidget } from '../../components/ClockWidget';
import { LeaveWidget } from '../../components/LeaveWidget';
import { Navbar } from '../../components/Navbar';
import styles from './dashboard.module.css';

export default function EmployeeDashboard() {
    const { user, profile, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;

    if (!user) return null;

    return (
        <>
            <Navbar />
            <div className={styles.dashboardContainer}>
                <header className={styles.header}>
                    <div className={styles.welcomeText}>
                        <h1>Hello, {profile?.name || user.displayName || 'Employee'} 👋</h1>
                        <p>Let's have a productive day!</p>
                    </div>
                </header>

                <main className={styles.grid}>
                    {/* Item 1: Clock */}
                    <div style={{ minWidth: 0 }}>
                        <ClockWidget />
                    </div>

                    {/* Item 2: Leave */}
                    <div style={{ minWidth: 0 }}>
                        <LeaveWidget />
                    </div>

                    {/* Item 3: Quick Links */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
                        <div
                            onClick={() => router.push('/documents')}
                            style={{
                                background: 'var(--bg-card)',
                                padding: '24px',
                                borderRadius: '16px',
                                border: '1px solid var(--glass-border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                height: '100%'
                            }}
                        >
                            <div style={{ fontSize: '2rem', background: 'rgba(79, 70, 229, 0.1)', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>📄</div>
                            <div>
                                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1.1rem' }}>Documents</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Payslips, IDs & Letters</div>
                            </div>
                        </div>

                        <div
                            onClick={() => router.push('/sites')}
                            style={{
                                background: 'var(--bg-card)',
                                padding: '24px',
                                borderRadius: '16px',
                                border: '1px solid var(--glass-border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                height: '100%'
                            }}
                        >
                            <div style={{ fontSize: '2rem', background: 'rgba(236, 72, 153, 0.1)', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>🏢</div>
                            <div>
                                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1.1rem' }}>My Sites</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Office Locations</div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
