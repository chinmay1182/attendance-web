"use client";
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
            updateStats(data);
        }
    };

    const updateStats = (data: PayrollRun[]) => {
        if (data.length === 0) return;
        const latest = data[0];
        setStats({
            totalCost: latest.total_cost,
            employeesProcessed: latest.employees_count,
            pendingReviews: 0,
            taxDeductions: latest.total_cost * 0.1
        });
    };

    useEffect(() => {
        const channel = supabase.channel('payroll_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'payroll_runs' },
                (payload: any) => {
                    const newRun = payload.new as PayrollRun;
                    setRuns(prev => {
                        const updated = [newRun, ...prev];
                        updateStats(updated);
                        return updated;
                    });
                    import('react-hot-toast').then(({ default: toast }) => { toast.success('New Payroll Run Completed'); });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'payroll_runs' },
                (payload: any) => {
                    const updatedRun = payload.new as PayrollRun;
                    setRuns(prev => {
                        const updated = prev.map(run => run.id === updatedRun.id ? updatedRun : run);
                        updateStats(updated);
                        return updated;
                    });
                    import('react-hot-toast').then(({ default: toast }) => { toast.success('Payroll Run Updated'); });
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'payroll_runs' },
                (payload: any) => {
                    const deletedId = payload.old.id;
                    setRuns(prev => {
                        const updated = prev.filter(run => run.id !== deletedId);
                        if (updated.length > 0) {
                            updateStats(updated);
                        } else {
                            setStats({ totalCost: 0, employeesProcessed: 0, pendingReviews: 0, taxDeductions: 0 });
                        }
                        return updated;
                    });
                    import('react-hot-toast').then(({ default: toast }) => { toast.success('Payroll Run Deleted'); });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleRunPayroll = async () => {
        setLoading(true);
        try {
            // 1. Get current month date range
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            // 2. Fetch all employees with salary
            const { data: employees, error: empError } = await supabase
                .from('users')
                .select('id, salary, name')
                .not('salary', 'is', null);

            if (empError) throw empError;
            if (!employees || employees.length === 0) throw new Error("No employees with salary found");

            // 3. Fetch attendance for these employees in this month
            const userIds = employees.map(e => e.id);
            const { data: attendance, error: attError } = await supabase
                .from('attendance')
                .select('user_id, date, status')
                .in('user_id', userIds)
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);

            if (attError) throw attError;

            // 4. Calculate Pay
            let totalCost = 0;
            const employeeStats = employees.map(emp => {
                // Count Present and Half-days (0.5)
                const empAttendance = attendance?.filter(a => a.user_id === emp.id) || [];
                let daysPresent = 0;
                empAttendance.forEach(a => {
                    if (a.status === 'present' || a.status === 'late') daysPresent += 1;
                    else if (a.status === 'half-day') daysPresent += 0.5;
                });

                // Formula: (Salary / 30) * Days
                // If days > 30, cap at salary? Or pay overtime? For now, simple pro-rata.
                const dailyRate = (emp.salary || 0) / 30;
                const payable = Math.round(dailyRate * daysPresent);

                totalCost += payable;
                return { ...emp, daysPresent, payable };
            });

            // 5. Insert Run into DB
            const { error } = await supabase.from('payroll_runs').insert([{
                total_cost: totalCost,
                employees_count: employees.length,
                status: 'Completed',
                created_at: new Date().toISOString(),
                // details: employeeStats // If we had a JSON column for details, we'd save it here
            }]);

            if (error) throw error;

            toast.success(`Payroll processed. Total Cost: ₹${totalCost.toLocaleString()}`);
            fetchPayrollData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to run payroll");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRun = async (id: string) => {
        if (!confirm('Are you sure you want to delete this payroll run?')) return;

        try {
            const { error } = await supabase
                .from('payroll_runs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            // Toast will be shown by realtime subscription
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to delete payroll run');
        }
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
                        { label: 'Total Payroll Cost', value: `₹${stats.totalCost.toLocaleString()}` },
                        { label: 'Employees Processed', value: stats.employeesProcessed.toString() },
                        { label: 'Pending Reviews', value: stats.pendingReviews.toString() },
                        { label: 'Tax Deductions', value: `₹${stats.taxDeductions.toLocaleString()}` }
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
                                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {runs.map(run => (
                                        <tr key={run.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>
                                                {new Date(run.created_at).toLocaleDateString()} {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>{run.employees_count}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-main)' }}>₹{run.total_cost.toLocaleString()}</td>
                                            <td style={{ padding: '12px', color: '#16a34a', fontWeight: 'bold' }}>{run.status}</td>
                                            <td style={{ padding: '12px' }}>
                                                <button
                                                    onClick={() => handleDeleteRun(run.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#fee2e2',
                                                        color: '#dc2626',
                                                        border: '1px solid #fecaca',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = '#fecaca';
                                                        e.currentTarget.style.borderColor = '#fca5a5';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = '#fee2e2';
                                                        e.currentTarget.style.borderColor = '#fecaca';
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                    Delete
                                                </button>
                                            </td>
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
