"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './geo-fencing.module.css';
import toast from 'react-hot-toast';

type Site = {
    id: string;
    name: string;
    radius: number;
    latitude?: number;
    longitude?: number;
};

export default function GeoFencingPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [name, setName] = useState('');
    const [radius, setRadius] = useState('');

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        const { data, error } = await supabase
            .from('sites')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setSites(data);
    };

    const handleSave = async () => {
        if (!name || !radius) return toast.error("Please enter details");

        const { error } = await supabase.from('sites').insert([{
            name,
            radius: parseInt(radius),
            latitude: 0, // Placeholder
            longitude: 0 // Placeholder
        }]);

        if (error) {
            console.error(error);
            toast.error("Failed to save site");
        } else {
            toast.success("Site saved successfully");
            setName('');
            setRadius('');
            fetchSites();
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Geo-Fencing Setup</h1>

                <div className={styles.card}>
                    <div className={styles.mapPlaceholder}>
                        [ Map Interface Placeholder - Google Maps Integration ]
                    </div>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Site Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Head Office"
                                className={styles.input}
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Radius (meters)</label>
                            <input
                                type="number"
                                placeholder="500"
                                className={styles.input}
                                value={radius}
                                onChange={e => setRadius(e.target.value)}
                            />
                        </div>
                    </div>
                    <button onClick={handleSave} className={styles.saveBtn}>Save Location</button>
                </div>

                <div className={styles.sitesList}>
                    {sites.map(site => (
                        <div key={site.id} className={styles.siteItem}>
                            <h3 className={styles.siteName}>{site.name}</h3>
                            <p className={styles.siteDetails}>Radius: {site.radius}m</p>
                        </div>
                    ))}
                    {sites.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No sites configured.</p>}
                </div>
            </div>
        </>
    );
}
