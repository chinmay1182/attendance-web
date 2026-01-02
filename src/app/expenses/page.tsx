"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

type Expense = {
    id: string;
    title: string;
    amount: number;
    date: string;
    status: string;
    created_at: string;
};

import styles from './expenses.module.css';

export default function ExpensesPage() {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) fetchExpenses();
    }, [user]);

    const fetchExpenses = async () => {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user?.uid)
            .order('created_at', { ascending: false });
        if (data) setExpenses(data);
    };

    const handleSubmit = async () => {
        if (!title || !amount || !date) return toast.error("Please fill all details");
        setLoading(true);

        const { error } = await supabase.from('expenses').insert([
            { user_id: user?.uid, title, amount: parseFloat(amount), date, status: 'Pending' }
        ]);

        if (error) {
            console.error(error);
            toast.error("Failed to submit expense");
        } else {
            toast.success("Expense submitted!");
            setTitle('');
            setAmount('');
            setDate('');
            fetchExpenses();
        }
        setLoading(false);
    };

    const getStatusClass = (status: string) => {
        if (status === 'Approved') return styles.statusApproved;
        if (status === 'Rejected') return styles.statusRejected;
        return styles.statusPending;
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>My Expenses</h1>
                <div className={styles.formCard}>
                    <h3 className={styles.subtitle}>New Claim</h3>
                    <div className={styles.grid}>
                        <input
                            type="text"
                            placeholder="Expense Title (e.g. Travel)"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={styles.input}
                        />
                        <input
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={styles.input}
                        />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={styles.input}
                        />
                        <div className={styles.uploadBox}>
                            Upload Receipt (Image/PDF)
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={styles.submitBtn}
                    >
                        {loading ? 'Submitting...' : 'Submit Claim'}
                    </button>
                </div>

                <div className={styles.historyCard}>
                    <h3 className={styles.historyTitle}>History</h3>
                    {expenses.length === 0 && <p className={styles.emptyState}>No expense claims yet.</p>}
                    {expenses.map(expense => (
                        <div key={expense.id} className={styles.historyItem}>
                            <div>
                                <h4 className={styles.expenseTitle}>{expense.title}</h4>
                                <p className={styles.expenseDate}>{expense.date}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className={styles.expenseAmount}>${expense.amount.toFixed(2)}</div>
                                <div className={`${styles.statusBadge} ${getStatusClass(expense.status)}`}>
                                    {expense.status}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
