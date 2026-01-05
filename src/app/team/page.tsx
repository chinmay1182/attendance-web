
"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Skeleton } from '../../components/Skeleton';
import Image from 'next/image';
import { UserProfile } from '../../types/user';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

import styles from './team.module.css';

export default function TeamPage() {
    const { profile } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');

    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchUsers();
        fetchOnlineStatus();

        // Realtime Online Status AND User List Changes
        const channel = supabase.channel('team_presence')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'attendance' },
                (payload: any) => {
                    const log = payload.new as any;
                    const today = new Date().toISOString().split('T')[0];
                    if (log.date === today) {
                        setOnlineUserIds(prev => {
                            const newSet = new Set(prev);
                            if (log.clock_in && !log.clock_out) {
                                newSet.add(log.user_id);
                            } else {
                                newSet.delete(log.user_id);
                            }
                            return newSet;
                        });
                    }
                }
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchOnlineStatus = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await fetch('/api/team/attendance?date=' + today).then(res => res.json()).catch(() => ({ data: [] }));

        // Alternative if API not available, use Supabase directly
        // const { data } = await supabase.from('attendance').select('user_id').eq('date', today).is('clock_out', null).not('clock_in', 'is', null);

        // Simulating the logic: if we had the data
        if (data) {
            const online = new Set<string>(data.map((r: any) => r.user_id as string));
            setOnlineUserIds(online);
        } else {
            // Direct fetch fallback
            const { data: directData } = await supabase.from('attendance').select('user_id').eq('date', today).is('clock_out', null).not('clock_in', 'is', null);
            if (directData) {
                setOnlineUserIds(new Set(directData.map((d: any) => d.user_id as string)));
            }
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/team');
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

        try {
            const res = await fetch('/api/team', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                toast.success(`User ${name} deleted successfully`);
                setUsers(prev => prev.filter(u => u.id !== id));
            } else {
                toast.error("Failed to delete user");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    const handleExport = () => {
        const worksheet = XLSX.utils.json_to_sheet(users.map(u => ({
            Name: u.name,
            Email: u.email,
            Role: u.role,
            Department: u.department || 'N/A',
            Phone: u.phone || 'N/A',
            Joined: new Date(u.createdAt).toLocaleDateString()
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
        XLSX.writeFile(workbook, "employees_data.xlsx");
        toast.success("Exported successfully");
    };

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All' || user.department === filterDept;
        return matchesSearch && matchesDept;
    });

    // Unique Departments
    const departments = ['All', ...Array.from(new Set(users.map(u => u.department).filter(Boolean)))];

    const canDelete = profile?.role === 'admin';

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.header}>

                    <h1 className={styles.title}>Team & Directory</h1>

                    <div className={styles.actions}>
                        {/* Search Bar */}
                        <div className={styles.searchBox}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>search</span>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>

                        {/* Department Filter */}
                        <select
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className={styles.selectInput}
                        >
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept || 'No Dept'}</option>
                            ))}
                        </select>

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            className={styles.exportBtn}
                        >
                            <span className="material-symbols-outlined">csv</span>
                            Export
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.grid}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className={styles.card}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                    <Skeleton width={80} height={80} borderRadius="50%" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <Skeleton width="60%" height={24} />
                                    <Skeleton width="40%" height={16} />
                                </div>
                                <div className={styles.divider} style={{ margin: '16px 0' }}></div>
                                <Skeleton width="80%" height={32} style={{ margin: '16px auto 0' }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {filteredUsers.map((user) => (
                            <div key={user.id} className={styles.card}>
                                {canDelete && (
                                    <button
                                        onClick={() => handleDelete(user.id, user.name)}
                                        className={styles.deleteBtn}
                                        title="Delete User"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                    </button>
                                )}

                                <div className={styles.avatar}>
                                    {user.photoURL ? (
                                        <Image src={user.photoURL} alt={user.name} width={80} height={80} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        user.name?.charAt(0).toUpperCase()
                                    )}
                                    {onlineUserIds.has(user.id) && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 2,
                                            right: 2,
                                            width: 14,
                                            height: 14,
                                            borderRadius: '50%',
                                            background: '#22c55e',
                                            border: '2px solid white'
                                        }} title="Online Now"></div>
                                    )}
                                </div>

                                <h3 className={styles.name}>{user.name}</h3>
                                <p className={styles.role}>
                                    {user.role}
                                </p>

                                <div className={styles.divider}></div>

                                <div className={styles.info}>
                                    <div className={styles.tags}>
                                        <span className={styles.deptBadge}>{user.department || 'General'}</span>
                                    </div>
                                    <div className={styles.contactActions}>
                                        <button
                                            className={styles.actionBtn}
                                            onClick={() => window.location.href = `mailto:${user.email}`}
                                            title="Send Email"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>mail</span>
                                        </button>
                                        <button
                                            className={styles.actionBtn}
                                            onClick={() => window.location.href = '/chat'}
                                            title="Message"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
