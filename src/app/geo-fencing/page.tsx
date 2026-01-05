"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './geo-fencing.module.css';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Define types first so dynamic can use them
type Site = {
    id: string;
    name: string;
    radius: number;
    latitude: number;
    longitude: number;
};

type LeafletMapProps = {
    sites: Site[];
    onLocationSelect: (lat: number, lng: number) => void;
};

// Dynamically import the custom map component with explicit prop types
// We use a relative path that is definitely correct: ../../components/LeafletMap
const MapWithNoSSR = dynamic<LeafletMapProps>(
    () => import('../../components/LeafletMap'),
    { ssr: false }
);

export default function GeoFencingPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [name, setName] = useState('');
    const [radius, setRadius] = useState('');
    const [lat, setLat] = useState(0);
    const [lng, setLng] = useState(0);

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        const { data } = await supabase
            .from('sites')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setSites(data);
    };

    useEffect(() => {
        const channel = supabase.channel('geofencing_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, () => fetchSites())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleSave = async () => {
        if (!name || !radius) return toast.error("Please enter details");
        if (lat === 0 || lng === 0) return toast.error("Please click on map to select location");

        const { error } = await supabase.from('sites').insert([{
            name,
            radius: parseInt(radius),
            latitude: lat,
            longitude: lng
        }]);

        if (error) {
            console.error(error);
            toast.error("Failed to save site");
        } else {
            toast.success("Site saved successfully");
            setName('');
            setRadius('');
            // Optional: reset lat/lng or keep for reference
            fetchSites();
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Geo-Fencing Setup</h1>

                <div className={styles.card}>
                    <div className={styles.mapContainer} style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                        {/* We use the extracted component to handle Leaflet logic safely */}
                        <MapWithNoSSR
                            sites={sites}
                            onLocationSelect={(lt: number, lg: number) => {
                                setLat(lt);
                                setLng(lg);
                                toast("Location Selected");
                            }}
                        />
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
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Lat: {site.latitude?.toFixed(4)}, Lng: {site.longitude?.toFixed(4)}</p>
                        </div>
                    ))}
                    {sites.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No sites configured.</p>}
                </div>
            </div>
        </>
    );
}
