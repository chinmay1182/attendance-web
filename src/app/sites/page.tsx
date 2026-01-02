"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './sites.module.css';

type Site = {
    id: string;
    name: string;
    address: string;
    description: string;
    is_primary: boolean;
};

export default function MySitesPage() {
    const [sites, setSites] = useState<Site[]>([]);

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        const { data, error } = await supabase.from('sites').select('*');
        if (error || !data || data.length === 0) {
            setSites([
                { id: '1', name: "Headquarters", address: "123 Tech Park, Innovation Street, Silicon Valley, CA", description: "Main Office", is_primary: true },
                { id: '2', name: "Remote Hub - NY", address: "456 Coworking Space, 5th Ave, New York, NY", description: "Satellite Office", is_primary: false }
            ]);
        } else {
            setSites(data);
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>My Sites</h1>
                <div className={styles.grid}>
                    {sites.map((site) => (
                        <div key={site.id} className={styles.siteCard}>
                            <div className={styles.siteHeader}>
                                <h3>{site.name}</h3>
                                {site.is_primary && <span className={styles.badge}>Primary</span>}
                                {!site.is_primary && <span className={styles.badgeSecondary}>Satellite</span>}
                            </div>
                            <p className={styles.address}>{site.address}</p>
                            <div className={styles.meta}>
                                <span>{site.description}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
