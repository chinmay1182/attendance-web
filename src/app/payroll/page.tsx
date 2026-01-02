import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './payroll.module.css';
import toast from 'react-hot-toast';

type PayrollRun = {
    id: string;
    created_at: string;
    total_cost: number;
    employees_count: number;
    status: string;
};

export default function PayrollPage() {
    const [stats, setStats] = useState({
        totalCost: 0,
        employeesProcessed: 0,
        pendingReviews: 0,
        taxDeductions: 0
    });
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPayrollData();
    }, []);

    const fetchPayrollData = async () => {
        // Fetch runs
        const { data } = await supabase
            .from('payroll_runs')
            .select('*')
            .order('created_at', { ascending: false });

        if (data && data.length > 0) {
            setRuns(data);
            const latest = data[0];
            setStats({
                totalCost: latest.total_cost,
                employeesProcessed: latest.employees_count,
                pendingReviews: 0, // Placeholder
                taxDeductions: latest.total_cost * 0.1 // Simulated tax
            });
        }
    };

    const handleRunPayroll = async () => {
        setLoading(true);
        // Simulate calculation
        const simulatedCost = Math.floor(Math.random() * 50000) + 100000;
        const simulatedCount = Math.floor(Math.random() * 20) + 130;

        const { error } = await supabase.from('payroll_runs').insert([{
            total_cost: simulatedCost,
            employees_count: simulatedCount,
            status: 'Completed',
            created_at: new Date().toISOString()
        }]);

        if (error) {
            console.error(error);
            toast.error("Failed to run payroll");
        } else {
            toast.success("Payroll run successfully!");
            fetchPayrollData();
        }
        setLoading(false);
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Payroll Processing</h1>
                    <button
                        onClick={handleRunPayroll}
                        className={styles.runBtn}
                        disabled={loading}
                        style={{ opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Processing...' : 'Run Payroll'}
                    </button>
                </div>

                <div className={styles.statsGrid}>
                    {[
                        { label: 'Total Payroll Cost', value: `$${stats.totalCost.toLocaleString()}` },
                        { label: 'Employees Processed', value: stats.employeesProcessed.toString() },
                        { label: 'Pending Reviews', value: stats.pendingReviews.toString() },
                        { label: 'Tax Deductions', value: `$${stats.taxDeductions.toLocaleString()}` }
                    ].map((stat, i) => (
                        <div key={i} className={styles.statCard}>
                            <p className={styles.statLabel}>{stat.label}</p>
                            <h2 className={styles.statValue}>{stat.value}</h2>
                        </div>
                    ))}
                </div>

                <div className={styles.listCard}>
                    <h3 className={styles.sectionTitle}>Payroll Runs History</h3>
                    <div className={styles.emptyState} style={runs.length > 0 ? { background: 'transparent', border: 'none', padding: 0 } : {}}>
                        {runs.length === 0 && "No payroll runs yet."}
                        {runs.length > 0 && (
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Date</th>
                                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Employees</th>
                                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Cost</th>
                                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {runs.map(run => (
                                        <tr key={run.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>{new Date(run.created_at).toLocaleDateString()}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>{run.employees_count}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>${run.total_cost.toLocaleString()}</td>
                                            <td style={{ padding: '12px', color: '#16a34a', fontWeight: 'bold' }}>{run.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
