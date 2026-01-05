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
            <nav style={{ padding: '20px 40px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <img src="/myaccount.svg" alt="Company Logo" height={32} />
                <Link href="/login" style={{ textDecoration: 'none', color: '#666', fontWeight: 600 }}>Login</Link>
            </nav>

            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Join Our Team</h1>
                    <p className={styles.subtitle}>We are looking for passionate individuals to help us build the future. Check out our open roles below.</p>
                </div>

                <div className={styles.jobGrid}>
                    {jobs.map(job => (
                        <Link href={`/careers/${job.id}`} key={job.id} className={styles.jobCard}>
                            <div>
                                <h2 className={styles.jobTitle}>{job.title}</h2>
                                <div className={styles.jobMeta}>
                                    <span>{job.department}</span>
                                    <span>•</span>
                                    <span>{job.location}</span>
                                    <span>•</span>
                                    <span>{job.type}</span>
                                </div>
                            </div>
                            <span className={styles.applyBtn}>View Role &rarr;</span>
                        </Link>
                    ))}
                    {jobs.length === 0 && !loading && <p style={{ textAlign: 'center', color: '#666' }}>No open positions at the moment.</p>}
                </div>
            </div>
        </div>
    );
}
