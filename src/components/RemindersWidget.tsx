"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Skeleton } from './Skeleton';
import styles from './RemindersWidget.module.css';

type Reminder = {
    id: string;
    title: string;
    description: string;
    date: string;
    hours?: number;
    user_id: string;
    created_at: string;
    users?: {
        name: string;
        email: string;
    };
};

export const RemindersWidget = () => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReminders();

        // Realtime subscription for tasks
        const channel = supabase.channel('admin_reminders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                () => {
                    fetchReminders();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchReminders = async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Fetch tasks with future dates
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    users:user_id (
                        name,
                        email
                    )
                `)
                .gte('date', today)
                .order('date', { ascending: true })
                .limit(10);

            if (error) {
                console.error('Error fetching reminders:', error);
            } else if (data) {
                setReminders(data as any);
            }
        } catch (error) {
            console.error('Error fetching reminders:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateOnly = dateString.split('T')[0];
        const todayOnly = today.toISOString().split('T')[0];
        const tomorrowOnly = tomorrow.toISOString().split('T')[0];

        if (dateOnly === todayOnly) return 'Today';
        if (dateOnly === tomorrowOnly) return 'Tomorrow';

        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        };
        return date.toLocaleDateString('en-US', options);
    };

    const getDaysUntil = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>
                            notifications_active
                        </span>
                        Upcoming Reminders
                    </h3>
                </div>
                <div className={styles.remindersList}>
                    <Skeleton height={70} borderRadius={12} style={{ marginBottom: 12 }} />
                    <Skeleton height={70} borderRadius={12} style={{ marginBottom: 12 }} />
                    <Skeleton height={70} borderRadius={12} />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>
                        notifications_active
                    </span>
                    Upcoming Reminders
                </h3>
                <span className={styles.count}>{reminders.length}</span>
            </div>

            <div className={styles.remindersList}>
                {reminders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>
                            event_available
                        </span>
                        <p>No upcoming tasks or reminders</p>
                    </div>
                ) : (
                    reminders.map((reminder) => {
                        const daysUntil = getDaysUntil(reminder.date);
                        const isUrgent = daysUntil <= 2;

                        return (
                            <div
                                key={reminder.id}
                                className={`${styles.reminderCard} ${isUrgent ? styles.urgent : ''}`}
                            >
                                <div className={styles.reminderContent}>
                                    <div className={styles.reminderHeader}>
                                        <h4 className={styles.reminderTitle}>{reminder.title}</h4>
                                        <span className={`${styles.dateBadge} ${isUrgent ? styles.urgentBadge : ''}`}>
                                            {formatDate(reminder.date)}
                                        </span>
                                    </div>
                                    <div className={styles.reminderMeta}>
                                        <span className={styles.assignee}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                                person
                                            </span>
                                            {reminder.users?.name || reminder.users?.email || 'Unknown'}
                                        </span>
                                        {reminder.hours && (
                                            <span className={styles.hours}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                                    schedule
                                                </span>
                                                {reminder.hours} hrs
                                            </span>
                                        )}
                                    </div>
                                    {reminder.description && reminder.description !== 'Logged via TimeSheet' && (
                                        <p className={styles.description}>{reminder.description}</p>
                                    )}
                                </div>
                                {isUrgent && (
                                    <div className={styles.urgentIndicator}>
                                        <span className="material-symbols-outlined">
                                            priority_high
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
