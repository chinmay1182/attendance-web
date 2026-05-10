"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from '../shifts/manage-shifts.module.css';
import toast, { Toaster } from 'react-hot-toast';

type ShiftType = {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    company_id: string | null;
    is_global: boolean;
};

type Company = {
    id: string;
    name: string;
};

export default function ManageShiftsPage() {
    const { profile, user } = useAuth();
    const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [isGlobal, setIsGlobal] = useState(false);
    const [targetCompanyId, setTargetCompanyId] = useState('');

    useEffect(() => {
        if (profile?.id) {
            fetchShiftTypes();
            fetchCompanies();
        }
    }, [profile]);

    const fetchShiftTypes = async () => {
        setLoading(true);
        try {
            // Fetch shifts that are either global OR belong to user's company
            const { data, error } = await supabase
                .from('shift_types')
                .select('*')
                .or(`is_global.eq.true,company_id.eq.${profile?.company_id}`)
                .order('name');

            console.log('Shift Types fetched:', data, 'Error:', error);

            if (error) {
                console.error('Fetch shift types error:', error);
                toast.error(`Failed to load shifts: ${error.message}`);
            } else {
                setShiftTypes(data || []);
            }
        } catch (err: any) {
            console.error('Unexpected error:', err);
            toast.error('Failed to load shift templates');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        const { data } = await supabase
            .from('companies')
            .select('id, name')
            .or(`id.eq.${profile?.company_id},owner_id.eq.${user?.id}`);
        
        if (data) {
            setCompanies(data);
            if (data.length > 0) setTargetCompanyId(data[0].id);
        }
    };

    const handleCreateShift = async () => {
        if (!name) return toast.error("Shift name is required");

        try {
            const { error } = await supabase
                .from('shift_types')
                .insert([{
                    name,
                    start_time: startTime,
                    end_time: endTime,
                    is_global: isGlobal,
                    company_id: isGlobal ? null : (targetCompanyId || profile?.company_id)
                }]);

            if (error) throw error;

            toast.success("Shift type created");
            setName('');
            fetchShiftTypes();
        } catch (err: any) {
            toast.error(err.message || "Failed to create shift");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        const { error } = await supabase.from('shift_types').delete().eq('id', id);
        if (!error) {
            toast.success("Shift deleted");
            fetchShiftTypes();
        }
    };

    return (
        <>
            <Navbar />
            <Toaster position="top-right" />
            <div className={styles.container}>
                <h1 className={styles.title}>Manage Shifts</h1>

                <div className={styles.card}>
                    <h3 className={styles.label} style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Create New Shift Template</h3>
                    <div className={styles.grid}>
                        <div>
                            <label className={styles.label}>Shift Name</label>
                            <input 
                                className={styles.input} 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="e.g. Morning Shift" 
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Start Time</label>
                            <input 
                                type="time" 
                                className={styles.input} 
                                value={startTime} 
                                onChange={e => setStartTime(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className={styles.label}>End Time</label>
                            <input 
                                type="time" 
                                className={styles.input} 
                                value={endTime} 
                                onChange={e => setEndTime(e.target.value)} 
                            />
                        </div>
                        {!isGlobal && companies.length > 0 && (
                            <div>
                                <label className={styles.label}>Target Company</label>
                                <select 
                                    className={styles.select} 
                                    value={targetCompanyId} 
                                    onChange={e => setTargetCompanyId(e.target.value)}
                                >
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className={styles.checkboxGroup}>
                        <input 
                            type="checkbox" 
                            id="global" 
                            checked={isGlobal} 
                            onChange={e => setIsGlobal(e.target.checked)} 
                            style={{ width: '20px', height: '20px' }}
                        />
                        <label htmlFor="global" className={styles.label} style={{ marginBottom: 0 }}>Make this shift Global (Available for all companies)</label>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <button className={styles.primaryBtn} onClick={handleCreateShift}>Create Shift Template</button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Timings</th>
                                <th>Scope</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shiftTypes.map(st => (
                                <tr key={st.id}>
                                    <td style={{ fontWeight: 600 }}>{st.name}</td>
                                    <td>{st.start_time.substring(0, 5)} - {st.end_time.substring(0, 5)}</td>
                                    <td>
                                        {st.is_global ? (
                                            <span className={`${styles.badge} ${styles.badgeGlobal}`}>Global</span>
                                        ) : (
                                            <span className={`${styles.badge} ${styles.badgeCompany}`}>
                                                {companies.find(c => c.id === st.company_id)?.name || 'Specific Company'}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(st.id)}>
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {loading && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>⏳ Loading shift templates...</td></tr>
                            )}
                            {shiftTypes.length === 0 && !loading && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No shift templates found. Create one above ☝️</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
