"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './onboarding.module.css';

type Task = {
    id: string;
    task: string;
    status: 'Done' | 'Pending';
};

export default function OnboardingPage() {
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        const { data, error } = await supabase.from('onboarding_tasks').select('*').order('id');
        if (data) setTasks(data);
    };

    useEffect(() => {
        const channel = supabase.channel('onboarding_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'onboarding_tasks' }, () => fetchTasks())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Onboarding Checklist</h1>
                <div className={styles.card}>
                    <div className={styles.checkList}>
                        {tasks.map((item) => (
                            <div key={item.id} className={styles.item}>
                                <div className={`${styles.statusIcon} ${item.status === 'Done' ? styles.statusDoneIcon : styles.statusPendingIcon}`}>
                                    {item.status === 'Done' ? '✓' : ''}
                                </div>
                                <span className={item.status === 'Done' ? styles.taskDoneText : styles.taskText}>
                                    {item.task}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
