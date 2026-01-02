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
            setRewards([
                { id: '1', title: "Star Performer", description: "Awarded to Sarah for outstanding performance in Q4.", points: 500, icon: "🏆" },
                { id: '2', title: "Team Player", description: "Awarded to Mike for helping the design team.", points: 200, icon: "🤝" },
                { id: '3', title: "Bug Buster", description: "Awarded to Jenny for fixing critical prod bugs.", points: 300, icon: "🐛" }
            ]);
        } else {
            setRewards(data);
        }
    };

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
