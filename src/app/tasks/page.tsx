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
    user_id: string; // Added field
};

import styles from './tasks.module.css';

import toast from 'react-hot-toast';

import { Skeleton } from '../../components/Skeleton';

// ... (keep existing imports and types)

export default function TasksPage() {
    const { user, profile } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState('');
    const [hours, setHours] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Edit/Delete State
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editHours, setEditHours] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        if (!user) return;
        fetchTasks();

        // Realtime Subscription
        const channel = supabase.channel('my_tasks_v2')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                (payload: any) => {
                    const task = payload.new as any;
                    const oldTask = payload.old as any;

                    // Filter for non-admins if needed locally, but for simplicity we refresh or partial update
                    // Admin should see all updates. Normal user only theirs.

                    const isRelevant = profile?.role === 'admin' || task?.user_id === user.id || oldTask?.user_id === user.id;

                    if (!isRelevant) return;

                    if (payload.eventType === 'INSERT') {
                        setTasks(prev => [task, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setTasks(prev => prev.map(t => t.id === task.id ? task : t));
                    } else if (payload.eventType === 'DELETE') {
                        setTasks(prev => prev.filter(t => t.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, profile]);

    const fetchTasks = async () => {
        setFetching(true);
        let query = supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        // If not admin, filter by own ID
        if (profile?.role !== 'admin') {
            query = query.eq('user_id', user?.id);
        }

        const { data } = await query;
        if (data) setTasks(data);
        setFetching(false);
    };

    const handleAdd = async () => {
        if (!title || !hours) return toast.error("Please enter details");
        setLoading(true);

        const { error } = await supabase.from('tasks').insert([
            {
                user_id: user?.id,
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

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this task?')) return;
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) toast.error('Failed to delete');
        else toast.success('Task deleted');
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setEditTitle(task.title);
        setEditHours(task.hours.toString());
        setIsEditModalOpen(true);
    };

    const handleUpdateTask = async () => {
        if (!editingTask || !editTitle || !editHours) return;
        setSavingEdit(true);

        const { error } = await supabase
            .from('tasks')
            .update({
                title: editTitle,
                hours: parseFloat(editHours)
            })
            .eq('id', editingTask.id);

        if (error) {
            toast.error('Failed to update task');
        } else {
            toast.success('Task updated');
            setIsEditModalOpen(false);
            setEditingTask(null);
        }
        setSavingEdit(false);
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>
                    {profile?.role === 'admin' ? 'All Employee Timesheets' : 'Daily Timesheet'}
                </h1>

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
                        </>
                    ) : (
                        <>
                            {tasks.length === 0 && <p className={styles.emptyState}>No tasks found.</p>}
                            {tasks.map((task) => (
                                <div key={task.id} className={styles.taskCard}>
                                    <div style={{ flex: 1 }}>
                                        <h4 className={styles.taskTitle}>{task.title}</h4>
                                        <p className={styles.taskMeta}>
                                            {task.description} • {task.date}
                                            {profile?.role === 'admin' && <span style={{ marginLeft: '8px', color: 'var(--primary)', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>User: {task.user_id.slice(0, 4)}...</span>}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span className={styles.taskHours}>{task.hours} Hrs</span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => openEditModal(task)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Edit Modal */}
                {isEditModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
                    }} onClick={() => setIsEditModalOpen(false)}>
                        <div style={{
                            background: 'white', padding: '24px', borderRadius: '16px', width: '400px', maxWidth: '90%'
                        }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginTop: 0 }}>Edit Task</h3>
                            <div style={{ margin: '16px 0' }}>
                                <input
                                    className={styles.input}
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    placeholder="Title"
                                    style={{ width: '100%', marginBottom: '12px' }}
                                />
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={editHours}
                                    onChange={e => setEditHours(e.target.value)}
                                    placeholder="Hours"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button onClick={() => setIsEditModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#f1f5f9' }}>Cancel</button>
                                <button
                                    onClick={handleUpdateTask}
                                    disabled={savingEdit}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white' }}
                                >
                                    {savingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
