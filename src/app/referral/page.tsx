"use client";
import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './referral.module.css';
import toast from 'react-hot-toast';

export default function ReferralPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [position, setPosition] = useState('Senior Developer');
    const [loading, setLoading] = useState(false);

    const [myReferrals, setMyReferrals] = useState<any[]>([]);

    const handleSubmit = async () => {
        // ... (existing submit logic)
        // No change needed here, just update state via realtime or refetch
        if (!name || !email) return toast.error("Please fill in all fields");
        setLoading(true);

        const { error } = await supabase.from('referrals').insert([
            { candidate_name: name, email, position, status: 'Pending', referrer_id: (await supabase.auth.getUser()).data.user?.id }
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

    useEffect(() => {
        fetchReferrals();
        const channel = supabase.channel('referrals_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => fetchReferrals())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchReferrals = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('referrals').select('*').eq('referrer_id', user.id);
        if (data) setMyReferrals(data);
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

                <div className={styles.formCard} style={{ marginTop: '24px' }}>
                    <h3 className={styles.label}>My Referrals</h3>
                    {myReferrals.length === 0 && <p style={{ color: '#64748b' }}>No referrals yet.</p>}
                    {myReferrals.map((ref: any) => (
                        <div key={ref.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{ref.candidate_name}</div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{ref.position}</div>
                            </div>
                            <span style={{
                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                background: ref.status === 'Hired' ? '#dcfce7' : '#f1f5f9',
                                color: ref.status === 'Hired' ? '#16a34a' : '#64748b'
                            }}>{ref.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
