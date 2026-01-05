"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './notices.module.css';
import toast from 'react-hot-toast';

type Notice = {
    id: string;
    title: string;
    content: string;
    type: string; // Used for old notices compatibility
    priority?: string; // urgent, normal, low
    audience?: string; // all, role, user
    target_id?: string;
    sender_id?: string;
    created_at: string;
    sender_name?: string; // Joined
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
    const [activeTab, setActiveTab] = useState<'inbox' | 'manage'>('inbox');
    const [usersList, setUsersList] = useState<UserOption[]>([]);

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
        let query = supabase
            .from('notices')
            .select(`
                *,
                sender:users!sender_id(name)
            `)
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (data && profile) {
            // Filter locally for complex logic OR we can rely on RLS if set up.
            // Client-side filtering for now to ensure visibility rules
            const myNotices = data.filter((n: any) => {
                if (isAdminOrHr && activeTab === 'manage') return true; // See all if managing (optional)

                // Normal Filter
                if (!n.audience || n.audience === 'all') return true;
                if (n.audience === 'role' && n.target_id === profile.role) return true;
                if (n.audience === 'user' && n.target_id === user?.uid) return true; // check if user.uid matches target_id used in storage (Firebase UID)

                // If I sent it, I should see it?
                if (n.sender_id === user?.uid) return true;

                return false;
            }).map((n: any) => ({
                ...n,
                sender_name: n.sender?.name || 'Admin'
            }));

            setNotices(myNotices);
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
                    // Simple check if it applies to me
                    let relevant = false;
                    if (newNotice.audience === 'all') relevant = true;
                    if (newNotice.audience === 'role' && newNotice.target_id === profile?.role) relevant = true;
                    if (newNotice.audience === 'user' && newNotice.target_id === user?.uid) relevant = true;

                    if (relevant) {
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
                sender_id: user?.uid, // Using Firebase UID
                type: 'General' // Default for legacy col
            });

            if (error) throw error;

            toast.success("Notification sent successfully!");
            setTitle('');
            setContent('');
            setPriority('normal');
            setAudience('all');
            setTargetId('');
            fetchNotices(); // Refresh to see sent item
            if (activeTab === 'manage') setActiveTab('inbox'); // Switch to view it
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
            <div className={styles.container}>
                <h1 className={styles.title}>
                    {activeTab === 'manage' ? 'Notification Manager' : 'Notice Board'}
                </h1>

                {isAdminOrHr && (
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'inbox' ? styles.active : ''}`}
                            onClick={() => setActiveTab('inbox')}
                        >
                            Inbox
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'manage' ? styles.active : ''}`}
                            onClick={() => setActiveTab('manage')}
                        >
                            Send Notification
                        </button>
                    </div>
                )}

                {activeTab === 'manage' && isAdminOrHr && (
                    <div className={styles.createCard}>
                        <h3 className={styles.label} style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Compose New Notification</h3>
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
                        <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Sending...' : 'Send Notification'}
                        </button>
                    </div>
                )}

                {activeTab === 'inbox' && (
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
                )}
            </div>
        </>
    );
}
