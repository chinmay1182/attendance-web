"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './shifts.module.css';

type Shift = {
    id: string;
    start_time: string;
    end_time: string;
};

export default function ShiftsPage() {
    const { user } = useAuth();
    const [shifts, setShifts] = useState<Shift[]>([]);

    // Simple current week generation
    const getWeekDays = () => {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1)); // Start Monday
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            return d;
        });
    };

    const weekDays = getWeekDays();

    useEffect(() => {
        if (user) fetchShifts();
    }, [user]);

    const fetchShifts = async () => {
        const start = weekDays[0].toISOString();
        const end = weekDays[6].toISOString();

        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('user_id', user?.uid)
            .gte('start_time', start)
            .lte('start_time', end);

        if (data) setShifts(data);
    };

    useEffect(() => {
        if (user) {
            const channel = supabase.channel('my_shifts')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'shifts', filter: `user_id=eq.${user.uid}` },
                    (payload: any) => {
                        if (payload.eventType === 'INSERT') {
                            setShifts(prev => [...prev, payload.new]);
                            import('react-hot-toast').then(({ default: toast }) => { toast('📅 New Shift Assigned'); });
                        } else if (payload.eventType === 'UPDATE') {
                            setShifts(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
                            import('react-hot-toast').then(({ default: toast }) => { toast('📅 Shift Updated'); });
                        } else if (payload.eventType === 'DELETE') {
                            setShifts(prev => prev.filter(s => s.id !== payload.old.id));
                            import('react-hot-toast').then(({ default: toast }) => { toast('📅 Shift Removed'); });
                        }
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [user]);

    const getShiftForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return shifts.find(s => s.start_time.startsWith(dateStr));
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>My Shifts</h1>
                <div className={styles.card}>
                    <div className={styles.calendarGrid}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className={styles.dayHeader}>{day}</div>
                        ))}
                        {weekDays.map((date, i) => {
                            const shift = getShiftForDate(date);
                            return (
                                <div key={i} className={styles.dayCell}>
                                    <div className={styles.dateNumber}>{date.getDate()}</div>
                                    {shift ? (
                                        <div className={styles.shiftEvent}>
                                            {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                            {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Rest Day</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
