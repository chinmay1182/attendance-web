"use strict";
"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './expenses.module.css';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx'; // Added for export functionality
import { Skeleton } from '../../components/Skeleton';

type Expense = {
    id: string;
    title: string;
    amount: number;
    date: string;
    status: string;
    created_at: string;
    receipt_url?: string;
    user_id: string;
    users?: {
        name: string;
        department: string;
        email: string;
    };
    category?: string;
    rejection_reason?: string;
    is_paid?: boolean;
    paid_at?: string;
    payment_batch_id?: string;
};

export default function ExpensesPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]); // My Expenses

    // Admin State
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [activeTab, setActiveTab] = useState('my-expenses');
    const [loadingData, setLoadingData] = useState(false);
    const [dashboardKPI, setDashboardKPI] = useState({ total: 0, pending: 0, approved: 0 });
    const [statusData, setStatusData] = useState<any[]>([]);
    const [deptChartData, setDeptChartData] = useState<any[]>([]);
    const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([]);

    // Budget State
    const [deptBudgets, setDeptBudgets] = useState<any[]>([]);

    // Bulk & Actions State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

    // Budget Management State
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [editingBudgets, setEditingBudgets] = useState<{ id?: string, department: string, budget_limit: number }[]>([]);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptLimit, setNewDeptLimit] = useState('');

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Other'); // New
    const [date, setDate] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const EXPENSE_CATEGORIES: any = {
        'Travel': 5000,
        'Food': 500,
        'Office': 2000,
        'Accommodation': 8000,
        'Other': 10000
    };

    useEffect(() => {
        if (profile) {
            if (profile.role === 'admin' || profile.role === 'hr') {
                setActiveTab('all-expenses');
                fetchAdminData();
                subscribeToAllExpenses();
            } else {
                fetchMyExpenses();
                subscribeToMyExpenses();
            }
        }
    }, [profile, user]);

    const subscribeToAllExpenses = () => {
        const subscription = supabase
            .channel('expenses_all_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
                fetchAdminData();
            })
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    };

    const subscribeToMyExpenses = () => {
        const subscription = supabase
            .channel('expenses_my_realtime')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'expenses', filter: `user_id=eq.${user?.uid}` },
                (payload: any) => {
                    // Update local state instantly
                    setExpenses(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e));
                    import('react-hot-toast').then(({ default: toast }) => {
                        toast(`Claim ${payload.new.status}: ${payload.new.title}`);
                    });
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    };

    const fetchMyExpenses = async () => {
        const { data } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user?.uid)
            .order('created_at', { ascending: false });
        if (data) setExpenses(data as Expense[]);
    };

    const fetchAdminData = async () => {
        setLoadingData(true);
        try {
            const { data: expData } = await supabase
                .from('expenses')
                .select('*, users(name, department, email)')
                .order('created_at', { ascending: false });

            const { data: budgetData } = await supabase
                .from('department_budgets')
                .select('*');

            if (expData) {
                const typedData = expData as Expense[];
                setAllExpenses(typedData);

                // KPI
                const total = typedData.reduce((sum, item) => sum + (item.amount || 0), 0);
                const pending = typedData.filter(i => i.status === 'Pending').length;
                const approved = typedData.filter(i => i.status === 'Approved').length;
                setDashboardKPI({ total, pending, approved });

                // Status Chart
                const statusCount = { Pending: 0, Approved: 0, Rejected: 0 };
                typedData.forEach(i => {
                    const s = i.status as keyof typeof statusCount || 'Pending';
                    if (statusCount[s] !== undefined) statusCount[s]++;
                });
                setStatusData(Object.keys(statusCount).map(k => ({ name: k, value: statusCount[k as keyof typeof statusCount] })));

                // Dept Chart & Budget Calc
                const deptMap: any = {};
                typedData.forEach(i => {
                    const dept = i.users?.department || 'General';
                    deptMap[dept] = (deptMap[dept] || 0) + i.amount;
                });
                setDeptChartData(Object.keys(deptMap).map(k => ({ name: k, Amount: deptMap[k] })));

                if (budgetData) {
                    const budgets = budgetData.map((b: any) => {
                        const used = deptMap[b.department] || 0;
                        const percentage = Math.min((used / b.budget_limit) * 100, 100);
                        return { ...b, used, percentage };
                    });
                    setDeptBudgets(budgets);
                }

                // Monthly Trend Logic
                const trendMap: any = {};
                typedData.forEach(item => {
                    const month = new Date(item.date).toLocaleString('default', { month: 'short' });
                    trendMap[month] = (trendMap[month] || 0) + item.amount;
                });

                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const trendArr = months.map(m => ({ name: m, Amount: trendMap[m] || 0 })).filter(d => d.Amount > 0);
                setMonthlyTrendData(trendArr);
            }
        } catch (error) {
            console.error(error);
            toast.error("Could not load expenses");
        } finally {
            setLoadingData(false);
        }
    };

    const handleSubmit = async () => {
        if (!title || !amount || !date) return toast.error("Please fill all details");

        // Policy Check
        const limit = EXPENSE_CATEGORIES[category] || 10000;
        if (parseFloat(amount) > limit) {
            const confirm = window.confirm(`This amount exceeds the policy limit of ₹${limit} for ${category}. Do you want to submit anyway?`);
            if (!confirm) return;
        }

        setSubmitting(true);
        let receiptUrl = null;
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.uid}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('expenses').upload(fileName, file);
            if (uploadError) {
                toast.error("Failed to upload receipt");
                setSubmitting(false);
                return;
            }
            const { data: urlData } = supabase.storage.from('expenses').getPublicUrl(fileName);
            receiptUrl = urlData.publicUrl;
        }

        const { error } = await supabase.from('expenses').insert([{
            user_id: user?.uid,
            title,
            category,
            amount: parseFloat(amount),
            date,
            status: 'Pending',
            receipt_url: receiptUrl
        }]);

        if (error) {
            toast.error("Failed to submit");
        } else {
            toast.success("Expense submitted!");
            setTitle(''); setAmount(''); setDate(''); setFile(null);
            fetchMyExpenses();
            if (profile?.role === 'admin') fetchAdminData();
        }
        setSubmitting(false);
    };

    const handleBulkStatus = async (status: string, reason: string | null = null) => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);

        const { error } = await supabase
            .from('expenses')
            .update({ status: status, rejection_reason: reason })
            .in('id', ids);

        if (error) {
            toast.error("Update failed");
        } else {
            toast.success(`Marked ${ids.length} items as ${status}`);
            setSelectedIds(new Set());
            setRejectModalOpen(false);
            fetchAdminData();
        }
    };

    const handleMarkAsPaid = async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        const batchId = `PAY-${Date.now()}`;

        const { error } = await supabase
            .from('expenses')
            .update({
                is_paid: true,
                paid_at: new Date().toISOString(),
                payment_batch_id: batchId
            })
            .in('id', ids);

        if (error) {
            toast.error("Payment update failed");
        } else {
            toast.success(`Processed payment for ${ids.length} claims. Batch: ${batchId}`);
            setSelectedIds(new Set());
            fetchAdminData();
        }
    };

    const openBudgetModal = () => {
        // Deep copy existing budgets to editing state
        // If we have deptBudgets with usage info, we map it to just the editable fields
        const editable = deptBudgets.map(b => ({
            id: b.id,
            department: b.department,
            budget_limit: b.budget_limit
        }));
        setEditingBudgets(editable);
        setBudgetModalOpen(true);
    };

    const handleSaveBudgets = async () => {
        const upsertData = editingBudgets.map(b => ({
            department: b.department,
            budget_limit: b.budget_limit
        }));

        // Add new if present
        if (newDeptName && newDeptLimit) {
            upsertData.push({
                department: newDeptName,
                budget_limit: parseFloat(newDeptLimit)
            });
        }

        const { error } = await supabase
            .from('department_budgets')
            .upsert(upsertData, { onConflict: 'department' });

        if (error) {
            console.error(error);
            toast.error("Failed to update budgets");
        } else {
            toast.success("Budgets updated successfully");
            setBudgetModalOpen(false);
            setNewDeptName('');
            setNewDeptLimit('');
            fetchAdminData();
        }
    };

    const handleExport = () => {
        const data = allExpenses.map(e => ({
            Date: e.date,
            Employee: e.users?.name,
            Dept: e.users?.department,
            Category: (e as any).category || 'Other',
            Title: e.title,
            Amount: e.amount,
            Status: e.status,
            Paid: (e as any).is_paid ? 'Yes' : 'No',
            PaidAt: (e as any).paid_at ? new Date((e as any).paid_at).toLocaleDateString() : '-',
            Reason: (e as any).rejection_reason || ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Expenses");
        XLSX.writeFile(wb, "Expenses_Report.xlsx");
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const getStatusClass = (status: string, isPaid?: boolean) => {
        if (isPaid) return styles.statusPaid;
        if (status === 'Approved') return styles.statusApproved;
        if (status === 'Rejected') return styles.statusRejected;
        return styles.statusPending;
    };

    const COLORS = ['#f59e0b', '#10b981', '#ef4444'];

    if (authLoading) return (
        <>
            <Navbar />
            <div className={styles.container}>
                {/* Header Skeleton */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Skeleton width={250} height={40} />
                    <Skeleton width={200} height={40} borderRadius={8} />
                </div>

                {/* KPI Skeletons */}
                <div className={styles.statsGrid}>
                    <Skeleton height={100} borderRadius={16} />
                    <Skeleton height={100} borderRadius={16} />
                    <Skeleton height={100} borderRadius={16} />
                </div>

                {/* Charts Area Skeleton */}
                <div className={styles.chartsGrid} style={{ marginTop: 24 }}>
                    <Skeleton height={300} borderRadius={16} />
                    <Skeleton height={300} borderRadius={16} />
                    <div style={{ gridColumn: 'span 2' }}>
                        <Skeleton height={300} borderRadius={16} />
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h1 className={styles.title}>Expense Management</h1>
                    {(profile?.role === 'admin' || profile?.role === 'hr') && (
                        <div className={styles.tabs} style={{ marginBottom: 0 }}>
                            <button className={`${styles.tabBtn} ${activeTab === 'all-expenses' ? styles.active : ''}`} onClick={() => setActiveTab('all-expenses')}>
                                Dashboard
                            </button>
                            <button className={`${styles.tabBtn} ${activeTab === 'my-expenses' ? styles.active : ''}`} onClick={() => setActiveTab('my-expenses')}>
                                My Claims
                            </button>
                        </div>
                    )}
                </div>

                {activeTab === 'all-expenses' && (
                    <>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>₹{dashboardKPI.total.toLocaleString()}</div>
                                <div className={styles.statLabel}>Total Claimed</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue} style={{ color: '#f59e0b' }}>{dashboardKPI.pending}</div>
                                <div className={styles.statLabel}>Pending Requests</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue} style={{ color: '#10b981' }}>{dashboardKPI.approved}</div>
                                <div className={styles.statLabel}>Approved Claims</div>
                            </div>
                        </div>

                        {deptBudgets.length > 0 && (
                            <div className={styles.budgetCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 className={styles.chartTitle} style={{ marginBottom: 0 }}>Department Budget Utilization</h3>
                                    <button onClick={openBudgetModal} style={{ background: 'none', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                                        Manage Budgets
                                    </button>
                                </div>
                                {deptBudgets.map((budget, idx) => (
                                    <div key={idx} className={styles.budgetRow}>
                                        <div className={styles.budgetHeader}>
                                            <span>{budget.department}</span>
                                            <span>₹{Math.round(budget.used).toLocaleString()} / ₹{parseInt(budget.budget_limit).toLocaleString()} ({Math.round(budget.percentage)}%)</span>
                                        </div>
                                        <div className={styles.progressBarBG}>
                                            <div
                                                className={styles.progressBarFill}
                                                style={{
                                                    width: `${budget.percentage}%`,
                                                    background: budget.percentage > 90 ? '#ef4444' : budget.percentage > 70 ? '#f59e0b' : '#4f46e5'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={styles.chartsGrid}>
                            <div className={styles.chartCard}>
                                <h3 className={styles.chartTitle}>Monthly Spending Trend</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={monthlyTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Area type="monotone" dataKey="Amount" stroke="#4f46e5" fill="rgba(79, 70, 229, 0.1)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className={styles.chartCard}>
                                <h3 className={styles.chartTitle}>Status Distribution</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
                                <h3 className={styles.chartTitle}>Expenses by Department</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={deptChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Bar dataKey="Amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className={styles.bulkActions}>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>{selectedIds.size} Selected</span>
                            <div style={{ flex: 1 }}></div>
                            <button onClick={() => handleBulkStatus('Approved')} className={styles.tabBtn} style={{ background: '#dcfce7', color: '#16a34a' }}>Approve</button>
                            <button onClick={handleMarkAsPaid} className={styles.tabBtn} style={{ background: '#e0f2fe', color: '#0284c7' }}>Mark Paid</button>
                            <button onClick={() => setRejectModalOpen(true)} className={styles.tabBtn} style={{ background: '#fee2e2', color: '#dc2626' }}>Reject</button>
                            <button onClick={handleExport} className={styles.tabBtn} style={{ background: '#212121', color: 'white' }}>Export</button>
                        </div>

                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}><input type="checkbox" className={styles.tableCheckbox} onChange={(e) => {
                                            if (e.target.checked) setSelectedIds(new Set(allExpenses.map(x => x.id)));
                                            else setSelectedIds(new Set());
                                        }} /></th>
                                        <th>Date</th>
                                        <th>Employee</th>
                                        <th>Dept / Category</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Payout</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allExpenses.map((exp) => (
                                        <tr key={exp.id} style={{ background: selectedIds.has(exp.id) ? '#f8fafc' : 'transparent', opacity: (exp as any).is_paid ? 0.6 : 1 }}>
                                            <td><input type="checkbox" checked={selectedIds.has(exp.id)} onChange={() => toggleSelect(exp.id)} className={styles.tableCheckbox} /></td>
                                            <td>{new Date(exp.date).toLocaleDateString()}</td>
                                            <td>
                                                <strong>{exp.users?.name}</strong><br />
                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{exp.users?.email}</span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{exp.users?.department}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{(exp as any).category}</div>
                                            </td>
                                            <td>₹{exp.amount.toFixed(2)}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${getStatusClass(exp.status)}`}>{exp.status}</span>
                                            </td>
                                            <td>
                                                {(exp as any).is_paid ? (
                                                    <span className={`${styles.statusBadge} ${styles.statusPaid}`}>PAID</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Unpaid</span>
                                                )}
                                            </td>
                                            <td>
                                                {exp.receipt_url && (
                                                    <button
                                                        onClick={() => setSelectedReceipt(exp.receipt_url!)}
                                                        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontWeight: 500 }}
                                                    >
                                                        Receipt
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {allExpenses.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No records found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'my-expenses' && (
                    <div className={styles.myClaimsContainer}>
                        <div className={styles.formCard}>
                            <h3 className={styles.subtitle}>New Claim</h3>
                            <div className={styles.grid}>
                                <input
                                    type="text"
                                    placeholder="Expense Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={styles.input}
                                />
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className={styles.select}
                                >
                                    {Object.keys(EXPENSE_CATEGORIES).map(c => (
                                        <option key={c} value={c}>{c} (Max ₹{EXPENSE_CATEGORIES[c]})</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={styles.input}
                                />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className={styles.input}
                                />
                                <div className={styles.uploadBox}>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                        style={{ width: '100%' }}
                                    />
                                    {file && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Selected: {file.name}</span>}
                                </div>
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className={styles.submitBtn}
                            >
                                {submitting ? 'Submitting...' : 'Submit Claim'}
                            </button>
                        </div>

                        <div className={styles.historyCard}>
                            <h3 className={styles.historyTitle}>History</h3>
                            {expenses.length === 0 && <p className={styles.emptyState}>No expense claims yet.</p>}
                            {expenses.map(expense => (
                                <div key={expense.id} className={styles.historyItem}>
                                    <div>
                                        <h4 className={styles.expenseTitle}>{expense.title}</h4>
                                        <p className={styles.expenseDate}>
                                            {new Date(expense.date).toLocaleDateString()} • <span style={{ color: '#64748b' }}>{(expense as any).category}</span>
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className={styles.expenseAmount}>₹{expense.amount.toFixed(2)}</div>
                                        <div className={`${styles.statusBadge} ${getStatusClass(expense.status, (expense as any).is_paid)}`}>
                                            {(expense as any).is_paid ? 'PAID' : expense.status}
                                        </div>
                                        {(expense as any).rejection_reason && <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>Reason: {(expense as any).rejection_reason}</div>}
                                        {expense.receipt_url && (
                                            <button
                                                onClick={() => setSelectedReceipt(expense.receipt_url!)}
                                                style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.8rem', marginTop: '4px' }}
                                            >
                                                View Receipt
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Receipt Modal */}
                {selectedReceipt && (
                    <div className={styles.modalOverlay} onClick={() => setSelectedReceipt(null)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeBtn} onClick={() => setSelectedReceipt(null)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <h3 style={{ marginTop: 0 }}>Receipt Preview</h3>
                            {selectedReceipt.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={selectedReceipt} width="100%" height="500px" title="Receipt" style={{ border: 'none', borderRadius: '8px' }} />
                            ) : (
                                <img src={selectedReceipt} alt="Receipt" style={{ width: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                            )}
                        </div>
                    </div>
                )}

                {/* Reject Reason Modal */}
                {rejectModalOpen && (
                    <div className={styles.modalOverlay} onClick={() => setRejectModalOpen(false)}>
                        <div className={styles.modal} style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
                            <h3>Reject Expenses</h3>
                            <p>You are rejecting {selectedIds.size} claim(s). Please provide a reason.</p>
                            <textarea
                                className={styles.textArea}
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Reason for rejection (e.g. Policy Violation)"
                            />
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button onClick={() => setRejectModalOpen(false)} className={styles.tabBtn} style={{ flex: 1, border: '1px solid #ddd' }}>Cancel</button>
                                <button onClick={() => handleBulkStatus('Rejected', rejectionReason)} className={styles.tabBtn} style={{ flex: 1, background: '#ef4444', color: 'white' }}>Confirm Reject</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Budget Management Modal */}
                {budgetModalOpen && (
                    <div className={styles.modalOverlay} onClick={() => setBudgetModalOpen(false)}>
                        <div className={styles.modal} style={{ width: '600px' }} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeBtn} onClick={() => setBudgetModalOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Manage Department Budgets</h3>

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {editingBudgets.map((b, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 600 }}>{b.department}</div>
                                        <input
                                            type="number"
                                            value={b.budget_limit}
                                            onChange={(e) => {
                                                const next = [...editingBudgets];
                                                next[idx].budget_limit = parseFloat(e.target.value);
                                                setEditingBudgets(next);
                                            }}
                                            className={styles.input}
                                            style={{ padding: '8px' }}
                                        />
                                    </div>
                                ))}

                                <div style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '20px' }}>
                                    <h4 style={{ marginBottom: '12px', fontSize: '0.9rem', color: '#64748b' }}>Add New Department Budget</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
                                        <input
                                            type="text"
                                            placeholder="Department Name"
                                            value={newDeptName}
                                            onChange={(e) => setNewDeptName(e.target.value)}
                                            className={styles.input}
                                            style={{ padding: '8px' }}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Limit"
                                            value={newDeptLimit}
                                            onChange={(e) => setNewDeptLimit(e.target.value)}
                                            className={styles.input}
                                            style={{ padding: '8px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => setBudgetModalOpen(false)} className={styles.tabBtn} style={{ flex: 1, border: '1px solid #ddd' }}>Cancel</button>
                                <button onClick={handleSaveBudgets} className={styles.tabBtn} style={{ flex: 1, background: '#212121', color: 'white' }}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
