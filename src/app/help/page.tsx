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
};

export default function HelpPage() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [category, setCategory] = useState('IT Support');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchTickets();

            const channel = supabase.channel('my_tickets')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'tickets', filter: `user_id=eq.${user.uid}` },
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
            .eq('user_id', user?.uid)
            .order('created_at', { ascending: false });
        if (data) setTickets(data);
    };

    const handleSubmit = async () => {
        if (!description) return toast.error("Please enter a description");
        setLoading(true);

        const { error } = await supabase.from('tickets').insert([
            { user_id: user?.uid, category, description, status: 'Open' }
        ]);

        if (error) {
            console.error(error);
            toast.error("Failed to submit ticket");
        } else {
            toast.success("Ticket submitted successfully!");
            setDescription('');
            fetchTickets();
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

                <div className={styles.formCard}>
                    <h3 className={styles.sectionTitle}>Raise a New Ticket</h3>
                    <div className={styles.formContent}>
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
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your issue..."
                            className={styles.textarea}
                        ></textarea>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={styles.submitBtn}
                        >
                            {loading ? 'Submitting...' : 'Submit Ticket'}
                        </button>
                    </div>
                </div>

                <h3 className={styles.subTitle}>My Previous Tickets</h3>
                <div className={styles.ticketsList}>
                    {tickets.length === 0 && <p className={styles.emptyState}>No tickets raised yet.</p>}
                    {tickets.map(ticket => (
                        <div key={ticket.id} className={styles.ticketCard}>
                            <div className={styles.ticketHeader}>
                                <span className={styles.ticketCategory}>{ticket.category}</span>
                                <span className={`${styles.ticketStatus} ${getStatusClass(ticket.status)}`}>
                                    {ticket.status}
                                </span>
                            </div>
                            <p className={styles.ticketDesc}>{ticket.description}</p>
                            <p className={styles.ticketDate}>Created on {new Date(ticket.created_at).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
