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
import * as XLSX from 'xlsx';
import { Skeleton } from '../../components/Skeleton';

type Expense = {
    id: string;
    title: string;
    amount: number;
    daily_allowance: number;
    travel_allowance: number;
    medical_allowance: number;
    other_allowance: number;
    date: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Partial';
    created_at: string;
    receipt_url?: string;
    user_id: string;
    users?: {
        name: string;
        department: string;
        email: string;
    };
    category?: string; // Keeping for backward compatibility or extra categorization
    rejection_reason?: string;
    admin_comments?: string;
    approved_amount?: number;
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

    // Review Modal State
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [reviewAmount, setReviewAmount] = useState<string>('');
    const [reviewComment, setReviewComment] = useState('');

    // Budget Management State
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [editingBudgets, setEditingBudgets] = useState<{ id?: string, department: string, budget_limit: number }[]>([]);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptLimit, setNewDeptLimit] = useState('');

    // Form State
    const [title, setTitle] = useState('');

    // Allowances
    const [dailyAllowance, setDailyAllowance] = useState('');
    const [travelAllowance, setTravelAllowance] = useState('');
    const [medicalAllowance, setMedicalAllowance] = useState('');
    const [otherAllowance, setOtherAllowance] = useState('');

    // Total is calculated automatically
    const [totalAmount, setTotalAmount] = useState(0);

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Calculate total whenever allowances change
    useEffect(() => {
        const daily = parseFloat(dailyAllowance) || 0;
        const travel = parseFloat(travelAllowance) || 0;
        const medical = parseFloat(medicalAllowance) || 0;
        const other = parseFloat(otherAllowance) || 0;
        setTotalAmount(daily + travel + medical + other);
    }, [dailyAllowance, travelAllowance, medicalAllowance, otherAllowance]);

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
                { event: 'UPDATE', schema: 'public', table: 'expenses', filter: `user_id=eq.${user?.id}` },
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
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });
        if (data) setExpenses(data as Expense[]);
    };

    const fetchAdminData = async () => {
        setLoadingData(true);
        try {
            if (!profile?.company_id) {
                setLoadingData(false);
                return;
            }

            const { data: expData } = await supabase
                .from('expenses')
                .select('*, users!inner(name, department, email, company_id)')
                .eq('users.company_id', profile.company_id)
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
                const approved = typedData.filter(i => i.status === 'Approved' || i.status === 'Partial').length;
                setDashboardKPI({ total, pending, approved });

                // Status Chart
                const statusCount = { Pending: 0, Approved: 0, Rejected: 0, Partial: 0 };
                typedData.forEach(i => {
                    const s = i.status as keyof typeof statusCount || 'Pending';
                    if (statusCount[s] !== undefined) statusCount[s]++;
                });
                setStatusData(Object.keys(statusCount).map(k => ({ name: k, value: statusCount[k as keyof typeof statusCount] })).filter(d => d.value > 0));

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
        if (!title || !date || totalAmount <= 0) return toast.error("Please fill details and add at least one allowance.");

        setSubmitting(true);
        let receiptUrl = null;
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('expenses').upload(fileName, file);
            if (uploadError) {
                console.error('Upload Error:', JSON.stringify(uploadError, null, 2));
                toast.error("Failed to upload receipt");
                setSubmitting(false);
                return;
            }
            const { data: urlData } = supabase.storage.from('expenses').getPublicUrl(fileName);
            receiptUrl = urlData.publicUrl;
        }

        const { error } = await supabase.from('expenses').insert([{
            user_id: user?.id,
            title,
            amount: totalAmount,
            daily_allowance: parseFloat(dailyAllowance) || 0,
            travel_allowance: parseFloat(travelAllowance) || 0,
            medical_allowance: parseFloat(medicalAllowance) || 0,
            other_allowance: parseFloat(otherAllowance) || 0,
            date,
            status: 'Pending',
            receipt_url: receiptUrl
        }]);

        if (error) {
            console.error('Supabase Error:', JSON.stringify(error, null, 2));
            toast.error("Failed to submit");
        } else {
            toast.success("Expense submitted!");
            // Reset Form
            setTitle('');
            setDailyAllowance(''); setTravelAllowance(''); setMedicalAllowance(''); setOtherAllowance('');
            setDate(new Date().toISOString().split('T')[0]);
            setFile(null);

            fetchMyExpenses();
            if (profile?.role === 'admin') fetchAdminData();
        }
        setSubmitting(false);
    };

    // Admin Actions
    const handleOpenReview = (expense: Expense) => {
        setSelectedExpense(expense);
        setReviewAmount(expense.amount.toString());
        setReviewComment('');
        setReviewModalOpen(true);
    };

    const handleProcessReview = async (status: 'Approved' | 'Partial' | 'Rejected') => {
        if (!selectedExpense) return;

        const approvedAmt = status === 'Rejected' ? 0 : parseFloat(reviewAmount);

        if (status === 'Partial' && approvedAmt >= selectedExpense.amount) {
            toast.error("For partial approval, amount should be less than total claim.");
            return;
        }

        const { error } = await supabase
            .from('expenses')
            .update({
                status,
                approved_amount: approvedAmt,
                admin_comments: reviewComment,
                rejection_reason: status === 'Rejected' ? reviewComment : null
            })
            .eq('id', selectedExpense.id);

        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success(`Claim marked as ${status}`);
            setReviewModalOpen(false);
            fetchAdminData();
        }
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
            Title: e.title,
            Requested: e.amount,
            Approved: e.approved_amount || 0,
            Status: e.status,
            Paid: (e as any).is_paid ? 'Yes' : 'No',
            PaidAt: (e as any).paid_at ? new Date((e as any).paid_at).toLocaleDateString() : '-',
            AdminComment: e.admin_comments || (e as any).rejection_reason || ''
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
        if (status === 'Partial') return styles.statusPartial;
        return styles.statusPending;
    };

    const COLORS = ['#f59e0b', '#10b981', '#ef4444', '#d97706'];

    if (authLoading) return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Skeleton width={250} height={40} />
                    <Skeleton width={200} height={40} borderRadius={8} />
                </div>
                <div className={styles.statsGrid}>
                    <Skeleton height={100} borderRadius={16} />
                    <Skeleton height={100} borderRadius={16} />
                    <Skeleton height={100} borderRadius={16} />
                </div>
                <div className={styles.chartsGrid} style={{ marginTop: 24 }}>
                    <Skeleton height={300} borderRadius={16} />
                    <Skeleton height={300} borderRadius={16} />
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
                                <div className={styles.statLabel}>Approved / Partial</div>
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
                        </div>

                        <div className={styles.bulkActions}>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>{selectedIds.size} Selected</span>
                            <div style={{ flex: 1 }}></div>
                            <button onClick={handleMarkAsPaid} className={styles.tabBtn} style={{ background: '#e0f2fe', color: '#0284c7' }}>Mark Paid</button>
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
                                        <th>Date/Title</th>
                                        <th>Employee</th>
                                        <th>Breakdown</th>
                                        <th>Total</th>
                                        <th>Approved</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allExpenses.map((exp) => (
                                        <tr key={exp.id} style={{ background: selectedIds.has(exp.id) ? '#f8fafc' : 'transparent', opacity: (exp as any).is_paid ? 0.6 : 1 }}>
                                            <td><input type="checkbox" checked={selectedIds.has(exp.id)} onChange={() => toggleSelect(exp.id)} className={styles.tableCheckbox} /></td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{new Date(exp.date).toLocaleDateString()}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#666' }}>{exp.title}</div>
                                            </td>
                                            <td>
                                                <strong>{exp.users?.name}</strong><br />
                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{exp.users?.department}</span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: '#555' }}>
                                                <div>Daily: ₹{exp.daily_allowance || 0}</div>
                                                <div>Travel: ₹{exp.travel_allowance || 0}</div>
                                                <div style={{ color: '#888' }}>+ Med/Other</div>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>₹{exp.amount.toFixed(2)}</td>
                                            <td>
                                                {exp.approved_amount ?
                                                    <span style={{ color: '#16a34a', fontWeight: 600 }}>₹{exp.approved_amount}</span> :
                                                    '-'
                                                }
                                            </td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${getStatusClass(exp.status)}`}>{exp.status}</span>
                                                {exp.is_paid && <div style={{ fontSize: '0.7rem', color: '#0284c7', marginTop: 4, fontWeight: 600 }}>PAID</div>}
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleOpenReview(exp)}
                                                    className={styles.tabBtn}
                                                    style={{ fontSize: '0.85rem', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                                >
                                                    Review
                                                </button>
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
                                    placeholder="Expense Title (e.g. Site Visit Pune)"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={styles.input}
                                    style={{ gridColumn: 'span 2' }}
                                />
                                <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: 4, display: 'block' }}>Daily Allowance</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={dailyAllowance}
                                            onChange={(e) => setDailyAllowance(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: 4, display: 'block' }}>Travel Allowance</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={travelAllowance}
                                            onChange={(e) => setTravelAllowance(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: 4, display: 'block' }}>Medical Allowance</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={medicalAllowance}
                                            onChange={(e) => setMedicalAllowance(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: 4, display: 'block' }}>Other Allowance</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={otherAllowance}
                                            onChange={(e) => setOtherAllowance(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>
                                </div>

                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className={styles.input}
                                    style={{ gridColumn: 'span 2' }}
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

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                                <span style={{ fontWeight: 600, color: '#64748b' }}>Total Claim Amount:</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000' }}>₹{totalAmount.toFixed(2)}</span>
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
                                            {new Date(expense.date).toLocaleDateString()}
                                        </p>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                                            D: {expense.daily_allowance} | T: {expense.travel_allowance} | M: {expense.medical_allowance} | O: {expense.other_allowance}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className={styles.expenseAmount}>₹{expense.amount.toFixed(2)}</div>
                                        {expense.approved_amount ? <div style={{ fontSize: '0.8rem', color: '#16a34a' }}>Approved: ₹{expense.approved_amount}</div> : null}

                                        <div className={`${styles.statusBadge} ${getStatusClass(expense.status, (expense as any).is_paid)}`} style={{ marginTop: 4 }}>
                                            {(expense as any).is_paid ? 'PAID' : expense.status}
                                        </div>

                                        {(expense.admin_comments || expense.rejection_reason) && (
                                            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 4, maxWidth: '200px' }}>
                                                Note: {expense.admin_comments || expense.rejection_reason}
                                            </div>
                                        )}

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

                {/* Review Modal */}
                {reviewModalOpen && selectedExpense && (
                    <div className={styles.modalOverlay} onClick={() => setReviewModalOpen(false)}>
                        <div className={styles.modal} style={{ width: '500px' }} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeBtn} onClick={() => setReviewModalOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <h3 style={{ marginTop: 0 }}>Review Expense Claim</h3>

                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: '#64748b' }}>Employee:</span>
                                    <span style={{ fontWeight: 600 }}>{selectedExpense.users?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: '#64748b' }}>Total Requested:</span>
                                    <span style={{ fontWeight: 700 }}>₹{selectedExpense.amount}</span>
                                </div>
                                <hr style={{ borderColor: '#e2e8f0', borderStyle: 'solid' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem', marginTop: '8px' }}>
                                    <div>Daily: ₹{selectedExpense.daily_allowance}</div>
                                    <div>Travel: ₹{selectedExpense.travel_allowance}</div>
                                    <div>Medical: ₹{selectedExpense.medical_allowance}</div>
                                    <div>Other: ₹{selectedExpense.other_allowance}</div>
                                </div>
                            </div>

                            {selectedExpense.receipt_url && (
                                <button
                                    onClick={() => setSelectedReceipt(selectedExpense.receipt_url!)}
                                    className={styles.tabBtn}
                                    style={{ width: '100%', border: '1px solid #e2e8f0', marginBottom: '20px' }}
                                >
                                    View Attached Receipt
                                </button>
                            )}

                            <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Approved Amount</label>
                            <input
                                type="number"
                                value={reviewAmount}
                                onChange={(e) => setReviewAmount(e.target.value)}
                                className={styles.input}
                                style={{ marginBottom: '16px' }}
                            />

                            <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Admin Comments / Rejection Reason</label>
                            <textarea
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value as string)}
                                className={styles.textArea}
                                placeholder="Add a note..."
                                style={{ minHeight: '80px', marginBottom: '24px' }}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <button
                                    onClick={() => handleProcessReview('Rejected')}
                                    className={styles.tabBtn}
                                    style={{ background: '#fee2e2', color: '#dc2626' }}
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleProcessReview('Partial')}
                                    className={styles.tabBtn}
                                    style={{ background: '#fef3c7', color: '#d97706' }}
                                >
                                    Partial
                                </button>
                                <button
                                    onClick={() => handleProcessReview('Approved')}
                                    className={styles.tabBtn}
                                    style={{ background: '#dcfce7', color: '#16a34a' }}
                                >
                                    Approve Full
                                </button>
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
