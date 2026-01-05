
"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Navbar } from '../../components/Navbar';
import styles from './calendar.module.css';

export default function TeamCalendar() {
    const [events, setEvents] = useState<any[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        fetchEvents();

        const channel = supabase.channel('calendar_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => fetchEvents())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'public_holidays' }, () => fetchEvents())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentMonth]);

    const fetchEvents = async () => {
        // Fetch both holidays and leaves for viewing
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();

        try {
            const res = await fetch(`/api/calendar?start=${startOfMonth}&end=${endOfMonth}`, { cache: 'no-store' });
            if (res.ok) {
                setEvents(await res.json());
            }
        } catch (e) { console.error(e); }
    };

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 is Sunday

    const renderDays = () => {
        let days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={styles.emptyDay}></div>);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);

            days.push(
                <div key={i} className={styles.day}>
                    <div className={styles.dayNum}>{i}</div>
                    {dayEvents.map((ev, idx) => (
                        <div key={idx} className={`${styles.event} ${styles[ev.type]}`}>
                            {ev.title}
                        </div>
                    ))}
                </div>
            );
        }
        return days;
    };

    const changeMonth = (offset: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Team Calendar</h1>
                    <div className={styles.nav}>
                        <button onClick={() => changeMonth(-1)} className={styles.navBtn}>
                            <span className="material-symbols-outlined">keyboard_arrow_left</span>
                        </button>
                        <span>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => changeMonth(1)} className={styles.navBtn}>
                            <span className="material-symbols-outlined">keyboard_arrow_right</span>
                        </button>
                    </div>
                </header>

                <div className={styles.grid}>
                    <div className={styles.dayName}>Sun</div>
                    <div className={styles.dayName}>Mon</div>
                    <div className={styles.dayName}>Tue</div>
                    <div className={styles.dayName}>Wed</div>
                    <div className={styles.dayName}>Thu</div>
                    <div className={styles.dayName}>Fri</div>
                    <div className={styles.dayName}>Sat</div>
                    {renderDays()}
                </div>
            </div>
        </>
    );
}
