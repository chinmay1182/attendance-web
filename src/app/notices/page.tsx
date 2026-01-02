"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';

type Notice = {
    id: string;
    title: string;
    content: string;
    type: string;
    created_at: string;
};

import styles from './notices.module.css';

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setNotices(data);
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Notice Board</h1>
                <div className={styles.noticesList}>
                    {notices.length === 0 && <p className={styles.emptyState}>No notices posted yet.</p>}
                    {notices.map((notice) => (
                        <div key={notice.id} className={styles.noticeCard}>
                            <div className={styles.header}>
                                <span className={styles.typeBadge}>{notice.type}</span>
                                <span className={styles.date}>{new Date(notice.created_at).toLocaleDateString()}</span>
                            </div>
                            <h3 className={styles.noticeTitle}>{notice.title}</h3>
                            <p className={styles.content}>{notice.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
