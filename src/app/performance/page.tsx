"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './performance.module.css';
import toast, { Toaster } from 'react-hot-toast';

// Mapped type for UI
type GUIGoal = {
    id: string;
    goal: string;
    progress: number;
    employee_id?: string;
    employee_name?: string;
};

type Employee = {
    id: string;
    name: string;
    email: string;
};

export default function PerformancePage() {
    const { user, profile } = useAuth();
    const [goals, setGoals] = useState<GUIGoal[]>([]);
    const [allGoals, setAllGoals] = useState<GUIGoal[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [liveUpdate, setLiveUpdate] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Admin states
    const isAdmin = profile?.role === 'admin' || profile?.role === 'hr';
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [goalTitle, setGoalTitle] = useState('');
    const [targetProgress, setTargetProgress] = useState(100);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchAllGoals();
            fetchEmployees();
        } else if (user) {
            fetchMyGoals();
        }
    }, [user, isAdmin]);

    const fetchMyGoals = async () => {
        if (!user?.id) return;

        const { data, error } = await supabase
            .from('performance_goals')
            .select('*')
            .eq('employee_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            const mapData = (raw: any[]) => raw.map((d: any) => ({
                id: d.id,
                goal: d.title || d.goal || "Goal",
                progress: d.progress || 0
            }));
            setGoals(mapData(data));
        }
    };

    const fetchAllGoals = async () => {
        const { data, error } = await supabase
            .from('performance_goals')
            .select(`
                *,
                users!performance_goals_employee_id_fkey (
                    name,
                    email
                )
            `)
            .order('created_at', { ascending: false });

        if (data) {
            const mapData = (raw: any[]) => raw.map((d: any) => ({
                id: d.id,
                goal: d.title || d.goal || "Goal",
                progress: d.progress || 0,
                employee_id: d.employee_id,
                employee_name: d.users?.name || 'Unknown'
            }));
            setAllGoals(mapData(data));
        }
    };

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('users')
            .select('id, name, email')
            .neq('role', 'admin')
            .neq('role', 'hr')
            .order('name');

        if (data) {
            setEmployees(data);
        }
    };

    const handleAssignGoal = async () => {
        if (!selectedEmployee || !goalTitle) {
            toast.error('Please select employee and enter goal title');
            return;
        }

        const { error } = await supabase.from('performance_goals').insert({
            employee_id: selectedEmployee,
            title: goalTitle,
            progress: 0,
            target: targetProgress
        });

        if (error) {
            toast.error('Failed to assign goal');
        } else {
            toast.success('Goal assigned successfully! 🎯');
            setIsAssignModalOpen(false);
            setSelectedEmployee('');
            setGoalTitle('');
            setTargetProgress(100);
            fetchAllGoals();
        }
    };

    const handleUpdateProgress = async (goalId: string, newProgress: number) => {
        const { error } = await supabase
            .from('performance_goals')
            .update({ progress: newProgress })
            .eq('id', goalId);

        if (error) {
            toast.error('Failed to update progress');
        } else {
            toast.success('Progress updated! 📈');
            fetchAllGoals();
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        if (!confirm('Are you sure you want to delete this goal?')) return;

        const { error } = await supabase
            .from('performance_goals')
            .delete()
            .eq('id', goalId);

        if (error) {
            toast.error('Failed to delete goal');
        } else {
            toast.success('Goal deleted!');
            fetchAllGoals();
        }
    };

    useEffect(() => {
        const channel = supabase.channel('performance_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'performance_goals' },
                (payload: any) => {
                    setLiveUpdate(true);
                    setTimeout(() => setLiveUpdate(false), 2000);

                    if (payload.eventType === 'UPDATE') {
                        toast.success('📈 Goal Progress Updated!', {
                            icon: '🎯',
                            style: { background: '#10b981', color: '#fff' }
                        });
                    } else if (payload.eventType === 'INSERT') {
                        toast.success('✨ New Goal Assigned!', {
                            icon: '🎯',
                            style: { background: '#6366f1', color: '#fff' }
                        });
                    } else if (payload.eventType === 'DELETE') {
                        toast('🗑️ Goal Removed', {
                            icon: '📋',
                            style: { background: '#ef4444', color: '#fff' }
                        });
                    }

                    // Refresh data
                    if (isAdmin) {
                        fetchAllGoals();
                    } else {
                        fetchMyGoals();
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [isAdmin, user]);

    // Group goals by employee for admin view
    const goalsByEmployee = allGoals.reduce((acc, goal) => {
        const empId = goal.employee_id || 'unknown';
        if (!acc[empId]) {
            acc[empId] = {
                employee_name: goal.employee_name || 'Unknown',
                goals: []
            };
        }
        acc[empId].goals.push(goal);
        return acc;
    }, {} as Record<string, { employee_name: string; goals: GUIGoal[] }>);

    return (
        <>
            <Toaster position="top-right" />
            <Navbar />
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 className={styles.title}>Performance Appraisal</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            {mounted && isAdmin ? 'Manage team performance and goals' : 'Track your performance goals'}
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
                                Live Update
                            </div>
                        )}
                        {mounted && isAdmin && (
                            <button
                                onClick={() => setIsAssignModalOpen(true)}
                                style={{
                                    padding: '12px 24px',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'var(--transition-fast)',
                                    boxShadow: 'var(--glass-shadow)'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary)'}
                            >
                                <span className="material-symbols-outlined">add_task</span>
                                Assign Goal
                            </button>
                        )}
                    </div>
                </div>

                {/* Employee View */}
                {!isAdmin && (
                    <div className={styles.card}>
                        <h3 className={styles.sectionTitle}>My Goals (KPIs) - 2024</h3>
                        <div className={styles.goalsList}>
                            {goals.map((kpi) => (
                                <div key={kpi.id} className={styles.goalItem}>
                                    <div className={styles.goalHeader}>
                                        <strong className={styles.goalTitle}>{kpi.goal}</strong>
                                        <span style={{
                                            background: kpi.progress >= 100 ? '#10b981' : kpi.progress >= 75 ? '#3b82f6' : kpi.progress >= 50 ? '#f59e0b' : '#ef4444',
                                            color: 'white',
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '0.85rem',
                                            fontWeight: 700
                                        }}>{kpi.progress}%</span>
                                    </div>
                                    <div className={styles.progressBarBg}>
                                        <div
                                            className={styles.progressBarFill}
                                            style={{
                                                width: `${kpi.progress}%`,
                                                background: kpi.progress >= 100 ? '#10b981' : kpi.progress >= 75 ? '#3b82f6' : kpi.progress >= 50 ? '#f59e0b' : '#ef4444',
                                                transition: 'width 0.5s ease-in-out'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                            {goals.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.3 }}>flag</span>
                                    <p>No performance goals assigned yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Admin View */}
                {mounted && isAdmin && (
                    <div>
                        {Object.keys(goalsByEmployee).length === 0 ? (
                            <div className={styles.card}>
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '64px', opacity: 0.3 }}>assessment</span>
                                    <p style={{ fontSize: '1.1rem', marginTop: '16px' }}>No performance goals assigned yet.</p>
                                    <button
                                        onClick={() => setIsAssignModalOpen(true)}
                                        style={{
                                            marginTop: '16px',
                                            padding: '12px 24px',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 'var(--radius-md)',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'var(--transition-fast)'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary)'}
                                    >
                                        Assign First Goal
                                    </button>
                                </div>
                            </div>
                        ) : (
                            Object.entries(goalsByEmployee).map(([empId, data]) => (
                                <div key={empId} className={styles.card} style={{ marginBottom: '24px' }}>
                                    <h3 className={styles.sectionTitle}>
                                        <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary)' }}>person</span>
                                        {data.employee_name}
                                    </h3>
                                    <div className={styles.goalsList}>
                                        {data.goals.map((goal) => (
                                            <div key={goal.id} className={styles.goalItem} style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => {
                                                            const newProgress = prompt(`Update progress for "${goal.goal}" (0-100):`, goal.progress.toString());
                                                            if (newProgress !== null) {
                                                                const progress = Math.min(100, Math.max(0, parseInt(newProgress) || 0));
                                                                handleUpdateProgress(goal.id, progress);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: 'var(--primary)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: 'var(--radius-sm)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        Update
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteGoal(goal.id)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: 'var(--radius-sm)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                                <div className={styles.goalHeader}>
                                                    <strong className={styles.goalTitle}>{goal.goal}</strong>
                                                    <span style={{
                                                        background: goal.progress >= 100 ? '#10b981' : goal.progress >= 75 ? '#3b82f6' : goal.progress >= 50 ? '#f59e0b' : '#ef4444',
                                                        color: 'white',
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700
                                                    }}>{goal.progress}%</span>
                                                </div>
                                                <div className={styles.progressBarBg}>
                                                    <div
                                                        className={styles.progressBarFill}
                                                        style={{
                                                            width: `${goal.progress}%`,
                                                            background: goal.progress >= 100 ? '#10b981' : goal.progress >= 75 ? '#3b82f6' : goal.progress >= 50 ? '#f59e0b' : '#ef4444',
                                                            transition: 'width 0.5s ease-in-out'
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Assign Goal Modal */}
            {isAssignModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => {
                        setIsAssignModalOpen(false);
                        setSelectedEmployee('');
                        setGoalTitle('');
                        setTargetProgress(100);
                    }}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: 'var(--radius-lg)',
                            padding: '32px',
                            width: '90%',
                            maxWidth: '500px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            border: '1px solid var(--glass-border)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', color: 'var(--text-main)' }}>
                            Assign Performance Goal
                        </h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)' }}>
                                Select Employee *
                            </label>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--glass-border)',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    background: 'white',
                                    color: 'var(--text-main)'
                                }}
                            >
                                <option value="">Choose an employee...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)' }}>
                                Goal Title *
                            </label>
                            <input
                                type="text"
                                value={goalTitle}
                                onChange={(e) => setGoalTitle(e.target.value)}
                                placeholder="e.g. Complete 50 sales this quarter"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--glass-border)',
                                    fontSize: '1rem',
                                    background: 'white',
                                    color: 'var(--text-main)'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)' }}>
                                Target Progress: {targetProgress}%
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={targetProgress}
                                onChange={(e) => setTargetProgress(parseInt(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setIsAssignModalOpen(false);
                                    setSelectedEmployee('');
                                    setGoalTitle('');
                                    setTargetProgress(100);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'white',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: 'var(--text-main)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignGoal}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Assign Goal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
