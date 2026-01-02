"use client";
import React from 'react';
import { Navbar } from '../../components/Navbar';

import styles from './stats.module.css';

import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function StatsPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 }); // Absent simulated

    useEffect(() => {
        if (user) fetchStats();
    }, [user]);

    const fetchStats = async () => {
        const { data } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('user_id', user?.uid);

        if (data) {
            let present = data.length;
            let late = data.filter(log => {
                const hour = new Date(log.clock_in).getHours();
                return hour >= 10; // Late if after 10 AM
            }).length;

            setStats({ present, late, absent: 30 - present }); // Assuming 30 days/metric
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>My Attendance Stats</h1>
                <div className={styles.grid}>
                    <div className={styles.statCard}>
                        <h2 className={styles.statValue}>{stats.present}</h2>
                        <p className={styles.statLabel}>Present Days</p>
                    </div>
                    <div className={styles.statCard}>
                        <h2 className={styles.statValue}>{stats.absent}</h2>
                        <p className={styles.statLabel}>Absent</p>
                    </div>
                    <div className={styles.statCard}>
                        <h2 className={styles.statValue}>{stats.late}</h2>
                        <p className={styles.statLabel}>Late Arrivals</p>
                    </div>
                </div>

                <div className={styles.chartContainer}>
                    <h3 style={{ marginBottom: '20px' }}>Monthly Overview</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '30px' }}>
                        <div style={{ width: '60px', background: '#3b82f6', height: `${(stats.present / 30) * 100}%`, borderRadius: '8px 8px 0 0', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: '-25px', width: '100%', textAlign: 'center' }}>{stats.present}</span>
                            <span style={{ position: 'absolute', bottom: '-25px', width: '100%', textAlign: 'center' }}>Present</span>
                        </div>
                        <div style={{ width: '60px', background: '#ef4444', height: `${(stats.absent / 30) * 100}%`, borderRadius: '8px 8px 0 0', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: '-25px', width: '100%', textAlign: 'center' }}>{stats.absent}</span>
                            <span style={{ position: 'absolute', bottom: '-25px', width: '100%', textAlign: 'center' }}>Absent</span>
                        </div>
                        <div style={{ width: '60px', background: '#eab308', height: `${(stats.late / 30) * 100}%`, borderRadius: '8px 8px 0 0', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: '-25px', width: '100%', textAlign: 'center' }}>{stats.late}</span>
                            <span style={{ position: 'absolute', bottom: '-25px', width: '100%', textAlign: 'center' }}>Late</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
