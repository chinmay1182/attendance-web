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

        if (error || !data || data.length === 0) {
            // Fallback
            setGoals([
                { goal: "Complete Frontend Revamp", progress: 80 },
                { goal: "Mentor 2 Junior Devs", progress: 50 },
                { goal: "Reduce Bug Count by 20%", progress: 30 }
            ]);
        } else {
            // Adapt DB to UI
            setGoals(data.map((d: any) => ({
                goal: d.title || d.goal || "Goal",
                progress: d.progress || 0
            })));
        }
    };

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
