"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ClockWidget } from '../../components/ClockWidget';
import { LeaveWidget } from '../../components/LeaveWidget';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import styles from './dashboard.module.css';

import { Skeleton } from '../../components/Skeleton';

// ... (existing imports, ClockWidget, LeaveWidget, Navbar, supabase)

export default function EmployeeDashboard() {
    const { user, profile, loading } = useAuth();
    // ... (rest of hook logic)
    const router = useRouter();
    const [docs, setDocs] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            fetchData();
        }
    }, [user, loading, router]);

    const fetchData = async () => {
        const { data: dData } = await supabase.from('documents').select('*').limit(3).order('created_at', { ascending: false });
        if (dData && dData.length > 0) setDocs(dData);
        else {
            setDocs([
                { id: 1, name: "Offer Letter.pdf", type: "General" },
                { id: 2, name: "ID Card Front.jpg", type: "General" },
                { id: 3, name: "Payslip_Jan_2024.pdf", type: "Payslip" }
            ]);
        }

        const { data: sData } = await supabase.from('sites').select('*').limit(2);
        if (sData && sData.length > 0) setSites(sData);
        else {
            setSites([
                { id: '1', name: "Headquarters", latitude: 37.4220, longitude: -122.0841 },
                { id: '2', name: "Remote Hub", latitude: 34.0522, longitude: -118.2437 }
            ]);
        }
    };

    const getDocIcon = (name: string) => {
        if (name.endsWith('.pdf')) return <span className="material-symbols-outlined">picture_as_pdf</span>;
        if (name.endsWith('.jpg') || name.endsWith('.png')) return <span className="material-symbols-outlined">imagesmode</span>;
        return <span className="material-symbols-outlined">description</span>;
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
                    {/* Skeleton for Clock Widget */}
                    <div style={{ minWidth: 0 }}>
                        <Skeleton height={280} borderRadius={24} />
                    </div>

                    {/* Skeleton for Leave Widget */}
                    <div style={{ minWidth: 0 }}>
                        <Skeleton height={280} borderRadius={24} />
                    </div>

                    {/* Skeleton for Side Widgets */}
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
        // ... (Original Return Statement)
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

                    {/* Item 3: Quick Widgets */}
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
                                    <span className="material-symbols-outlined" style={{ color: '#4f46e5' }}>folder</span> My Documents
                                </h3>
                                <span onClick={() => router.push('/documents')} style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {docs.map((doc, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < docs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                        <div style={{ color: '#64748b' }}>{getDocIcon(doc.name)}</div>
                                        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '0.9rem', color: '#334155' }}>{doc.name}</div>
                                    </div>
                                ))}
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
                                    <span className="material-symbols-outlined" style={{ color: '#ec4899' }}>location_on</span> My Sites
                                </h3>
                                <span onClick={() => router.push('/sites')} style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {sites.map((site) => (
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
                                ))}
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </>
    );
}
