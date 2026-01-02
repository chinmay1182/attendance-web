
"use client";
import React, { useEffect, useState } from 'react';
import styles from './LeaveWidget.module.css';
import { useAuth } from '../context/AuthContext';
import { leaveService, LeaveRequest } from '../lib/leaveService';
import { Button } from './Button';
import { Input } from './Input';

export const LeaveWidget = () => {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [type, setType] = useState<'sick' | 'casual' | 'paid'>('casual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (user) {
            loadLeaves();
        }
    }, [user]);

    const loadLeaves = async () => {
        if (!user) return;
        try {
            const data = await leaveService.getMyLeaves(user.uid);
            setLeaves(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            await leaveService.requestLeave(user.uid, {
                type,
                start_date: startDate,
                end_date: endDate,
                reason
            });
            setIsFormOpen(false);
            setStartDate('');
            setEndDate('');
            setReason('');
            await loadLeaves();
        } catch (error) {
            console.error(error);
            alert("Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.title}>My Leaves</div>
                {!isFormOpen && (
                    <Button
                        variant="secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => setIsFormOpen(true)}
                    >
                        + Request
                    </Button>
                )}
            </div>

            {isFormOpen ? (
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#a0a0b0', marginBottom: 5 }}>Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white'
                            }}
                        >
                            <option value="casual" style={{ color: 'black' }}>Casual Leave</option>
                            <option value="sick" style={{ color: 'black' }}>Sick Leave</option>
                            <option value="paid" style={{ color: 'black' }}>Paid Leave</option>
                        </select>
                    </div>

                    <div className={styles.row}>
                        <Input
                            type="date"
                            label="Start"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                        />
                        <Input
                            type="date"
                            label="End"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                        />
                    </div>

                    <Input
                        label="Reason"
                        placeholder="Why do you need leave?"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                    />

                    <div className={styles.row} style={{ marginTop: 10 }}>
                        <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={loading}>Submit</Button>
                    </div>
                </form>
            ) : (
                <div className={styles.list}>
                    {leaves.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No leave history.</p>
                    ) : (
                        leaves.map(leave => (
                            <div key={leave.id} className={`${styles.item} ${leave.status === 'pending' ? styles.itemPending :
                                    leave.status === 'approved' ? styles.itemApproved :
                                        styles.itemRejected
                                }`}>
                                <div>
                                    <div className={styles.type}>{leave.type} Leave</div>
                                    <div className={styles.date}>{leave.start_date}</div>
                                </div>
                                <span className={styles.badge} style={{
                                    color: leave.status === 'pending' ? '#eab308' :
                                        leave.status === 'approved' ? '#22c55e' : '#ef4444'
                                }}>
                                    {leave.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
