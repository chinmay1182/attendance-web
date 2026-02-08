"use client";
import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './company.module.css';

type Company = {
    id: string;
    name: string;
    description: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    created_at: string;
};

export default function CompanyPage() {
    const { user, profile } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !profile?.company_id) return;

        fetchCompany();

        // Real-time subscription for company updates
        const channel = supabase.channel('company_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'companies', filter: `id=eq.${profile.company_id}` },
                async (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        setCompany(payload.new as Company);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, profile]);

    const fetchCompany = async () => {
        if (!profile?.company_id) return;

        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profile.company_id)
            .single();

        if (data) setCompany(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 80px)' }}>
                    <div className="loader">Loading...</div>
                </div>
            </>
        );
    }

    if (!company) {
        return (
            <>
                <Navbar />
                <div className={styles.container}>
                    <h1 className={styles.title}>Company Details</h1>
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No company information available.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Company Details</h1>

                <div className={styles.heroSection}>
                    <div className={styles.logoBox}>{company.name.substring(0, 4).toUpperCase()}</div>
                    <div>
                        <h2>{company.name}</h2>
                        <p>{company.description || 'Innovating the Future'}</p>
                    </div>
                </div>

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h3>About Us</h3>
                        <p>{company.description || 'No description available.'}</p>
                    </div>

                    <div className={styles.card}>
                        <h3>Contact Info</h3>
                        {company.email && (
                            <div className={styles.contactItem}>
                                <strong>Email:</strong> <span>{company.email}</span>
                            </div>
                        )}
                        {company.phone && (
                            <div className={styles.contactItem}>
                                <strong>Phone:</strong> <span>{company.phone}</span>
                            </div>
                        )}
                        {company.website && (
                            <div className={styles.contactItem}>
                                <strong>Website:</strong> <span>{company.website}</span>
                            </div>
                        )}
                        {company.address && (
                            <div className={styles.contactItem}>
                                <strong>Address:</strong> <span>{company.address}</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.card}>
                        <h3>Company Info</h3>
                        <div className={styles.contactItem}>
                            <strong>Established:</strong> <span>{new Date(company.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className={styles.contactItem}>
                            <strong>Company ID:</strong> <span>{company.id.substring(0, 8)}...</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
