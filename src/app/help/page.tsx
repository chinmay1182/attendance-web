"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './help.module.css';
import toast from 'react-hot-toast';

type Ticket = {
    id: string;
    category: string;
    subject: string;
    description: string;
    status: string;
    created_at: string;
    notes?: string;
    user_id: string;
    target_type?: string;
    users?: { name: string, email: string } | { name: string, email: string }[];
};



const FAQ_ATTENDANCE = [
    { q: 'How do I mark my attendance?', a: 'Navigate to the Dashboard or "My Site" section, and click on "Start Verified Check-in". You will need to allow location and camera access.' },
    { q: 'What if I forget to check out?', a: 'If you forget to check out, please contact your HR or Manager immediately so they can manually update your records.' },
    { q: 'Why is my location showing "Too Far"?', a: 'This happens if you are outside the designated radius for your assigned site. Ensure you are physically at the site and your GPS is enabled with high accuracy.' },
    { q: 'How can I see my past attendance records?', a: 'Go to the "Attendance" section from the sidebar to view your history, including check-in/out times and locations.' },
    { q: 'Can I mark attendance without internet?', a: 'No, an active internet connection is required to sync your location and photo with the server for verification.' },
];


type FaqItemProps = { q: string; a: string };
function FaqItem({ q, a }: FaqItemProps) {
    const [open, setOpen] = useState(false);
    return (
        <div className={styles.faqItem} onClick={() => setOpen(!open)}>
            <div className={styles.faqQuestion}>
                <span>{q}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>
            </div>
            {open && <div className={styles.faqAnswer}>{a}</div>}
        </div>
    );
}

