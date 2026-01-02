"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './leave-policy.module.css';
import toast from 'react-hot-toast';

type LeavePolicy = {
    id: string;
    name: string;
    days_per_year: number;
    description: string;
};

export default function LeavePolicyPage() {
    const [policies, setPolicies] = useState<LeavePolicy[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('leave_policies')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching policies:', error);
            // Fallback
            setPolicies([
                { id: '1', name: 'Casual Leave (CL)', days_per_year: 12, description: 'Allocated monthly.' },
                { id: '2', name: 'Sick Leave (SL)', days_per_year: 10, description: 'Medical emergencies.' },
                { id: '3', name: 'Earned Leave (EL)', days_per_year: 15, description: 'Can be carried forward.' }
            ]);
        } else {
            setPolicies(data || []);
        }
        setLoading(false);
    };

    const handleAddPolicy = async () => {
        // ideally use a modal, but for speed using prompts
        const name = prompt("Policy Name (e.g. Parental Leave):");
        if (!name) return;
        const days = prompt("Days per year:");
        if (!days) return;
        const description = prompt("Short description:");

        const { error } = await supabase
            .from('leave_policies')
            .insert([{
                name,
                days_per_year: parseInt(days),
                description: description || ''
            }]);

        if (error) {
            toast.error("Failed to add policy");
            console.error(error);
        } else {
            toast.success("Policy added");
            fetchPolicies();
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Leave Policies</h1>
                <div className={styles.card}>
                    {policies.map((policy) => (
                        <div key={policy.id} className={styles.policyItem}>
                            <div className={styles.header}>
                                <h3 className={styles.policyName}>{policy.name}</h3>
                                <span className={styles.allocation}>{policy.days_per_year} Days / Year</span>
                            </div>
                            <p className={styles.description}>
                                {policy.description}
                            </p>
                        </div>
                    ))}
                    {policies.length === 0 && !loading && <p style={{ padding: '20px', textAlign: 'center' }}>No policies found.</p>}
                    <button onClick={handleAddPolicy} className={styles.addBtn}>+ Add New Leave Type</button>
                </div>
            </div>
        </>
    );
}
