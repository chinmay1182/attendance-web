"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './careers.module.css';
import Link from 'next/link';

export default function CareersPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        const { data } = await supabase
            .from('jobs')
            .select('*')
            .eq('status', 'open')
            .order('created_at', { ascending: false });
        if (data) setJobs(data);
        setLoading(false);
    };

    useEffect(() => {
        const channel = supabase.channel('career_jobs_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchJobs())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#fff' }}>
            <nav style={{ padding: '20px 40px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/myaccount.svg" alt="Company Logo" height={32} />
                    <span style={{ fontWeight: 600, fontSize: '1.2rem', color: '#111' }}>Careers</span>
                </div>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <a href="http://myaccount.asia" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#666', fontWeight: 500, fontSize: '0.95rem' }}>
                        Go to Main Site ↗
                    </a>
                    <Link href="/login" style={{ textDecoration: 'none', color: '#111', fontWeight: 600, padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        Login
                    </Link>
                </div>
            </nav>

            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Join Our Team</h1>
                    <p className={styles.subtitle}>We are looking for passionate individuals to help us build the future. Check out our {jobs.length} open roles below.</p>
                </div>

                <div className={styles.jobGrid}>
                    {jobs.map(job => (
                        <Link href={`/careers/${job.id}`} key={job.id} className={styles.jobCard}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <h2 className={styles.jobTitle}>{job.title}</h2>
                                    <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', color: '#4b5563', fontWeight: 500 }}>{job.type}</span>
                                </div>
                                <div className={styles.jobMeta}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>apartment</span>
                                        {job.department}
                                    </span>
                                    <span>•</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
                                        {job.location}
                                    </span>
                                    <span>•</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
                                        Posted {new Date(job.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <span className={styles.applyBtn} style={{ marginLeft: '24px', whiteSpace: 'nowrap' }}>View Details</span>
                        </Link>
                    ))}
                    {jobs.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '16px', border: '1px dashed #e5e7eb' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '16px' }}>work_off</span>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>No open positions</h3>
                            <p style={{ color: '#6b7280' }}>We don't have any open roles right now. Please check back later.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
