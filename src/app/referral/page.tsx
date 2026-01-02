"use client";
import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './referral.module.css';
import toast from 'react-hot-toast';

export default function ReferralPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [position, setPosition] = useState('Senior Developer');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !email) return toast.error("Please fill in all fields");
        setLoading(true);

        const { error } = await supabase.from('referrals').insert([
            { candidate_name: name, email, position, status: 'Pending' }
        ]);

        if (error) {
            console.error(error);
            toast.error("Failed to submit referral");
        } else {
            toast.success("Referral submitted successfully!");
            setName('');
            setEmail('');
        }
        setLoading(false);
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.intro}>
                    <h1 className={styles.title}>Employee Referral Program</h1>
                    <p className={styles.subtitle}>
                        Know someone perfect for our team? Refer them and earn a bonus of <b className={styles.highlight}>$500</b> upon successful hiring!
                    </p>
                </div>

                <div className={styles.formCard}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Candidate Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email Address</label>
                            <input
                                type="email"
                                className={styles.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Position</label>
                            <select
                                className={styles.select}
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                            >
                                <option>Senior Developer</option>
                                <option>Product Manager</option>
                                <option>Sales Executive</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Resume (PDF)</label>
                            <input type="file" className={styles.fileInput} />
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={styles.submitBtn}
                    >
                        {loading ? 'Submitting...' : 'Submit Referral'}
                    </button>
                </div>
            </div>
        </>
    );
}
