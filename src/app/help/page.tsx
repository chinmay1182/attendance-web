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
};

const FAQ_SMT = [
    { q: 'What is the SMT (Sales Management Tool)?', a: 'SMT is a module within BizKit designed to help your sales team track leads, manage pipelines, and monitor deal progress in real time.' },
    { q: 'How do I add a new lead in SMT?', a: 'Navigate to BizKit SMT, click "New Lead", fill in the contact details and pipeline stage, then click Save.' },
    { q: 'Can I export SMT reports?', a: 'Yes. Go to Reports inside SMT, select a date range, and use the Export button to download a CSV or PDF.' },
    { q: 'Who can access SMT?', a: 'SMT access is role-based. Admins can configure team access under Settings → SMT Permissions.' },
];

const FAQ_BILLING = [
    { q: 'How do I view my current subscription plan?', a: 'Go to BizKit Billing → Subscription tab to see your active plan, renewal date, and usage limits.' },
    { q: 'How do I update my payment method?', a: 'In BizKit Billing, click "Payment Methods" and then "Add New Card" or remove an existing card.' },
    { q: 'What happens if my payment fails?', a: 'You will receive an email notification. Your account will remain active for a grace period of 7 days, after which access may be restricted.' },
    { q: 'Can I get an invoice for my payments?', a: 'Yes. Go to Billing → Invoices to view and download all invoices.' },
    { q: 'How do I cancel my subscription?', a: 'Contact support@consolegal.com with subject "Subscription Cancellation Request" at least 5 business days before the renewal date.' },
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
    const [category, setCategory] = useState('IT Support');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeFaqSection, setActiveFaqSection] = useState<'smt' | 'billing'>('smt');

    // Modal & Action State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
    const [newNote, setNewNote] = useState('');

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
                            setTickets(prev => [newTicket, ...prev]);
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
        // FIX #7: Always filter by user_id for non-admins to prevent unrelated data
        let query = supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (profile?.role !== 'admin') {
            query = query.eq('user_id', user?.id);
        }

        const { data } = await query;
        if (data) setTickets(data);
    };

    const handleSubmit = async () => {
        if (!description) return toast.error("Please enter a description");
        if (!subject) return toast.error("Please enter a subject");
        setLoading(true);

        const { error } = await supabase.from('tickets').insert([
            { user_id: user?.id, category, subject, description, status: 'Open' }
        ]);

        if (error) {
            console.error(error);
            toast.error("Failed to submit ticket");
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
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.title}>Help & Support</h1>
                    <button className={styles.raiseTicketBtn} onClick={() => { setIsCreateOpen(true); setActiveTab('tickets'); }}>
                        <span className="material-symbols-outlined">confirmation_number</span>
                        Raise a Ticket
                    </button>
                </div>

                {/* Tabs */}
                <div className={styles.tabBar}>
                    <button className={`${styles.tabBtn} ${activeTab === 'faq' ? styles.tabActive : ''}`} onClick={() => setActiveTab('faq')}>
                        <span className="material-symbols-outlined">quiz</span> FAQ
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'tickets' ? styles.tabActive : ''}`} onClick={() => { setActiveTab('tickets'); fetchTickets(); }}>
                        <span className="material-symbols-outlined">confirmation_number</span> My Tickets {tickets.filter(t => t.status === 'Open').length > 0 && <span className={styles.badge}>{tickets.filter(t => t.status === 'Open').length}</span>}
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'contact' ? styles.tabActive : ''}`} onClick={() => setActiveTab('contact')}>
                        <span className="material-symbols-outlined">contact_support</span> Contact Us
                    </button>
                </div>

                {/* FAQ Tab */}
                {activeTab === 'faq' && (
                    <div>
                        <div className={styles.faqSectionTabs}>
                            <button
                                className={`${styles.faqSectionTab} ${activeFaqSection === 'smt' ? styles.faqSectionActive : ''}`}
                                onClick={() => setActiveFaqSection('smt')}
                            >
                                SMT — Sales Management Tool
                            </button>
                            <button
                                className={`${styles.faqSectionTab} ${activeFaqSection === 'billing' ? styles.faqSectionActive : ''}`}
                                onClick={() => setActiveFaqSection('billing')}
                            >
                                Billing & Subscriptions
                            </button>
                        </div>

                        <div className={styles.faqList}>
                            {(activeFaqSection === 'smt' ? FAQ_SMT : FAQ_BILLING).map((item, i) => (
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
                                        <span className={styles.ticketCategory}>{ticket.category}</span>
                                        {profile?.role === 'admin' && (
                                            <span style={{
                                                fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px',
                                                background: '#e0f2fe', color: '#0369a1', marginLeft: 'auto', marginRight: '8px'
                                            }}>
                                                User: {ticket.user_id?.slice(0, 8)}...
                                            </span>
                                        )}
                                        <div className={styles.actions}>
                                            <select
                                                className={styles.statusSelect}
                                                value={ticket.status}
                                                data-status={ticket.status}
                                                onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={profile?.role !== 'admin' && ticket.user_id !== user?.id}
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
                            <label className={styles.label}>Category</label>
                            <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
                                <option>IT Support</option>
                                <option>HR Query</option>
                                <option>SMT Issue</option>
                                <option>Billing Query</option>
                                <option>Account Access</option>
                                <option>Other</option>
                            </select>
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
                            <span className="material-symbols-outlined">send</span>
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
                                <label className={styles.label}>Category</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className={styles.select}>
                                    <option>IT Support</option>
                                    <option>HR Query</option>
                                    <option>SMT Issue</option>
                                    <option>Billing Query</option>
                                    <option>Account Access</option>
                                    <option>Other</option>
                                </select>
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
        </>
    );
}
