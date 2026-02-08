"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './notices.module.css';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

type Notice = {
    id: string;
    title: string;
    content: string;
    type: string;
    priority?: string;
    audience?: string;
    target_id?: string;
    sender_id?: string;
    created_at: string;
    sender_name?: string;
};

type UserOption = {
    id: string;
    name: string;
    email: string;
    role: string;
};

export default function NoticesPage() {
    const { user, profile } = useAuth();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [usersList, setUsersList] = useState<UserOption[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState('normal');
    const [audience, setAudience] = useState('all');
    const [targetId, setTargetId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isAdminOrHr = profile?.role === 'admin' || profile?.role === 'hr';

    useEffect(() => {
        if (user && profile) {
            fetchNotices();
            setupRealtime();
            if (isAdminOrHr) fetchUsers();
        }
    }, [user, profile]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, name, email, role');
        if (data) setUsersList(data);
    };

    const fetchNotices = async () => {
        try {
            const res = await fetch('/api/notices', { cache: 'no-store' });
            const data = await res.json();

            if (data && profile) {
                const myNotices = data.filter((n: any) => {
                    if (isAdminOrHr) return true; // Admins see all for management context

                    if (!n.audience || n.audience === 'all') return true;
                    if (n.audience === 'role' && n.target_id === profile.role) return true;
                    if (n.audience === 'user' && n.target_id === user?.id) return true;
                    if (n.sender_id === user?.id) return true;
                    return false;
                }).map((n: any) => ({
                    ...n,
                    sender_name: n.sender?.name || 'Admin'
                }));

                setNotices(myNotices);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const setupRealtime = () => {
        const channel = supabase
            .channel('public:notices')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notices' },
                (payload) => {
                    const newNotice = payload.new as Notice;
                    let relevant = false;
                    if (newNotice.audience === 'all') relevant = true;
                    if (newNotice.audience === 'role' && newNotice.target_id === profile?.role) relevant = true;
                    if (newNotice.audience === 'user' && newNotice.target_id === user?.id) relevant = true;

                    if (relevant || isAdminOrHr) {
                        toast('New Notification: ' + newNotice.title, { icon: '🔔' });
                        fetchNotices();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSubmit = async () => {
        if (!title || !content) {
            toast.error("Please fill title and content");
            return;
        }
        if (audience === 'user' && !targetId) {
            toast.error("Please select a user");
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('notices').insert({
                title,
                content,
                priority,
                audience,
                target_id: audience === 'all' ? null : targetId,
                sender_id: user?.id, // Using Firebase UID
                type: 'General'
            });

            if (error) throw error;

            toast.success("Notification sent successfully!");
            setTitle('');
            setContent('');
            setPriority('normal');
            setAudience('all');
            setTargetId('');
            setIsModalOpen(false); // Close modal
            fetchNotices();
        } catch (err) {
            console.error(err);
            toast.error("Failed to send notification");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Navbar />
            <Toaster position="top-right" />
            <div className={styles.container}>
                <h1 className={styles.title}>Notice Board</h1>

                <div className={styles.noticesList}>
                    {notices.length === 0 && <p className={styles.emptyState}>No notifications to display.</p>}
                    {notices.map((notice) => (
                        <div key={notice.id} className={`${styles.noticeCard} ${styles[`priority${notice.priority || 'normal'}`]}`}>
                            <div className={styles.header}>
                                <div className={styles.senderInfo}>
                                    <span className={`material-symbols-outlined`}>
                                        {notice.priority === 'urgent' ? 'campaign' : 'notifications'}
                                    </span>
                                    <span>{notice.sender_name || 'System'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {notice.priority === 'urgent' && <span className={`${styles.badge} ${styles.badgeUrgent}`}>Urgent</span>}
                                    <span className={styles.date}>{new Date(notice.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                            <h3 className={styles.noticeTitle}>{notice.title}</h3>
                            <p className={styles.content}>{notice.content}</p>

                            {isAdminOrHr && (notice.audience !== 'all') && (
                                <div className={styles.targetInfo}>
                                    Target: {notice.audience === 'role' ? `Role: ${notice.target_id}` : `User: ${usersList.find(u => u.id === notice.target_id)?.name || 'Unknown'}`}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* FAB for Admins/HR */}
                {isAdminOrHr && (
                    <button className={styles.fab} onClick={() => setIsModalOpen(true)} aria-label="Send Notification">
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                )}
            </div>

            {/* Compose Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Compose Notification</h2>

                        <div className={styles.grid}>
                            <div className={styles.row}>
                                <div>
                                    <label className={styles.label}>Title</label>
                                    <input
                                        className={styles.input}
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Brief title..."
                                    />
                                </div>
                                <div>
                                    <label className={styles.label}>Priority</label>
                                    <select className={styles.select} value={priority} onChange={e => setPriority(e.target.value)}>
                                        <option value="low">Low Info</option>
                                        <option value="normal">Normal</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={styles.label}>Message</label>
                                <textarea
                                    className={styles.textarea}
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Type your message here..."
                                />
                            </div>

                            <div>
                                <label className={styles.label}>Target Audience</label>
                                <select className={styles.select} value={audience} onChange={e => setAudience(e.target.value)}>
                                    <option value="all">Every Employee</option>
                                    <option value="role">Specific Role</option>
                                    <option value="user">Specific Employee</option>
                                </select>
                            </div>

                            {audience === 'role' && (
                                <div>
                                    <label className={styles.label}>Select Role</label>
                                    <select className={styles.select} value={targetId} onChange={e => setTargetId(e.target.value)}>
                                        <option value="">-- Choose Role --</option>
                                        <option value="admin">Admin</option>
                                        <option value="hr">HR</option>
                                        <option value="employee">Employee</option>
                                    </select>
                                </div>
                            )}

                            {audience === 'user' && (
                                <div>
                                    <label className={styles.label}>Select Employee</label>
                                    <select className={styles.select} value={targetId} onChange={e => setTargetId(e.target.value)}>
                                        <option value="">-- Choose User --</option>
                                        {usersList.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className={styles.modalActions}>
                            <button className={`${styles.modalBtn} ${styles.cancelBtn}`} onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </button>
                            <button className={`${styles.modalBtn} ${styles.primaryBtn}`} onClick={handleSubmit} disabled={submitting}>
                                {submitting ? 'Sending...' : 'Send Notification'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
