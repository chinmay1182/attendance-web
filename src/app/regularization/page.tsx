
"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Navbar } from '../../components/Navbar';
import styles from './regularization.module.css';

import toast from 'react-hot-toast';

export default function RegularizationPage() {
    const { user } = useAuth();
    const [date, setDate] = useState('');
    const [inTime, setInTime] = useState('');
    const [outTime, setOutTime] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const [requests, setRequests] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchRequests();

            const channel = supabase.channel('regularization_realtime')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'regularization_requests', filter: `user_id=eq.${user.uid}` },
                    () => fetchRequests()
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [user]);

    const fetchRequests = async () => {
        const { data } = await supabase
            .from('regularization_requests')
            .select('*')
            .eq('user_id', user?.uid)
            .order('created_at', { ascending: false });
        if (data) setRequests(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        // Construct timestamps
        const clockIn = new Date(`${date}T${inTime}`).toISOString();
        const clockOut = new Date(`${date}T${outTime}`).toISOString();

        const { error } = await supabase.from('regularization_requests').insert([{
            user_id: user.uid,
            date,
            clock_in: clockIn,
            clock_out: clockOut,
            reason,
            status: 'Pending'
        }]);

        setLoading(false);
        if (error) {
            console.error(error);
            toast.error('Failed to submit request');
        } else {
            toast.success('Request submitted successfully');
            setDate(''); setInTime(''); setOutTime(''); setReason('');
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Attendance Regularization</h1>
                <div className={styles.card}>
                    <p className={styles.subtitle}>Missed a punch? Request a correction here.</p>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                        <div className={styles.row}>
                            <Input label="Actual Clock In" type="time" value={inTime} onChange={e => setInTime(e.target.value)} required />
                            <Input label="Actual Clock Out" type="time" value={outTime} onChange={e => setOutTime(e.target.value)} required />
                        </div>
                        <Input label="Reason" value={reason} onChange={e => setReason(e.target.value)} required placeholder="Forgot to punch out / System issue" />

                        <Button type="submit" isLoading={loading}>Submit Request</Button>
                    </form>
                </div>

                <div className={styles.card} style={{ marginTop: '24px' }}>
                    <h3 className={styles.subtitle} style={{ marginBottom: '16px' }}>My Requests</h3>
                    {requests.length === 0 && <p style={{ color: '#64748b' }}>No requests found.</p>}
                    {requests.map(req => (
                        <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{req.date}</div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{req.reason}</div>
                            </div>
                            <span style={{
                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                background: req.status === 'Approved' ? '#dcfce7' : req.status === 'Rejected' ? '#fee2e2' : '#f1f5f9',
                                color: req.status === 'Approved' ? '#16a34a' : req.status === 'Rejected' ? '#ef4444' : '#64748b'
                            }}>{req.status || 'Pending'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
