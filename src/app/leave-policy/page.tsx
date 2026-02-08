"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './leave-policy.module.css';
import toast from 'react-hot-toast';

type LeavePolicy = {
    id: string;
    name: string;
    days_per_year: number;
    description: string;
};

type LeaveRequest = {
    id: string;
    user_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    user?: { name: string, email: string, department: string };
};

type Holiday = {
    id: string;
    name: string;
    date: string;
    type: string;
};

export default function LeavesPage() {
    const { user, profile } = useAuth();
    const isAdminOrHr = profile?.role === 'admin' || profile?.role === 'hr';

    const [activeTab, setActiveTab] = useState<'dashboard' | 'my_leaves' | 'requests' | 'policies' | 'holidays'>('dashboard');
    const [policies, setPolicies] = useState<LeavePolicy[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
    const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Apply Modal State
    const [isApplyOpen, setIsApplyOpen] = useState(false);
    const [newLeave, setNewLeave] = useState({ type: '', start: '', end: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);

    // Action Modal State
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionData, setActionData] = useState<{ id: string, type: 'approved' | 'rejected' } | null>(null);
    const [adminNote, setAdminNote] = useState('');

    useEffect(() => {
        if (user) {
            fetchPolicies();
            fetchHolidays();
            fetchMyRequests();

            if (isAdminOrHr) {
                fetchAllRequests();
            }

            // Realtime Leaves
            const channel = supabase.channel('leaves_realtime')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'leave_requests' },
                    async (payload: any) => {
                        const rec = payload.new as any;

                        if (payload.eventType === 'INSERT') {
                            if (rec.user_id === user.id) {
                                setMyRequests(prev => [rec, ...prev]);
                            }
                            if (isAdminOrHr) {
                                const { data: u } = await supabase.from('users').select('name, email, department').eq('id', rec.user_id).single();
                                setAllRequests(prev => [{ ...rec, user: u }, ...prev]);
                            }
                        } else if (payload.eventType === 'UPDATE') {
                            setMyRequests(prev => prev.map(r => r.id === rec.id ? { ...r, ...rec } : r));
                            setAllRequests(prev => prev.map(r => r.id === rec.id ? { ...r, status: rec.status, handled_by: rec.handled_by } : r));
                        }
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [user, profile]);

    const fetchHolidays = async () => {
        try {
            const res = await fetch('/api/company/holidays', { cache: 'no-store' });
            if (res.ok) setHolidays(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchPolicies = async () => {
        try {
            const res = await fetch('/api/company/policies', { cache: 'no-store' });
            if (res.ok) setPolicies(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchMyRequests = async () => {
        try {
            const res = await fetch(`/api/leaves?uid=${user?.id}`, { cache: 'no-store' });
            if (res.ok) setMyRequests(await res.json());
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchAllRequests = async () => {
        const { data } = await supabase
            .from('leave_requests')
            .select('*, user:users(name, email, department)')
            .order('created_at', { ascending: false });
        if (data) setAllRequests(data as any);
    };

    const handleApplyLeave = async () => {
        if (!newLeave.type || !newLeave.start || !newLeave.end) {
            toast.error("Please fill all required fields");
            return;
        }
        setSubmitting(true);
        const { error } = await supabase.from('leave_requests').insert({
            user_id: user?.id,
            leave_type: newLeave.type,
            start_date: newLeave.start,
            end_date: newLeave.end,
            reason: newLeave.reason,
            status: 'pending'
        });

        if (error) {
            toast.error("Failed to submit request");
        } else {
            toast.success("Leave request submitted!");
            setIsApplyOpen(false);
            setNewLeave({ type: '', start: '', end: '', reason: '' });
            fetchMyRequests();
            if (isAdminOrHr) fetchAllRequests();
        }
        setSubmitting(false);
    };

    const openActionModal = (id: string, type: 'approved' | 'rejected') => {
        setActionData({ id, type });
        setAdminNote('');
        setIsActionModalOpen(true);
    };

    const confirmAction = async () => {
        if (!actionData) return;

        if (actionData.type === 'rejected' && !adminNote.trim()) {
            toast.error("Please provide a reason for rejection.");
            return;
        }

        const { error } = await supabase
            .from('leave_requests')
            .update({
                status: actionData.type,
                handled_by: user?.id,
                admin_note: adminNote
            })
            .eq('id', actionData.id);

        if (error) {
            toast.error("Update failed");
        } else {
            toast.success(`Request ${actionData.type}`);
            fetchAllRequests();
            setIsActionModalOpen(false);
        }
    };

    // Derived Stats
    const pendingCount = allRequests.filter(r => r.status === 'pending').length;
    const approvedTodayCount = allRequests.filter(r => r.status === 'approved' && new Date(r.start_date) <= new Date() && new Date(r.end_date) >= new Date()).length;

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Leaves Management</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Manage employee leave requests and policies</p>
                    </div>
                    <div>
                        {profile?.role !== 'admin' && (
                            <button onClick={() => setIsApplyOpen(true)} className={styles.primaryBtn} style={{ width: 'auto', padding: '10px 24px' }}>
                                Apply Leave
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button onClick={() => setActiveTab('dashboard')} className={`${styles.tabBtn} ${activeTab === 'dashboard' ? styles.active : ''}`}>Overview</button>
                    {isAdminOrHr && <button onClick={() => setActiveTab('requests')} className={`${styles.tabBtn} ${activeTab === 'requests' ? styles.active : ''}`}>All Requests {pendingCount > 0 && <span style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '99px', fontSize: '0.7rem', marginLeft: '4px' }}>{pendingCount}</span>}</button>}
                    <button onClick={() => setActiveTab('my_leaves')} className={`${styles.tabBtn} ${activeTab === 'my_leaves' ? styles.active : ''}`}>My Leaves</button>
                    <button onClick={() => setActiveTab('holidays')} className={`${styles.tabBtn} ${activeTab === 'holidays' ? styles.active : ''}`}>Holidays</button>
                    <button onClick={() => setActiveTab('policies')} className={`${styles.tabBtn} ${activeTab === 'policies' ? styles.active : ''}`}>Policies</button>
                </div>

                {activeTab === 'dashboard' && (
                    <>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <h2 className={styles.statValue} style={{ color: '#f59e0b' }}>{myRequests.filter(r => r.status === 'pending').length}</h2>
                                <p className={styles.statLabel}>My Pending Requests</p>
                            </div>
                            <div className={styles.statCard}>
                                <h2 className={styles.statValue} style={{ color: '#10b981' }}>{myRequests.filter(r => r.status === 'approved').length}</h2>
                                <p className={styles.statLabel}>My Approved Leaves (YTD)</p>
                            </div>
                            {isAdminOrHr && (
                                <>
                                    <div className={styles.statCard}>
                                        <h2 className={styles.statValue} style={{ color: '#f97316' }}>{pendingCount}</h2>
                                        <p className={styles.statLabel}>Team Pending Approval</p>
                                    </div>
                                    <div className={styles.statCard}>
                                        <h2 className={styles.statValue} style={{ color: '#3b82f6' }}>{approvedTodayCount}</h2>
                                        <p className={styles.statLabel}>Staff on Leave Today</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Balances Section */}
                        <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>My Leave Balances</h3>
                        <div className={styles.grid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                            {policies.map(policy => {
                                const taken = myRequests
                                    .filter(r => r.status === 'approved' && r.leave_type === policy.name)
                                    .reduce((acc, r) => {
                                        const start = new Date(r.start_date);
                                        const end = new Date(r.end_date);
                                        const diffTime = Math.abs(end.getTime() - start.getTime());
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                        return acc + diffDays;
                                    }, 0);
                                const remaining = policy.days_per_year - taken;
                                const percentage = Math.max(0, (remaining / policy.days_per_year) * 100);

                                return (
                                    <div key={policy.id} className={styles.balanceCard}>
                                        <div className={styles.balanceHeader}>
                                            <span>{policy.name}</span>
                                            <span className={styles.balanceRemaining}>{remaining}/{policy.days_per_year} Left</span>
                                        </div>
                                        <div className={styles.progressBarTrack}>
                                            <div className={styles.progressBarFill} style={{ width: `${percentage}%`, background: percentage < 20 ? '#ef4444' : 'var(--primary)' }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Recent Activity Mini Table */}
                        <div className={styles.card}>
                            <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Type</th>
                                        <th>Dates</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(isAdminOrHr ? allRequests : myRequests).slice(0, 5).map(req => (
                                        <tr key={req.id}>
                                            <td>{req.user ? req.user.name : 'Me'}</td>
                                            <td>{req.leave_type}</td>
                                            <td>{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</td>
                                            <td><span className={`${styles.statusBadge} ${styles[req.status]}`}>{req.status}</span></td>
                                        </tr>
                                    ))}
                                    {allRequests.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No recent activity</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'requests' && isAdminOrHr && (
                    <div className={styles.card}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Leave Type</th>
                                    <th>Duration</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allRequests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            <div className={styles.userCell}>
                                                <div className={styles.avatar}>{req.user?.name.charAt(0)}</div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{req.user?.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{req.user?.department}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{req.leave_type}</td>
                                        <td>
                                            {new Date(req.start_date).toLocaleDateString()} <span style={{ color: '#94a3b8' }}>to</span> {new Date(req.end_date).toLocaleDateString()}
                                        </td>
                                        <td style={{ maxWidth: '200px', color: '#64748b' }}>{req.reason || '-'}</td>
                                        <td><span className={`${styles.statusBadge} ${styles[req.status]}`}>{req.status}</span></td>
                                        <td>
                                            {req.status === 'pending' && (
                                                <>
                                                    <button onClick={() => openActionModal(req.id, 'approved')} className={`${styles.actionBtn} ${styles.approveBtn}`}>Approve</button>
                                                    <button onClick={() => openActionModal(req.id, 'rejected')} className={`${styles.actionBtn} ${styles.rejectBtn}`}>Reject</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'my_leaves' && (
                    <div className={styles.card}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Dates</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Applied On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myRequests.map(req => (
                                    <tr key={req.id}>
                                        <td>{req.leave_type}</td>
                                        <td>{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</td>
                                        <td>{req.reason}</td>
                                        <td><span className={`${styles.statusBadge} ${styles[req.status]}`}>{req.status}</span></td>
                                        <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'policies' && (
                    <div className={styles.card}>
                        {policies.map(p => (
                            <div key={p.id} className={styles.policyItem}>
                                <div className={styles.policyInfo}>
                                    <h3>{p.name}</h3>
                                    <p>{p.description}</p>
                                </div>
                                <span className={styles.allocation}>{p.days_per_year} Days/Year</span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'holidays' && (
                    <div className={styles.card}>
                        <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Public Holidays (2025)</h3>
                        {holidays.map(h => (
                            <div key={h.id} className={styles.holidayItem}>
                                <div className={styles.holidayDate}>
                                    <span className={styles.holidayDay}>{new Date(h.date).getDate()}</span>
                                    <span className={styles.holidayMonth}>{new Date(h.date).toLocaleString('default', { month: 'short' })}</span>
                                </div>
                                <div>
                                    <h4 className={styles.holidayName}>{h.name}</h4>
                                    <span className={styles.holidayType}>{h.type}</span>
                                </div>
                            </div>
                        ))}
                        {holidays.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No holidays found.</p>}
                    </div>
                )}

                {/* Action Modal */}
                {isActionModalOpen && actionData && (
                    <div className={styles.modalOverlay} onClick={() => setIsActionModalOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginTop: 0 }}>Confirm {actionData.type === 'approved' ? 'Approval' : 'Rejection'}</h2>
                            <p>Are you sure you want to {actionData.type} this request?</p>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Admin Note (Optional)</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={3}
                                    value={adminNote}
                                    onChange={e => setAdminNote(e.target.value)}
                                    placeholder={actionData.type === 'rejected' ? "Reason for rejection..." : "Add a note..."}
                                />
                            </div>

                            <div className={styles.modalActions}>
                                <button onClick={() => setIsActionModalOpen(false)} className={`${styles.modalBtn} ${styles.cancelBtn}`}>Cancel</button>
                                <button
                                    onClick={confirmAction}
                                    className={`${styles.modalBtn} ${actionData.type === 'approved' ? styles.primaryBtn : styles.rejectBtn}`}
                                    style={{ background: actionData.type === 'rejected' ? '#ef4444' : 'var(--primary)', color: 'white' }}
                                >
                                    Confirm {actionData.type === 'approved' ? 'Approve' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Apply Leave Modal */}
                {isApplyOpen && (
                    <div className={styles.modalOverlay} onClick={() => setIsApplyOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginTop: 0 }}>Apply for Leave</h2>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Leave Type</label>
                                <select className={styles.select} value={newLeave.type} onChange={e => setNewLeave({ ...newLeave, type: e.target.value })}>
                                    <option value="">Select Type</option>
                                    {policies.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Start Date</label>
                                    <input type="date" className={styles.input} value={newLeave.start} onChange={e => setNewLeave({ ...newLeave, start: e.target.value })} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>End Date</label>
                                    <input type="date" className={styles.input} value={newLeave.end} onChange={e => setNewLeave({ ...newLeave, end: e.target.value })} />
                                </div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Reason</label>
                                <textarea className={styles.textarea} rows={3} value={newLeave.reason} onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })} placeholder="Why are you taking leave?" />
                            </div>
                            <div className={styles.modalActions}>
                                <button onClick={() => setIsApplyOpen(false)} className={`${styles.modalBtn} ${styles.cancelBtn}`}>Cancel</button>
                                <button onClick={handleApplyLeave} className={`${styles.modalBtn} ${styles.primaryBtn}`} disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
