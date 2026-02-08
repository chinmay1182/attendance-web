"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import styles from './stats.module.css';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Skeleton } from '../../components/Skeleton';
import { LoadingSpinner } from '../../components/LoadingSpinner';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

type Tab = 'overview' | 'reports' | 'insights';

export default function StatsPage() {
    const { user, profile, loading } = useAuth();
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // -- ADMIN STATE --
    const [adminStats, setAdminStats] = useState({ totalEmployees: 0, todayPresent: 0, todayLate: 0, avgHours: 0 });
    const [attendanceTrends, setAttendanceTrends] = useState<any[]>([]);
    const [deptDistribution, setDeptDistribution] = useState<any[]>([]); // Pie Chart
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [efficiencyTrend, setEfficiencyTrend] = useState<any[]>([]); // Line Chart
    const [deptStatusData, setDeptStatusData] = useState<any[]>([]); // Stacked Bar
    const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

    // Reports Filter State
    const [reportData, setReportData] = useState<any[]>([]);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterDept, setFilterDept] = useState('All');
    const [departments, setDepartments] = useState<string[]>([]);

    // Employee Insight State
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [employeesList, setEmployeesList] = useState<any[]>([]);

    // Employee Personal Stats
    const [personalStats, setPersonalStats] = useState({ present: 0, late: 0, absent: 0 });
    const [monthlyData, setMonthlyData] = useState<any[]>([]);

    useEffect(() => {
        if (profile) {
            if (profile.role === 'admin' || profile.role === 'hr') {
                fetchAdminInitialData();
            } else {
                fetchPersonalStats();
            }
        }
    }, [profile]);

    useEffect(() => {
        if (activeTab === 'reports') fetchReportData();
    }, [filterDate, filterEndDate, filterDept, activeTab]);

    const fetchPersonalStats = async () => {
        setIsLoadingData(true);
        try {
            const { data } = await supabase
                .from('attendance')
                .select('*')
                .eq('user_id', user?.uid)
                .order('date', { ascending: true });

            if (data) {
                let present = 0, late = 0;
                const monthly: any = {};

                data.forEach(log => {
                    const date = new Date(log.date);
                    const monthKey = date.toLocaleString('default', { month: 'short' });

                    if (!monthly[monthKey]) monthly[monthKey] = { name: monthKey, present: 0, late: 0, absent: 0 };

                    if (log.status === 'present' || log.status === 'half-day') {
                        present++;
                        monthly[monthKey].present++;
                        if (log.clock_in) {
                            const hour = new Date(log.clock_in).getHours();
                            const minute = new Date(log.clock_in).getMinutes();
                            if (hour > 10 || (hour === 10 && minute > 0)) {
                                late++;
                                monthly[monthKey].late++;
                            }
                        }
                    } else {
                        monthly[monthKey].absent++;
                    }
                });

                setPersonalStats({ present, late, absent: data.filter(d => d.status === 'absent').length });
                setMonthlyData(Object.values(monthly));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        // Realtime Subscription
        const channel = supabase
            .channel('realtime:attendance')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance' },
                async (payload) => {
                    const newLog = payload.new as any;

                    // 1. Update Recent Logs (Prepend new log)
                    if (payload.eventType === 'INSERT') {
                        // We need user details for the log, fetch briefly (or use optimistic UI)
                        const { data: userData } = await supabase.from('users').select('name, department, photoURL').eq('id', newLog.user_id).single();
                        const enrichedLog = { ...newLog, users: userData };

                        setRecentLogs(prev => [enrichedLog, ...prev.slice(0, 9)]);

                        // 2. Update Counts
                        const isLate = newLog.clock_in && new Date(newLog.clock_in).getHours() >= 10;
                        setAdminStats(prev => ({
                            ...prev,
                            todayPresent: prev.todayPresent + (newLog.status === 'present' || newLog.status === 'half-day' ? 1 : 0),
                            todayLate: prev.todayLate + (isLate ? 1 : 0)
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchAdminInitialData = async () => {
        setIsLoadingData(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            // Run requests in parallel
            const [
                { data: users },
                { data: todayLogs },
                { data: trendData },
                { data: logs }
            ] = await Promise.all([
                supabase.from('users').select('*'),
                supabase.from('attendance').select('*').eq('date', today),
                supabase.from('attendance').select('*').gte('date', sevenDaysAgo).order('date', { ascending: true }),
                supabase.from('attendance').select('*, users(name, department, photoURL)').order('created_at', { ascending: false }).limit(10)
            ]);

            setEmployeesList(users || []);
            const depts = Array.from(new Set(users?.map(u => u.department).filter(Boolean))) as string[];
            setDepartments(['All', ...depts]);

            // Pie Chart Data
            const deptCounts: any = {};
            users?.forEach(u => {
                const d = u.department || 'General';
                deptCounts[d] = (deptCounts[d] || 0) + 1;
            });
            setDeptDistribution(Object.keys(deptCounts).map(k => ({ name: k, value: deptCounts[k] })));

            // Process Trends
            const trendsMap: any = {};
            trendData?.forEach(row => {
                const d = row.date;
                if (!trendsMap[d]) trendsMap[d] = { date: d, Present: 0, Absent: 0, TotalHours: 0, Count: 0 };
                if (row.status === 'present' || row.status === 'half-day') {
                    trendsMap[d].Present++;
                    if (row.total_hours) {
                        trendsMap[d].TotalHours += row.total_hours;
                        trendsMap[d].Count++;
                    }
                } else trendsMap[d].Absent++;
            });

            const trendsArr = Object.values(trendsMap);
            setAttendanceTrends(trendsArr);
            setEfficiencyTrend(trendsArr.map((t: any) => ({
                date: t.date,
                avgHours: t.Count > 0 ? (t.TotalHours / t.Count).toFixed(1) : 0
            })));

            // 4. Stats
            const lateCount = todayLogs?.filter(l => {
                if (!l.clock_in) return false;
                return new Date(l.clock_in).getHours() >= 10;
            }).length || 0;

            const totalHoursToday = todayLogs?.reduce((sum, l) => sum + (l.total_hours || 0), 0) || 0;
            const presentCount = todayLogs?.filter(l => l.status === 'present').length || 0;

            setAdminStats({
                totalEmployees: users?.length || 0,
                todayPresent: presentCount,
                todayLate: lateCount,
                avgHours: presentCount > 0 ? parseFloat((totalHoursToday / presentCount).toFixed(1)) : 0
            });

            // 5. Dept Breakdown (New)
            const deptStats: any = {};
            depts.forEach(d => deptStats[d] = { name: d, Present: 0, Late: 0, Absent: 0 });

            users?.forEach(u => {
                const d = u.department || 'General';
                if (!deptStats[d]) deptStats[d] = { name: d, Present: 0, Late: 0, Absent: 0 };

                const log = todayLogs?.find(l => l.user_id === u.id);
                if (!log) {
                    deptStats[d].Absent++;
                } else if (log.status === 'present' || log.status === 'half-day') {
                    const isLate = log.clock_in && new Date(log.clock_in).getHours() >= 10;
                    if (isLate) deptStats[d].Late++;
                    else deptStats[d].Present++;
                } else {
                    deptStats[d].Absent++;
                }
            });
            setDeptStatusData(Object.values(deptStats));
            setRecentLogs(logs || []);

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const fetchReportData = async () => {
        let query = supabase
            .from('attendance')
            .select('*, users(name, department, email)')
            .gte('date', filterDate)
            .lte('date', filterEndDate)
            .order('date', { ascending: false });

        const { data } = await query;
        if (data) {
            let filtered = data;
            if (filterDept !== 'All') {
                filtered = data.filter(r => r.users?.department === filterDept);
            }
            setReportData(filtered);
        }
    };

    const handleExport = async () => {
        const XLSX = await import('xlsx');
        const dataToExport = reportData.map(row => ({
            Date: row.date,
            Name: row.users?.name,
            Department: row.users?.department,
            Status: row.status,
            ClockIn: row.clock_in ? new Date(row.clock_in).toLocaleTimeString() : '-',
            ClockOut: row.clock_out ? new Date(row.clock_out).toLocaleTimeString() : '-',
            Hours: row.total_hours || 0
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
        XLSX.writeFile(wb, `Attendance_Report_${filterDate}_to_${filterEndDate}.xlsx`);
    };

    const handlePersonalExport = async () => {
        const XLSX = await import('xlsx');
        const { data } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', user?.uid)
            .order('date', { ascending: false });

        if (data && data.length > 0) {
            const dataToExport = data.map(row => ({
                Date: row.date,
                Status: row.status,
                ClockIn: row.clock_in ? new Date(row.clock_in).toLocaleTimeString() : '-',
                ClockOut: row.clock_out ? new Date(row.clock_out).toLocaleTimeString() : '-',
                Hours: row.total_hours || 0
            }));
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "My Attendance");
            XLSX.writeFile(wb, `My_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            alert('No attendance data found to export.');
        }
    };

    const openEmployeeModal = (userId: string) => {
        // Find user and fetch specific stats
        const emp = employeesList.find(u => u.id === userId);
        if (emp) setSelectedEmployee(emp); // In real app, fetch more stats here
        setEmployeeModalOpen(true);
    };

    if (loading) return (
        <>
            <Navbar />
            <div className={styles.container}>
                {/* Header Skeleton */}
                <div style={{ marginBottom: 32 }}>
                    <Skeleton width={300} height={40} style={{ marginBottom: 8 }} />
                    <Skeleton width={150} height={20} />
                </div>

                {/* KPI/Stats Cards Skeleton */}
                <div className={styles.grid}>
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} height={120} borderRadius={16} />
                    ))}
                </div>

                {/* Charts Area Skeleton */}
                <div className={styles.chartsGrid} style={{ marginTop: 32 }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <Skeleton height={340} borderRadius={16} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <Skeleton height={340} borderRadius={16} />
                    </div>
                    <div>
                        <Skeleton height={300} borderRadius={16} />
                    </div>
                    <div>
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
                <>
                    {/* EMPLOYEE VIEW - Conditional Render */}
                    {profile?.role !== 'admin' && profile?.role !== 'hr' ? (
                        <>
                            <div className={styles.header}>
                                <h1 className={styles.title}>My Attendance Log</h1>
                                <button
                                    onClick={() => handlePersonalExport()}
                                    className={styles.btn}
                                    style={{ fontSize: '0.9rem', padding: '6px 12px' }}
                                >
                                    Export Data
                                </button>
                            </div>
                            <div className={styles.grid}>
                                <div className={styles.statCard}>
                                    <h2 className={styles.statValue}>{personalStats.present}</h2>
                                    <p className={styles.statLabel}>Days Present</p>
                                </div>
                                <div className={styles.statCard}>
                                    <h2 className={styles.statValue} style={{ color: '#eab308' }}>{personalStats.late}</h2>
                                    <p className={styles.statLabel}>Late Marks</p>
                                </div>
                                <div className={styles.statCard}>
                                    <h2 className={styles.statValue} style={{ color: '#ef4444' }}>{personalStats.absent}</h2>
                                    <p className={styles.statLabel}>Absences (Yearly)</p>
                                </div>
                            </div>

                            <div className={styles.chartContainer}>
                                <h3 className={styles.chartTitle}>Monthly Overview</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                        <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                        <Legend iconType="circle" />
                                        <Bar dataKey="present" name="Present" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    ) : (
                        /* ADMIN VIEW */
                        <>
                            <div className={styles.header}>
                                <h1 className={styles.title}>Admin Analytics</h1>
                                <span className={styles.dateBadge}>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            </div>

                            <div className={styles.tabs}>
                                <button className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.active : ''}`} onClick={() => setActiveTab('overview')}>
                                    Overview
                                </button>
                                <button className={`${styles.tabBtn} ${activeTab === 'reports' ? styles.active : ''}`} onClick={() => setActiveTab('reports')}>
                                    Detailed Reports
                                </button>
                                <button className={`${styles.tabBtn} ${activeTab === 'insights' ? styles.active : ''}`} onClick={() => setActiveTab('insights')}>
                                    Employee Insights
                                </button>
                            </div>

                            {activeTab === 'overview' && (
                                <>
                                    <div className={styles.grid}>
                                        <div className={styles.statCard}>
                                            <h2 className={styles.statValue}>{adminStats.totalEmployees}</h2>
                                            <p className={styles.statLabel}>Total Workforce</p>
                                        </div>
                                        <div className={styles.statCard}>
                                            <h2 className={styles.statValue} style={{ color: '#22c55e' }}>{adminStats.todayPresent}</h2>
                                            <p className={styles.statLabel}>Present Today</p>
                                        </div>
                                        <div className={styles.statCard}>
                                            <h2 className={styles.statValue} style={{ color: '#eab308' }}>{adminStats.todayLate}</h2>
                                            <p className={styles.statLabel}>Late Arrivals</p>
                                        </div>
                                        <div className={styles.statCard}>
                                            <h2 className={styles.statValue} style={{ color: '#6366f1' }}>{adminStats.avgHours}h</h2>
                                            <p className={styles.statLabel}>Avg Work Hours</p>
                                        </div>
                                    </div>

                                    <div className={styles.chartsGrid}>
                                        {/* Trends */}
                                        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
                                            <h3 className={styles.chartTitle}>Attendance & Efficiency Trends</h3>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <AreaChart data={attendanceTrends}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { weekday: 'short' })} />
                                                    <YAxis />
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                                    <Legend />
                                                    <Area type="monotone" dataKey="Present" stackId="1" stroke="#4f46e5" fill="#4f46e5" />
                                                    <Area type="monotone" dataKey="Absent" stackId="1" stroke="#ef4444" fill="#ef4444" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Department Breakdown */}
                                        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
                                            <h3 className={styles.chartTitle}>Today's Dept. Attendance</h3>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={deptStatusData} layout="horizontal">
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                                    <Legend iconType="circle" />
                                                    <Bar dataKey="Present" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} />
                                                    <Bar dataKey="Late" stackId="a" fill="#f59e0b" />
                                                    <Bar dataKey="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Department Distribution */}
                                        <div className={styles.chartCard}>
                                            <h3 className={styles.chartTitle}>Department Distribution</h3>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie data={deptDistribution} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                                        {deptDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Recent Activity */}
                                        <div className={styles.chartCard}>
                                            <h3 className={styles.chartTitle}>Real-time Activity</h3>
                                            <div className={styles.logsList}>
                                                {recentLogs.map((log) => (
                                                    <div key={log.id} className={styles.logItem} onClick={() => openEmployeeModal(log.users?.id)} style={{ cursor: 'pointer' }}>
                                                        <div className={styles.logUser}>
                                                            <div className={styles.logAvatar}>
                                                                {log.users?.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className={styles.logName}>{log.users?.name}</p>
                                                                <p className={styles.logTime}>{new Date(log.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`${styles.statusBadge} ${log.status === 'present' ? styles.success : styles.error}`}>{log.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'reports' && (
                                <div className={styles.chartCard}>
                                    <div className={styles.toolbar}>
                                        <h3 className={styles.chartTitle} style={{ marginBottom: 0 }}>Attendance Log</h3>
                                        <div className={styles.filters}>
                                            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className={styles.input} />
                                            <span style={{ alignSelf: 'center' }}>to</span>
                                            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className={styles.input} />
                                            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className={styles.select}>
                                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <button onClick={handleExport} className={styles.btn}>Download Excel</button>
                                        </div>
                                    </div>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Employee</th>
                                                    <th>Department</th>
                                                    <th>In Time</th>
                                                    <th>Out Time</th>
                                                    <th>Hours</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.map((row) => (
                                                    <tr key={row.id}>
                                                        <td>{new Date(row.date).toLocaleDateString()}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div className={styles.logAvatar} style={{ width: 24, height: 24, fontSize: '0.7rem' }}>{row.users?.name.charAt(0)}</div>
                                                                {row.users?.name}
                                                            </div>
                                                        </td>
                                                        <td>{row.users?.department || '-'}</td>
                                                        <td>{row.clock_in ? new Date(row.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                        <td>{row.clock_out ? new Date(row.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                        <td>{row.total_hours?.toFixed(1) || 0}</td>
                                                        <td>
                                                            <span className={`${styles.statusBadge} ${row.status === 'present' ? styles.success : styles.error}`}>{row.status}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {reportData.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>No records found</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'insights' && (
                                <div className={styles.chartCard}>
                                    <div className={styles.toolbar}>
                                        <h3>Employee Directory & Stats</h3>
                                        <input
                                            type="text"
                                            placeholder="Search Employee..."
                                            className={styles.input}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase();
                                                // simplistic search for demo
                                            }}
                                        />
                                    </div>
                                    <div className={styles.grid}>
                                        {employeesList.map(emp => (
                                            <div key={emp.id} className={styles.statCard} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px', padding: '24px', cursor: 'pointer' }} onClick={() => openEmployeeModal(emp.id)}>
                                                <div className={styles.logAvatar} style={{ width: 60, height: 60, fontSize: '1.5rem' }}>{emp.name.charAt(0)}</div>
                                                <div>
                                                    <h4 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{emp.name}</h4>
                                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>{emp.role} • {emp.department}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Employee Modal Detail */}
                            {employeeModalOpen && selectedEmployee && (
                                <div className={styles.modalOverlay} onClick={() => setEmployeeModalOpen(false)}>
                                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                                        <button className={styles.closeBtn} onClick={() => setEmployeeModalOpen(false)}>×</button>
                                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                            <div className={styles.logAvatar} style={{ width: 80, height: 80, fontSize: '2rem', margin: '0 auto 16px' }}>
                                                {selectedEmployee.name.charAt(0)}
                                            </div>
                                            <h2>{selectedEmployee.name}</h2>
                                            <p>{selectedEmployee.email}</p>
                                            <div className={styles.statusBadge} style={{ display: 'inline-block', marginTop: '8px' }}>{selectedEmployee.role}</div>
                                        </div>

                                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '24px 0' }} />

                                        <h4>Quick Stats (This Month)</h4>
                                        <div className={styles.grid} style={{ marginTop: '16px', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
                                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                                                <span style={{ display: 'block', color: '#64748b' }}>Attendance</span>
                                                <strong style={{ fontSize: '1.5rem' }}>92%</strong>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                                                <span style={{ display: 'block', color: '#64748b' }}>Avg Hours</span>
                                                <strong style={{ fontSize: '1.5rem' }}>8.4h</strong>
                                            </div>
                                        </div>

                                        <button className={styles.btn} style={{ width: '100%', marginTop: '24px' }} onClick={() => { }}>View Full Profile</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            </div >
        </>
    );
}
