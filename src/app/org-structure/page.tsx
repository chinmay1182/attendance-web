"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './org-structure.module.css';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

type Department = {
    id: string;
    name: string;
};

export default function OrgStructurePage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDept, setCurrentDept] = useState<Partial<Department>>({});
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .order('name', { ascending: true });

        if (data) setDepartments(data);
        setLoading(false);
    };

    useEffect(() => {
        const channel = supabase.channel('org_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => fetchDepartments())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleSave = async () => {
        if (!currentDept.name) {
            toast.error("Department name is required");
            return;
        }

        try {
            if (isEditing && currentDept.id) {
                // Update
                const { error } = await supabase
                    .from('departments')
                    .update({ name: currentDept.name })
                    .eq('id', currentDept.id);

                if (error) throw error;
                toast.success("Department updated");
            } else {
                // Add
                const { error } = await supabase
                    .from('departments')
                    .insert([{ name: currentDept.name }]);

                if (error) throw error;
                toast.success("Department added");
            }
            setIsModalOpen(false);
            setCurrentDept({});
        } catch (error: any) {
            console.error(error);
            toast.error("Operation failed");
        }
    };

    const handleDeleteDepartment = async (id: string) => {
        if (!confirm("Are you sure you want to delete this department?")) return;

        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error("Failed to delete department");
        } else {
            toast.success("Department deleted");
        }
    };

    const openAdd = () => {
        setCurrentDept({});
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const openEdit = (dept: Department) => {
        setCurrentDept(dept);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    return (
        <>
            <Navbar />
            <Toaster position="top-right" />
            <div className={styles.container}>
                <h1 className={styles.title}>Organization Structure</h1>
                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>Departments</h3>
                        <ul className={styles.list}>
                            {departments.map(dept => (
                                <li key={dept.id} className={styles.listItem}>
                                    <span>{dept.name}</span>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => openEdit(dept)}
                                            className={styles.iconBtn}
                                            title="Edit"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDepartment(dept.id)}
                                            className={styles.iconBtn}
                                            title="Delete"
                                            style={{ color: '#ef4444' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                        </button>
                                    </div>
                                </li>
                            ))}
                            {departments.length === 0 && !loading && (
                                <li className={styles.listItem} style={{ justifyContent: 'center', color: '#94a3b8' }}>
                                    No departments found.
                                </li>
                            )}
                            {loading && <li className={styles.listItem} style={{ justifyContent: 'center' }}>Loading...</li>}
                        </ul>
                    </div>
                </div>

                {/* FAB */}
                <button className={styles.fab} onClick={openAdd} aria-label="Add Department">
                    <span className="material-symbols-outlined">add</span>
                </button>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>{isEditing ? 'Edit Department' : 'Add Department'}</h2>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Department Name</label>
                            <input
                                className={styles.input}
                                value={currentDept.name || ''}
                                onChange={e => setCurrentDept({ ...currentDept, name: e.target.value })}
                                autoFocus
                                placeholder="e.g. Engineering"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSave();
                                    if (e.key === 'Escape') setIsModalOpen(false);
                                }}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button className={`${styles.modalBtn} ${styles.cancelBtn}`} onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </button>
                            <button className={`${styles.modalBtn} ${styles.primaryBtn}`} onClick={handleSave}>
                                {isEditing ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
