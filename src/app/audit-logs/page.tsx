"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { logAudit, AuditActions } from '../../lib/auditLogger';
import styles from './audit-logs.module.css';
import toast, { Toaster } from 'react-hot-toast';

type AuditLog = {
    id: string;
    created_at: string;
    action: string;
    details: string;
    actor_id: string;
    user_id: string;
    users?: {
        name: string;
    } | null;
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [liveUpdate, setLiveUpdate] = useState(false);
    const [filterAction, setFilterAction] = useState<string>('all');
    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchLogs();

        const channel = supabase.channel('audit_log_stream')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'audit_logs' },
                async (payload: any) => {
                    // Show live indicator
                    setLiveUpdate(true);
                    setTimeout(() => setLiveUpdate(false), 3000);

                    if (payload.eventType === 'INSERT') {
                        const newLog = payload.new;
                        // Fetch user name
                        const { data: u } = await supabase.from('users').select('name').eq('id', newLog.user_id).single();
                        const logWithUser = { ...newLog, users: u };

                        setLogs(prev => [logWithUser, ...prev.slice(0, 99)]); // Keep max 100 logs

                        // Auto-scroll to top
                        if (tableRef.current) {
                            tableRef.current.scrollTop = 0;
                        }

                        toast.success('📝 New Activity Logged', {
                            icon: '🔔',
                            style: { background: '#3b82f6', color: '#fff' }
                        });
                    } else if (payload.eventType === 'DELETE') {
                        const oldLog = payload.old;
                        setLogs(prev => prev.filter(log => log.id !== oldLog.id));
                        toast('🗑️ Log Entry Removed', {
                            icon: '📋',
                            style: { background: '#ef4444', color: '#fff' }
                        });
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    id,
                    created_at,
                    action,
                    details,
                    actor_id,
                    user_id,
                    users:actor_id (name)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Error fetching logs:', error);
                console.error('Error details:', JSON.stringify(error, null, 2));
                toast.error(`Failed to load audit logs: ${error.message || 'Unknown error'}`);
                setLogs([]);
            } else {
                console.log('Fetched logs:', data?.length || 0, 'records');
                // Map the data to handle the users join (convert array to single object)
                const mappedData = (data || []).map((log: any) => ({
                    ...log,
                    users: Array.isArray(log.users) && log.users.length > 0 ? log.users[0] : log.users
                }));
                setLogs(mappedData);
            }
        } catch (err) {
            console.error('Exception fetching logs:', err);
            toast.error('Failed to load audit logs');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = async () => {
        if (filteredLogs.length === 0) {
            toast.error('No logs to export');
            return;
        }

        // Prepare CSV data
        const headers = ['Date', 'Time', 'User', 'Action', 'Details'];
        const rows = filteredLogs.map(log => [
            new Date(log.created_at).toLocaleDateString(),
            new Date(log.created_at).toLocaleTimeString(),
            log.users?.name || 'Unknown User',
            log.action,
            log.details
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${filteredLogs.length} logs to CSV`);

        // Log the export action
        await logAudit(
            AuditActions.EXPORT_AUDIT_LOGS,
            `Exported ${filteredLogs.length} audit log entries to CSV`
        );
    };

    const filteredLogs = filterAction === 'all'
        ? logs
        : logs.filter(log => log.action.toLowerCase().includes(filterAction.toLowerCase()));

    const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

    return (
        <>
            <Toaster position="top-right" />
            <Navbar />
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 className={styles.title}>System Audit Logs</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
                            Track all system activities in real-time
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {liveUpdate && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                background: 'var(--primary-light)',
                                borderRadius: '99px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: 'var(--primary)'
                            }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    animation: 'pulse 1.5s infinite'
                                }}></span>
                                Live Activity
                            </div>
                        )}
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                background: 'white',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                color: 'var(--text-main)'
                            }}
                        >
                            <option value="all">All Actions ({logs.length})</option>
                            {uniqueActions.slice(0, 10).map(action => (
                                <option key={action} value={action}>
                                    {action} ({logs.filter(l => l.action === action).length})
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={exportToCSV}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                background: 'var(--primary)',
                                color: 'white',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'var(--transition-fast)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary)'}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                            Export CSV
                        </button>
                        <button
                            onClick={fetchLogs}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                background: 'white',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--text-main)'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                            Refresh
                        </button>
                    </div>
                </div>
                <div className={styles.card}>
                    <div
                        ref={tableRef}
                        style={{
                            maxHeight: 'calc(100vh - 280px)',
                            overflowY: 'auto',
                            scrollBehavior: 'smooth'
                        }}
                    >
                        <table className={styles.table}>
                            <thead className={styles.thead} style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                                <tr>
                                    <th className={styles.th}>Date & Time</th>
                                    <th className={styles.th}>User</th>
                                    <th className={styles.th}>Action</th>
                                    <th className={styles.th}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log, index) => (
                                    <tr
                                        key={log.id}
                                        className={styles.tr}
                                        style={{
                                            animation: index === 0 && liveUpdate ? 'highlightNew 2s ease-out' : 'none'
                                        }}
                                    >
                                        <td className={styles.td}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 600 }}>
                                                    {new Date(log.created_at).toLocaleDateString()}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {new Date(log.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`${styles.td} ${styles.userCell}`}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '4px 12px',
                                                background: 'var(--primary-light)',
                                                borderRadius: '8px',
                                                width: 'fit-content'
                                            }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                                                    person
                                                </span>
                                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                    {log.users?.name || 'Unknown User'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`${styles.td} ${styles.actionCell}`}>
                                            <span style={{
                                                padding: '6px 12px',
                                                background: log.action.toLowerCase().includes('delete') ? '#fee2e2' :
                                                    log.action.toLowerCase().includes('create') ? '#dcfce7' :
                                                        log.action.toLowerCase().includes('update') ? '#dbeafe' : '#f3f4f6',
                                                color: log.action.toLowerCase().includes('delete') ? '#dc2626' :
                                                    log.action.toLowerCase().includes('create') ? '#16a34a' :
                                                        log.action.toLowerCase().includes('update') ? '#2563eb' : '#6b7280',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className={`${styles.td} ${styles.detailsCell}`}>
                                            {log.details}
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={4} className={styles.td} style={{ textAlign: 'center', padding: '60px 20px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-muted)', opacity: 0.3 }}>
                                                history
                                            </span>
                                            <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>
                                                {filterAction === 'all' ? 'No audit logs found.' : `No logs found for "${filterAction}"`}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                                {loading && (
                                    <tr>
                                        <td colSpan={4} className={styles.td} style={{ textAlign: 'center', padding: '40px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    border: '3px solid var(--primary-light)',
                                                    borderTop: '3px solid var(--primary)',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite'
                                                }}></div>
                                                <span style={{ color: 'var(--text-muted)' }}>Loading logs...</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
