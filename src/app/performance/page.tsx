"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './performance.module.css';

// Mapped type for UI
type GUIGoal = {
    goal: string;
    progress: number;
};

export default function PerformancePage() {
    const [goals, setGoals] = useState<GUIGoal[]>([]);

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        const { data, error } = await supabase
            .from('performance_goals')
            .select('*');

        if (data) {
            const mapData = (raw: any[]) => raw.map((d: any) => ({
                goal: d.title || d.goal || "Goal",
                progress: d.progress || 0,
                id: d.id // Ensure ID is mapped if needed for updates
            }));
            setGoals(mapData(data));
        }
    };

    useEffect(() => {
        const channel = supabase.channel('performance_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'performance_goals' },
                (payload: any) => {
                    const rec = payload.new as any;

                    if (payload.eventType === 'UPDATE') {
                        // Re-fetch to ensure data consistency
                        fetchGoals();
                        import('react-hot-toast').then(({ default: toast }) => { toast('📈 Goal Progress Updated!'); });
                    } else if (payload.eventType === 'INSERT') {
                        // Handle new goal
                        setGoals(prev => [...prev, { goal: rec.title || rec.goal, progress: rec.progress || 0 }]);
                        import('react-hot-toast').then(({ default: toast }) => { toast('✨ New Goal Assigned!'); });
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Performance Appraisal</h1>
                <div className={styles.card}>
                    <h3 className={styles.sectionTitle}>My Goals (KPIs) - 2024</h3>
                    <div className={styles.goalsList}>
                        {goals.map((kpi, i) => (
                            <div key={i} className={styles.goalItem}>
                                <div className={styles.goalHeader}>
                                    <strong className={styles.goalTitle}>{kpi.goal}</strong>
                                    <span className={styles.goalPercentage}>{kpi.progress}%</span>
                                </div>
                                <div className={styles.progressBarBg}>
                                    <div
                                        className={styles.progressBarFill}
                                        style={{ width: `${kpi.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
