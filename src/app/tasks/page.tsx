"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

type Task = {
    id: string;
    title: string;
    hours: number;
    description: string;
    date: string;
};

import styles from './tasks.module.css';

import toast from 'react-hot-toast';

import { Skeleton } from '../../components/Skeleton';

// ... (keep existing imports and types)

export default function TasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState('');
    const [hours, setHours] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!user) return;

        // Initial Fetch
        fetchTasks();

        // Realtime Subscription
        const channel = supabase.channel('my_tasks')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.uid}` },
                (payload: any) => {
                    const task = payload.new as any;
                    if (payload.eventType === 'INSERT') {
                        setTasks(prev => [task, ...prev]);
                        import('react-hot-toast').then(({ default: toast }) => {
                            toast.success('New task received: ' + task.title);
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setTasks(prev => prev.map(t => t.id === task.id ? task : t));
                    } else if (payload.eventType === 'DELETE') {
                        setTasks(prev => prev.filter(t => t.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const fetchTasks = async () => {
        setFetching(true);
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user?.uid)
            .order('created_at', { ascending: false });
        if (data) setTasks(data);
        setFetching(false);
    };

    const handleAdd = async () => {
        // ... (keep existing handleAdd logic)
        if (!title || !hours) return toast.error("Please enter details");
        setLoading(true);

        const { error } = await supabase.from('tasks').insert([
            {
                user_id: user?.uid,
                title,
                hours: parseFloat(hours),
                date: new Date().toISOString().split('T')[0],
                description: 'Logged via TimeSheet'
            }
        ]);

        if (error) {
            console.error(error);
            toast.error("Failed to add task");
        } else {
            setTitle('');
            setHours('');
            toast.success("Task added successfully");
        }
        setLoading(false);
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Daily Timesheet</h1>
                <div className={styles.inputCard}>
                    <div className={styles.inputGroup}>
                        <input
                            type="text"
                            placeholder="What did you work on today?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={styles.input}
                        />
                        <input
                            type="number"
                            placeholder="Hours"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            className={`${styles.input} ${styles.hoursInput}`}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={loading}
                            className={styles.addBtn}
                        >
                            {loading ? 'Adding...' : 'Add Task'}
                        </button>
                    </div>
                </div>

                <div className={styles.taskList}>
                    {fetching ? (
                        <>
                            <Skeleton height={80} borderRadius={12} style={{ marginBottom: 12 }} />
                            <Skeleton height={80} borderRadius={12} style={{ marginBottom: 12 }} />
                            <Skeleton height={80} borderRadius={12} style={{ marginBottom: 12 }} />
                        </>
                    ) : (
                        <>
                            {tasks.length === 0 && <p className={styles.emptyState}>No tasks logged for today.</p>}
                            {tasks.map((task) => (
                                <div key={task.id} className={styles.taskCard}>
                                    <div>
                                        <h4 className={styles.taskTitle}>{task.title}</h4>
                                        <p className={styles.taskMeta}>{task.description} • {task.date}</p>
                                    </div>
                                    <span className={styles.taskHours}>{task.hours} Hrs</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
