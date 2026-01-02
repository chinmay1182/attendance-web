"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './asset-management.module.css';

type Asset = {
    id: string;
    asset_id: string;
    name: string;
    assigned_to: string;
    status: string;
};

export default function AssetManagementPage() {
    const [assets, setAssets] = useState<Asset[]>([]);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        const { data, error } = await supabase.from('assets').select('*');

        if (error || !data || data.length === 0) {
            setAssets([
                { id: '1', asset_id: "DT-001", name: "MacBook Pro M2", assigned_to: "Chinmay B.", status: "Active" },
                { id: '2', asset_id: "MO-042", name: "Dell Monitor 27", assigned_to: "Chinmay B.", status: "Active" },
                { id: '3', asset_id: "KE-101", name: "Mechanical Keyboard", assigned_to: "John D.", status: "Maintenance" }
            ]);
        } else {
            setAssets(data);
        }
    };

    const getStatusClass = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active': return styles.statusActive;
            case 'maintenance': return styles.statusMaintenance;
            case 'retired': return styles.statusRetired;
            default: return styles.statusActive;
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Asset Management</h1>
                <div className={styles.card}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Asset ID</th>
                                <th className={styles.th}>Name</th>
                                <th className={styles.th}>Assigned To</th>
                                <th className={styles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.map((asset) => (
                                <tr key={asset.id} className={styles.tr}>
                                    <td className={`${styles.td} ${styles.assetId}`}>{asset.asset_id}</td>
                                    <td className={`${styles.td} ${styles.assetName}`}>{asset.name}</td>
                                    <td className={styles.td}>{asset.assigned_to}</td>
                                    <td className={styles.td}>
                                        <span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
