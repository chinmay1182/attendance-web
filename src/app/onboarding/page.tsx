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
        const { data, error } = await supabase.from('onboarding_tasks').select('*');

        if (error || !data || data.length === 0) {
            setTasks([
                { id: '1', task: "Sign Offer Letter", status: "Done" },
                { id: '2', task: "Submit ID Proofs", status: "Done" },
                { id: '3', task: "Setup Company Email", status: "Done" },
                { id: '4', task: "Fill Bank Details", status: "Pending" },
                { id: '5', task: "Complete Orientation Video", status: "Pending" }
            ]);
        } else {
            setTasks(data);
        }
    };

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
