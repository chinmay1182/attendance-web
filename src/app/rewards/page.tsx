"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './rewards.module.css';

type Reward = {
    id: string;
    title: string;
    description: string;
    points: number;
    icon: string;
};

export default function RewardsPage() {
    const [rewards, setRewards] = useState<Reward[]>([]);

    useEffect(() => {
        fetchRewards();
    }, []);

    const fetchRewards = async () => {
        const { data, error } = await supabase.from('rewards').select('*');
        if (error || !data || data.length === 0) {
            // Fallback content handled in UI or state init if needed, but keeping simple here
            // If empty, we might keep the hardcoded ones if that's the intended behavior
        } else {
            setRewards(data);
        }
    };

    useEffect(() => {
        const channel = supabase.channel('rewards_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rewards' },
                (payload: any) => {
                    const rec = payload.new as any;
                    if (payload.eventType === 'INSERT') {
                        setRewards(prev => [rec, ...prev]);
                        import('react-hot-toast').then(({ default: toast }) => { toast('🏆 New Reward Added: ' + rec.title); });
                    } else if (payload.eventType === 'UPDATE') {
                        setRewards(prev => prev.map(r => r.id === rec.id ? { ...r, ...rec } : r));
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
                <h1 className={styles.title}>Rewards & Recognition</h1>
                <p className={styles.subtitle}>Celebrate your team's achievements!</p>

                <div className={styles.grid}>
                    {rewards.map((reward) => (
                        <div key={reward.id} className={styles.card}>
                            <div className={styles.icon}>{reward.icon}</div>
                            <h3 className={styles.cardTitle}>{reward.title}</h3>
                            <p className={styles.cardDesc}>{reward.description}</p>
                            <div className={styles.pointsBadge}>
                                + {reward.points} Points
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
