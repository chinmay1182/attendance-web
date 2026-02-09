"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAudit, AuditActions, formatAuditDetails } from '../../lib/auditLogger';
import styles from './rewards.module.css';
import toast, { Toaster } from 'react-hot-toast';

type Reward = {
    id: string;
    title: string;
    description: string;
    points: number;
    icon: string;
};

type Employee = {
    id: string;
    name: string;
    email: string;
    reward_points?: number | null;
};

export default function RewardsPage() {
    const { user, profile } = useAuth();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [userPoints, setUserPoints] = useState(0);
    const [liveUpdate, setLiveUpdate] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Admin states
    const isAdmin = profile?.role === 'admin' || profile?.role === 'hr';
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | null>(null);
    const [formData, setFormData] = useState({ title: '', description: '', points: 0, icon: '🏆' });
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedRewardForGrant, setSelectedRewardForGrant] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        fetchRewards();
        if (user) fetchUserPoints();
        if (isAdmin) fetchEmployees();
    }, [user, isAdmin]);

    const fetchRewards = async () => {
        const { data, error } = await supabase
            .from('rewards')
            .select('*')
            .order('points', { ascending: false });

        if (data && data.length > 0) {
            setRewards(data);
        }
    };

    const fetchUserPoints = async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('users')
            .select('reward_points')
            .eq('id', user.id)
            .single();

        if (data) {
            setUserPoints(data.reward_points || 0);
        }
    };

    const fetchEmployees = async () => {
        if (!user?.id) return;

        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, reward_points')
            .neq('id', user.id) // Exclude current user
            .order('name');

        if (error) {
            toast.error('Failed to load employees');
            return;
        }

        if (data) {
            setEmployees(data);
        }
    };

    const handleCreateReward = async () => {
        if (!formData.title || formData.points <= 0) {
            toast.error('Title and valid points required');
            return;
        }

        const { error } = await supabase.from('rewards').insert({
            title: formData.title,
            description: formData.description,
            points: formData.points,
            icon: formData.icon
        });

        if (error) {
            toast.error('Failed to create reward');
        } else {
            toast.success('Reward created successfully!');
            // Log audit
            await logAudit(
                AuditActions.CREATE_REWARD,
                formatAuditDetails.created('reward', formData.title)
            );
            setIsCreateModalOpen(false);
            setFormData({ title: '', description: '', points: 0, icon: '🏆' });
            fetchRewards();
        }
    };

    const handleUpdateReward = async () => {
        if (!editingReward) return;

        const { error } = await supabase
            .from('rewards')
            .update({
                title: formData.title,
                description: formData.description,
                points: formData.points,
                icon: formData.icon
            })
            .eq('id', editingReward.id);

        if (error) {
            toast.error('Failed to update reward');
        } else {
            toast.success('Reward updated!');
            // Log audit
            await logAudit(
                AuditActions.UPDATE_REWARD,
                formatAuditDetails.updated('reward', formData.title)
            );
            setEditingReward(null);
            setFormData({ title: '', description: '', points: 0, icon: '🏆' });
            fetchRewards();
        }
    };

    const handleDeleteReward = async (id: string) => {
        if (!confirm('Are you sure you want to delete this reward?')) return;

        const reward = rewards.find(r => r.id === id);
        const { error } = await supabase.from('rewards').delete().eq('id', id);

        if (error) {
            toast.error('Failed to delete reward');
        } else {
            toast.success('Reward deleted!');
            // Log audit
            if (reward) {
                await logAudit(
                    AuditActions.DELETE_REWARD,
                    formatAuditDetails.deleted('reward', reward.title)
                );
            }
            fetchRewards();
        }
    };

    const handleGrantReward = async () => {
        if (!selectedEmployee || !selectedRewardForGrant) {
            toast.error('Please select employee and reward');
            return;
        }

        const reward = rewards.find(r => r.id === selectedRewardForGrant);
        if (!reward) return;

        const employee = employees.find(e => e.id === selectedEmployee);
        if (!employee) return;

        const newPoints = (employee.reward_points || 0) + reward.points;

        const { error } = await supabase
            .from('users')
            .update({ reward_points: newPoints })
            .eq('id', selectedEmployee);

        if (error) {
            toast.error('Failed to grant reward');
        } else {
            toast.success(`${reward.points} points granted to ${employee.name}! 🎉`);
            // Log audit
            await logAudit(
                AuditActions.GRANT_REWARD,
                formatAuditDetails.granted('points', reward.points, employee.name),
                selectedEmployee
            );
            setIsGrantModalOpen(false);
            setSelectedEmployee('');
            setSelectedRewardForGrant('');
            setEmployeeSearch('');
            fetchEmployees();
        }
    };

    const openEditModal = (reward: Reward) => {
        setEditingReward(reward);
        setFormData({
            title: reward.title,
            description: reward.description,
            points: reward.points,
            icon: reward.icon
        });
    };

    // Filter employees based on search
    const filteredEmployees = employees.filter(emp => {
        if (!emp.name || !emp.email) return false;
        const searchLower = employeeSearch.toLowerCase();
        const nameMatch = emp.name.toLowerCase().includes(searchLower);
        const emailMatch = emp.email.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch;
    });

    useEffect(() => {
        const rewardsChannel = supabase.channel('rewards_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'rewards' },
                (payload: any) => {
                    const rec = payload.new as any;
                    const oldRec = payload.old as any;

                    setLiveUpdate(true);
                    setTimeout(() => setLiveUpdate(false), 2000);

                    if (payload.eventType === 'INSERT') {
                        setRewards(prev => [rec, ...prev]);
                        toast.success('🏆 New Reward Added: ' + rec.title, {
                            icon: '✨',
                            style: { background: '#6366f1', color: '#fff' }
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setRewards(prev => prev.map(r => r.id === rec.id ? { ...r, ...rec } : r));
                        toast('📝 Reward Updated', {
                            icon: '🔄',
                            style: { background: '#3b82f6', color: '#fff' }
                        });
                    } else if (payload.eventType === 'DELETE') {
                        setRewards(prev => prev.filter(r => r.id !== oldRec.id));
                        toast('🗑️ Reward Removed', {
                            icon: '📋',
                            style: { background: '#ef4444', color: '#fff' }
                        });
                    }
                }
            )
            .subscribe();

        let userPointsChannel: any = null;
        if (user?.id) {
            userPointsChannel = supabase.channel('user_points_realtime')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'users',
                        filter: `id=eq.${user.id}`
                    },
                    (payload: any) => {
                        const newPoints = payload.new.reward_points || 0;
                        const oldPoints = payload.old.reward_points || 0;

                        if (newPoints !== oldPoints) {
                            setUserPoints(newPoints);
                            const diff = newPoints - oldPoints;
                            if (diff > 0) {
                                toast.success(`+${diff} Points Earned! 🎉`, {
                                    icon: '⭐',
                                    style: { background: '#10b981', color: '#fff' }
                                });
                            }
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            supabase.removeChannel(rewardsChannel);
            if (userPointsChannel) supabase.removeChannel(userPointsChannel);
        };
    }, [user]);

    const iconOptions = ['🏆', '⭐', '🎯', '💎', '👑', '🎖️', '🥇', '🌟', '✨', '🔥'];

    return (
        <>
            <Toaster position="top-right" />
            <Navbar />
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 className={styles.title}>Rewards & Recognition</h1>
                        <p className={styles.subtitle}>
                            {mounted && isAdmin ? 'Manage rewards and recognize your team!' : 'Celebrate your achievements!'}
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
                            <>
                                <button
                                    onClick={() => setIsGrantModalOpen(true)}
                                    style={{
                                        padding: '12px 24px',
                                        background: '#212121',
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
                                    onMouseOver={(e) => e.currentTarget.style.background = '#000'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#212121'}
                                >
                                    <span className="material-symbols-outlined">card_giftcard</span>
                                    Grant Reward
                                </button>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
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
                                    <span className="material-symbols-outlined">add</span>
                                    Create Reward
                                </button>
                            </>
                        )}
                        {mounted && !isAdmin && (
                            <div style={{
                                padding: '12px 24px',
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                boxShadow: 'var(--glass-shadow)',
                                border: '1px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>stars</span>
                                {userPoints} Points
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.grid}>
                    {rewards.map((reward) => (
                        <div key={reward.id} className={styles.card} style={{
                            animation: 'fadeIn 0.3s ease-in',
                            position: 'relative'
                        }}>
                            {mounted && isAdmin && (
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    display: 'flex',
                                    gap: '8px'
                                }}>
                                    <button
                                        onClick={() => openEditModal(reward)}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            transition: 'var(--transition-fast)'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary)'}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteReward(reward.id)}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            transition: 'var(--transition-fast)'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                            <div className={styles.icon}>{reward.icon}</div>
                            <h3 className={styles.cardTitle}>{reward.title}</h3>
                            <p className={styles.cardDesc}>{reward.description}</p>
                            <div className={styles.pointsBadge}>
                                + {reward.points} Points
                            </div>
                        </div>
                    ))}
                    {rewards.length === 0 && (
                        <div style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: 'var(--text-muted)'
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '64px', opacity: 0.3 }}>emoji_events</span>
                            <p style={{ fontSize: '1.1rem', marginTop: '16px' }}>No rewards available yet.</p>
                            {mounted && isAdmin && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
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
                                    Create First Reward
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Reward Modal */}
            {(isCreateModalOpen || editingReward) && (
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
                        setIsCreateModalOpen(false);
                        setEditingReward(null);
                        setFormData({ title: '', description: '', points: 0, icon: '🏆' });
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
                            {editingReward ? 'Edit Reward' : 'Create New Reward'}
                        </h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)' }}>Icon</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {iconOptions.map(icon => (
                                    <button
                                        key={icon}
                                        onClick={() => setFormData({ ...formData, icon })}
                                        style={{
                                            fontSize: '2rem',
                                            padding: '8px',
                                            border: formData.icon === icon ? '2px solid var(--primary)' : '2px solid var(--glass-border)',
                                            borderRadius: 'var(--radius-md)',
                                            background: formData.icon === icon ? 'var(--primary-light)' : 'var(--bg-card)',
                                            cursor: 'pointer',
                                            transition: 'var(--transition-fast)'
                                        }}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)' }}>Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Employee of the Month"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--glass-border)',
                                    fontSize: '1rem',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-main)'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)' }}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe this reward..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--glass-border)',
                                    fontSize: '1rem',
                                    resize: 'vertical',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-main)'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)' }}>Points *</label>
                            <input
                                type="number"
                                value={formData.points}
                                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                                placeholder="100"
                                min="1"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--glass-border)',
                                    fontSize: '1rem',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-main)'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setIsCreateModalOpen(false);
                                    setEditingReward(null);
                                    setFormData({ title: '', description: '', points: 0, icon: '🏆' });
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: 'var(--text-main)',
                                    transition: 'var(--transition-fast)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingReward ? handleUpdateReward : handleCreateReward}
                                style={{
                                    flex: 1,
                                    padding: '12px',
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
                                {editingReward ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grant Reward Modal */}
            {isGrantModalOpen && (
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
                        setIsGrantModalOpen(false);
                        setSelectedEmployee('');
                        setSelectedRewardForGrant('');
                        setEmployeeSearch('');
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
                        <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--primary)' }}>card_giftcard</span>
                            Grant Reward to Employee
                        </h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)' }}>
                                Search Employee *
                            </label>
                            <input
                                type="text"
                                value={employeeSearch}
                                onChange={(e) => setEmployeeSearch(e.target.value)}
                                placeholder="Type name or email to search..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--glass-border)',
                                    fontSize: '1rem',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-main)',
                                    marginBottom: '12px'
                                }}
                            />

                            {/* Employee List */}
                            <div style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-card)'
                            }}>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => (
                                        <div
                                            key={emp.id}
                                            onClick={() => setSelectedEmployee(emp.id)}
                                            style={{
                                                padding: '12px',
                                                cursor: 'pointer',
                                                background: selectedEmployee === emp.id ? 'var(--primary-light)' : 'transparent',
                                                borderBottom: '1px solid var(--glass-border)',
                                                transition: 'var(--transition-fast)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                            onMouseOver={(e) => {
                                                if (selectedEmployee !== emp.id) {
                                                    e.currentTarget.style.background = 'var(--bg-card-hover)';
                                                }
                                            }}
                                            onMouseOut={(e) => {
                                                if (selectedEmployee !== emp.id) {
                                                    e.currentTarget.style.background = 'transparent';
                                                }
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                                            </div>
                                            <div style={{
                                                padding: '4px 12px',
                                                background: 'var(--primary-light)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                color: 'var(--primary)'
                                            }}>
                                                {emp.reward_points || 0} pts
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {employeeSearch ? 'No employees found' : 'Start typing to search...'}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)' }}>Select Reward *</label>
                            <select
                                value={selectedRewardForGrant}
                                onChange={(e) => setSelectedRewardForGrant(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--glass-border)',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-main)'
                                }}
                            >
                                <option value="">Choose a reward...</option>
                                {rewards.map(reward => (
                                    <option key={reward.id} value={reward.id}>
                                        {reward.icon} {reward.title} (+{reward.points} points)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setIsGrantModalOpen(false);
                                    setSelectedEmployee('');
                                    setSelectedRewardForGrant('');
                                    setEmployeeSearch('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: 'var(--text-main)',
                                    transition: 'var(--transition-fast)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGrantReward}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#212121',
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
                                Grant Reward
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
