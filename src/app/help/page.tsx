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
    description: string;
    status: string;
    created_at: string;
    notes?: string;
};

export default function HelpPage() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [category, setCategory] = useState('IT Support');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal & Action State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        if (user) {
            fetchTickets();

            const channel = supabase.channel('my_tickets')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'tickets', filter: `user_id=eq.${user.id}` },
                    (payload: any) => {
                        if (payload.eventType === 'INSERT') {
                            setTickets(prev => [payload.new, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
                            import('react-hot-toast').then(({ default: toast }) => {
                                toast('🎫 Ticket Status Updated: ' + payload.new.status);
                            });
                        }
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [user]);

    const fetchTickets = async () => {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });
        if (data) setTickets(data);
    };

    const handleSubmit = async () => {
        if (!description) return toast.error("Please enter a description");
        setLoading(true);

        const { error } = await supabase.from('tickets').insert([
            { user_id: user?.id, category, description, status: 'Open' }
        ]);

        if (error) {
            console.error(error);
            toast.error("Failed to submit ticket");
        } else {
            toast.success("Ticket submitted successfully!");
            setDescription('');
            setIsCreateOpen(false);
            fetchTickets();
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        // Optimistic update
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

        const { error } = await supabase
            .from('tickets')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            toast.error("Failed to update status");
            fetchTickets(); // Revert on error
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
        // Format: [Date] Note content
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
            // Update local state
            setTickets(prev => prev.map(t => t.id === currentTicket.id ? { ...t, notes: updatedNotes } : t));
            setCurrentTicket(prev => prev ? { ...prev, notes: updatedNotes } : null);
            setNewNote('');
        }
        setLoading(false);
    };

    const getStatusClass = (status: string) => {
        switch (status.toLowerCase()) {
            case 'open': return styles.statusOpen;
            case 'resolved': return styles.statusResolved;
            default: return styles.statusPending;
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Help Desk</h1>

                <div className={styles.ticketsList}>
                    {tickets.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            No tickets found. Click the + button to raise one.
                        </div>
                    )}
                    {tickets.map(ticket => (
                        <div key={ticket.id} className={styles.ticketCard}>
                            <div className={styles.ticketHeader}>
                                <span className={styles.ticketCategory}>{ticket.category}</span>
                                <div className={styles.actions}>
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
                                </div>
                            </div>
                            <p className={styles.ticketDesc}>{ticket.description}</p>
                            <p className={styles.ticketDate}>Created on {new Date(ticket.created_at).toLocaleDateString()} • ID: {ticket.id.slice(0, 8)}</p>
                        </div>
                    ))}
                </div>

                {/* FAB */}
                <button className={styles.fab} onClick={() => setIsCreateOpen(true)}>
                    <span className="material-symbols-outlined">add</span>
                </button>

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
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className={styles.select}
                                >
                                    <option>IT Support</option>
                                    <option>HR Query</option>
                                    <option>Payroll Issue</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe your issue..."
                                    className={styles.textarea}
                                ></textarea>
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={styles.primaryBtn}
                            >
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
