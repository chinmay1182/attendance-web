import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './audit-logs.module.css';

type AuditLog = {
    id: string;
    created_at: string;
    action: string;
    details: string;
    user_id: string;
    users?: {
        name: string;
    };
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        // Attempting to select with user relation if it exists
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*, users(name)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching logs:', error);
            // Fallback static data
            setLogs(Array.from({ length: 5 }).map((_, i) => ({
                id: i.toString(),
                created_at: new Date().toISOString(),
                action: 'System Update',
                details: 'Simulated log entry due to missing table',
                user_id: 'admin',
                users: { name: 'Admin User' }
            })));
        } else {
            setLogs(data || []);
        }
        setLoading(false);
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>System Audit Logs</h1>
                <div className={styles.card}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Date & Time</th>
                                <th className={styles.th}>User</th>
                                <th className={styles.th}>Action</th>
                                <th className={styles.th}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className={styles.tr}>
                                    <td className={styles.td}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className={`${styles.td} ${styles.userCell}`}>
                                        {log.users?.name || 'Unknown User'}
                                    </td>
                                    <td className={`${styles.td} ${styles.actionCell}`}>{log.action}</td>
                                    <td className={`${styles.td} ${styles.detailsCell}`}>{log.details}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className={styles.td} style={{ textAlign: 'center' }}>
                                        No logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
