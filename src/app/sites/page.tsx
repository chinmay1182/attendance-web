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
    latitude?: number;
    longitude?: number;
    is_active?: boolean;
    created_at?: string;
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
                { id: '1', name: "Headquarters", address: "123 Tech Park, Innovation Street, Silicon Valley, CA", description: "Main Office", is_primary: true, is_active: true, created_at: "", latitude: 37.4220, longitude: -122.0841 },
                { id: '2', name: "Remote Hub - NY", address: "456 Coworking Space, 5th Ave, New York, NY", description: "Satellite Office", is_primary: false, is_active: true, created_at: "", latitude: 40.7128, longitude: -74.0060 }
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
                            <div className={styles.mapContainer} style={{ height: '150px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                                {/* Map Preview using HERE Maps Image API */}
                                <img
                                    src={`https://image.maps.ls.hereapi.com/mia/1.6/mapview?apiKey=GDl2vmjbRIX_WuX44MJUbieWTl8A7AW9eFyLhSIDj8I&c=${site.latitude || '37.7749'},${site.longitude || '-122.4194'}&z=13&h=300&w=600`}
                                    alt="Map Preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
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