export default function HelpPage() {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'faq' | 'tickets' | 'contact'>('faq');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [targetType, setTargetType] = useState<'admin' | 'system'>('admin');
    const [subject, setSubject] = useState('');

    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);


    // Modal & Action State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        if (profile?.role === 'admin' || profile?.role === 'hr') {
            setTargetType('system');
        } else {
            setTargetType('admin');
        }
    }, [profile?.role]);

    useEffect(() => {
        if (user) {
            fetchTickets();

            // Realtime Subscription - only for relevant tickets
            const channel = supabase.channel('my_tickets')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'tickets' },
                    (payload: any) => {
                        const newTicket = payload.new as any;
                        const oldTicket = payload.old as any;

                        // Check relevance: Admin sees all, User sees own
                        let isRelevant = false;
                        if (profile?.role === 'admin') isRelevant = true;
                        if (newTicket?.user_id === user.id) isRelevant = true;
                        if (oldTicket?.user_id === user.id) isRelevant = true;

                        if (!isRelevant) return;

                        if (payload.eventType === 'INSERT') {
                            setTickets(prev => {
                                if (prev.some(t => t.id === newTicket.id)) return prev;
                                return [newTicket, ...prev];
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            setTickets(prev => prev.map(t => t.id === newTicket.id ? newTicket : t));
                        }

                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [user, profile]);

    const fetchTickets = async () => {
        if (!user || !profile) return;
        
        console.log("Fetching tickets for role:", profile.role, "Company:", profile.company_id);

        let query = supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (profile.role === 'admin' || profile.role === 'hr') {
            if (profile.company_id) {
                query = query.eq('company_id', profile.company_id);
            } else {
                query = query.eq('user_id', user.id);
            }
        } else {
            query = query.eq('user_id', user.id);
        }

        const { data: rawTicketsData, error: ticketsError } = await query;

        let ticketsData = rawTicketsData;
        if (ticketsData && (profile.role === 'admin' || profile.role === 'hr') && profile.company_id) {
            ticketsData = ticketsData.filter(t => t.user_id === user.id || t.target_type === 'admin');
        }
        
        if (ticketsError) {
            console.error("Fetch Tickets Error:", ticketsError);
            return toast.error("Failed to fetch tickets: " + ticketsError.message);
        }

        if (ticketsData && ticketsData.length > 0) {
            // Fetch user names manually to avoid join errors
            const userIds = Array.from(new Set(ticketsData.map(t => t.user_id)));
            const { data: usersData } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', userIds);

            const usersMap = (usersData || []).reduce((acc: any, u) => {
                acc[u.id] = u;
                return acc;
            }, {});

            const mappedTickets = ticketsData.map(t => ({
                ...t,
                users: usersMap[t.user_id] || { name: 'Unknown User', email: '' }
            }));

            console.log("Mapped Tickets Data:", mappedTickets);
            setTickets(mappedTickets);
        } else {
            setTickets([]);
        }
    };






    const handleSubmit = async () => {
        if (!description) return toast.error("Please enter a description");
        if (!subject) return toast.error("Please enter a subject");
        setLoading(true);

        const { error } = await supabase.from('tickets').insert([
            { 
                user_id: user?.id, 
                category: targetType === 'admin' ? 'Admin Support' : 'BizKit Developer Support',
                target_type: targetType,
                company_id: profile?.company_id,
                subject, 
                description, 
                status: 'Open' 
            }
        ]);


        if (error) {
            console.error("Ticket Submission Error Detail:", error);
            toast.error(`Failed to submit ticket: ${error.message || "Unknown error"}`);
        } else {

            toast.success("Ticket submitted successfully!");
            setDescription('');
            setSubject('');
            setIsCreateOpen(false);
            fetchTickets();
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

        const { error } = await supabase
            .from('tickets')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            toast.error("Failed to update status");
            fetchTickets();
        } else {
            toast.success(`Status updated to ${newStatus}`);
        }
    };

    const openNotesModal = (ticket: Ticket) => {
        setCurrentTicket(ticket);
        setNewNote('');
        setIsNotesOpen(true);
    };

    const handleSaveNote = async () => {
        if (!currentTicket || !newNote.trim()) return;
        setLoading(true);

        const timestamp = new Date().toLocaleString();
        const existingNotes = currentTicket.notes || '';
        const updatedNotes = existingNotes
            ? `${existingNotes}\n\n[${timestamp}] ${newNote}`
            : `[${timestamp}] ${newNote}`;

        const { error } = await supabase
            .from('tickets')
            .update({ notes: updatedNotes })
            .eq('id', currentTicket.id);

        if (error) {
            toast.error("Failed to save note");
        } else {
            toast.success("Note added");
            setTickets(prev => prev.map(t => t.id === currentTicket.id ? { ...t, notes: updatedNotes } : t));
            setCurrentTicket(prev => prev ? { ...prev, notes: updatedNotes } : null);
            setNewNote('');
        }
        setLoading(false);
    };

    return (
        <>
            <Navbar />
            <div className="help-page-content">
                <div className={styles.container}>

                <div className={styles.pageHeader}>
                    <h1 className={styles.title}>Help & Support</h1>
                    <button className={styles.raiseTicketBtn} onClick={() => { setIsCreateOpen(true); setActiveTab('tickets'); }}>
                        Raise a Ticket
                    </button>

                </div>

                {/* Tabs */}
                <div className={styles.tabBar}>
                    <button className={`${styles.tabBtn} ${activeTab === 'faq' ? styles.tabActive : ''}`} onClick={() => setActiveTab('faq')}>
                        <span className="material-symbols-outlined">quiz</span> FAQ
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'tickets' ? styles.tabActive : ''}`} onClick={() => { setActiveTab('tickets'); fetchTickets(); }}>
                        <span className="material-symbols-outlined">inbox</span> My Tickets {tickets.filter(t => t.status === 'Open').length > 0 && <span className={styles.badge}>{tickets.filter(t => t.status === 'Open').length}</span>}
                    </button>

                    <button className={`${styles.tabBtn} ${activeTab === 'contact' ? styles.tabActive : ''}`} onClick={() => setActiveTab('contact')}>
                        Contact Us
                    </button>

                </div>

                {/* FAQ Tab */}
                {activeTab === 'faq' && (
                    <div>
                        <div className={styles.faqList}>
                            {FAQ_ATTENDANCE.map((item, i) => (
                                <FaqItem key={i} q={item.q} a={item.a} />
                            ))}
                        </div>


                        <div className={styles.faqFooter}>
                            <span className="material-symbols-outlined">help_outline</span>
                            <p>Can&apos;t find what you&apos;re looking for? <button className={styles.linkBtn} onClick={() => setIsCreateOpen(true)}>Raise a support ticket</button> and our team will respond within 24 hours.</p>
                        </div>
                    </div>
                )}

                {/* Tickets Tab */}
                {activeTab === 'tickets' && (
                    <div>
                        <div className={styles.ticketsList}>
                            {tickets.length === 0 && (
                                <div className={styles.emptyState}>
                                    <span className="material-symbols-outlined">inbox</span>
                                    <p>No tickets found. Click <strong>Raise a Ticket</strong> to create one.</p>
                                </div>
                            )}
                            {tickets.map(ticket => (
                                <div key={ticket.id} className={styles.ticketCard}>
                                    <div className={styles.ticketHeader}>
                                        <span className={styles.ticketCategory}>
                                            {(ticket as any).target_type === 'system' ? 'BizKit Support' : 'Admin Support'}
                                        </span>


                                        {profile?.role === 'admin' && (
                                            <span style={{
                                                fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px',
                                                background: '#e0f2fe', color: '#0369a1', marginLeft: 'auto', marginRight: '8px'
                                            }}>
                                                By: {(() => {
                                                    const userData = (ticket as any).users;
                                                    if (Array.isArray(userData)) return userData[0]?.name || 'Unknown';
                                                    return userData?.name || 'Unknown';
                                                })()}
                                            </span>
                                        )}



                                        <div className={styles.actions}>
                                            {profile?.role === 'admin' && ticket.target_type === 'admin' ? (
                                                <>
                                                    <select
                                                        className={styles.statusSelect}
                                                        value={ticket.status}
                                                        data-status={ticket.status}
                                                        onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="Open">Open</option>
                                                        <option value="In Progress">In Progress</option>
                                                        <option value="Resolved">Resolved</option>
                                                        <option value="Closed">Closed</option>
                                                        <option value="Dropped">Dropped</option>
                                                    </select>
                                                    <button
                                                        className={styles.iconBtn}
                                                        onClick={() => openNotesModal(ticket)}
                                                        title="View/Add Notes"
                                                    >
                                                        <span className="material-symbols-outlined">description</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={styles.statusBadge} data-status={ticket.status}>
                                                    {ticket.status}
                                                </span>
                                            )}
                                        </div>

                                    </div>
                                    {ticket.subject && <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{ticket.subject}</p>}
                                    <p className={styles.ticketDesc}>{ticket.description}</p>
                                    <p className={styles.ticketDate}>Created on {new Date(ticket.created_at).toLocaleDateString()} • ID: {ticket.id.slice(0, 8)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contact Tab */}
                {activeTab === 'contact' && (
                    <div className={styles.contactCard}>
                        <h2 style={{ marginTop: 0 }}>Get in Touch</h2>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>Fill in the form below and we&apos;ll get back to you within 1 business day.</p>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Where to send?</label>
                            {profile?.role === 'admin' ? (
                                <select className={styles.select} value={targetType} onChange={e => { setTargetType(e.target.value as any); }}>
                                    <option value="system">Account Related Issues (to BizKit)</option>
                                    <option value="system">Others (to BizKit by ConsoLegal)</option>
                                </select>
                            ) : (
                                <select className={styles.select} value={targetType} onChange={e => setTargetType(e.target.value as any)}>
                                    <option value="admin">Admin (Company Support)</option>
                                    <option value="system">BizKit (Developer Support)</option>
                                </select>
                            )}



                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Subject</label>
                            <input
                                className={styles.input}
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="Brief summary of your issue"
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Describe your issue in detail..."
                                rows={5}
                            />
                        </div>
                        <button onClick={handleSubmit} disabled={loading} className={styles.primaryBtn}>
                            {loading ? 'Submitting...' : 'Submit & Create Ticket'}
                        </button>

                    </div>
                )}

                {/* Create Ticket Modal */}
                {isCreateOpen && (
                    <div className={styles.modalOverlay} onClick={() => setIsCreateOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeBtn} onClick={() => setIsCreateOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Raise New Ticket</h3>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Where to send?</label>
                                {profile?.role === 'admin' ? (
                                    <select value={targetType} onChange={(e) => setTargetType(e.target.value as any)} className={styles.select}>
                                        <option value="system">Account Related Issues (to BizKit)</option>
                                        <option value="system">Others (to BizKit by ConsoLegal)</option>
                                    </select>
                                ) : (
                                    <select value={targetType} onChange={(e) => setTargetType(e.target.value as any)} className={styles.select}>
                                        <option value="admin">Admin (Company Support)</option>
                                        <option value="system">BizKit (Developer Support)</option>
                                    </select>
                                )}



                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Subject</label>
                                <input
                                    className={styles.input}
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="Brief summary..."
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe your issue..."
                                    className={styles.textarea}
                                    rows={4}
                                ></textarea>
                            </div>
                            <button onClick={handleSubmit} disabled={loading} className={styles.primaryBtn}>
                                {loading ? 'Submitting...' : 'Submit Ticket'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Notes Modal */}
                {isNotesOpen && currentTicket && (
                    <div className={styles.modalOverlay} onClick={() => setIsNotesOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeBtn} onClick={() => setIsNotesOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Ticket Notes</h3>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '24px' }}>
                                Reference ID: {currentTicket.id.slice(0, 8)}
                            </p>

                            <div className={styles.notesList}>
                                {currentTicket.notes ? (
                                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                        {currentTicket.notes}
                                    </div>
                                ) : (
                                    <p style={{ color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>No notes yet.</p>
                                )}
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Add Note</label>
                                <textarea
                                    className={styles.textarea}
                                    style={{ minHeight: '80px' }}
                                    placeholder="Type a new note here..."
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                />
                            </div>

                            <button onClick={handleSaveNote} className={styles.primaryBtn} disabled={loading}>
                                {loading ? 'Saving...' : 'Add Note'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </>
    );
}

