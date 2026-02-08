"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './companies.module.css';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

type Company = {
    id: string; // uuid
    name: string;
    description?: string;
    location?: string;
    created_at: string;
    owner_id: string; // admin who created it
};

export default function CompaniesPage() {
    const { user, profile } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCompany, setCurrentCompany] = useState<Partial<Company>>({});
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (profile?.role === 'admin') {
            fetchCompanies();

            // Realtime subscription
            const channel = supabase.channel('realtime_companies')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'companies' },
                    (payload) => {
                        handleRealtimeUpdate(payload);
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [profile]);

    const handleRealtimeUpdate = (payload: any) => {
        if (payload.eventType === 'INSERT') {
            setCompanies(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
            setCompanies(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        } else if (payload.eventType === 'DELETE') {
            setCompanies(prev => prev.filter(c => c.id !== payload.old.id));
        }
    };

    const fetchCompanies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setCompanies(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentCompany.name) {
            toast.error("Company name is required");
            return;
        }

        try {
            if (isEditing && currentCompany.id) {
                // Update
                const { error } = await supabase
                    .from('companies')
                    .update({
                        name: currentCompany.name,
                        description: currentCompany.description,
                        location: currentCompany.location
                    })
                    .eq('id', currentCompany.id);

                if (error) throw error;
                toast.success("Company updated");
            } else {
                // Create
                const { error } = await supabase
                    .from('companies')
                    .insert([{
                        name: currentCompany.name,
                        description: currentCompany.description,
                        location: currentCompany.location,
                        owner_id: user?.id
                    }]);

                if (error) throw error;
                toast.success("Company added");
            }
            setIsModalOpen(false);
            setCurrentCompany({});
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Operation failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This action cannot be undone.")) return;

        const { error } = await supabase
            .from('companies')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error("Failed to delete company");
        } else {
            toast.success("Company deleted");
        }
    };

    const openEdit = (company: Company) => {
        setCurrentCompany(company);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setCurrentCompany({});
        setIsEditing(false);
        setIsModalOpen(true);
    };

    if (profile?.role !== 'admin') {
        return (
            <>
                <Navbar />
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h2>Access Denied</h2>
                    <p>Only admins can manage companies.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <Toaster position="top-right" />
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Manage Companies</h1>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Location</th>
                                    <th>Created At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                                ) : (
                                    <>
                                        {companies.length === 0 && (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>No companies found.</td></tr>
                                        )}
                                        {companies.map(comp => (
                                            <tr key={comp.id}>
                                                <td><strong>{comp.name}</strong></td>
                                                <td>{comp.description || '-'}</td>
                                                <td>{comp.location || '-'}</td>
                                                <td>{new Date(comp.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <button className={styles.actionBtn} onClick={() => openEdit(comp)}>Edit</button>
                                                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(comp.id)}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <button className={styles.addBtn} onClick={openAdd} aria-label="Add Company">
                        <span className="material-symbols-outlined">add</span>
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>{isEditing ? 'Edit Company' : 'Add New Company'}</h2>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Company Name *</label>
                            <input
                                className={styles.input}
                                value={currentCompany.name || ''}
                                onChange={e => setCurrentCompany({ ...currentCompany, name: e.target.value })}
                                placeholder="e.g. Acme Corp"
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Location / HQ</label>
                            <input
                                className={styles.input}
                                value={currentCompany.location || ''}
                                onChange={e => setCurrentCompany({ ...currentCompany, location: e.target.value })}
                                placeholder="e.g. New York, USA"
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                value={currentCompany.description || ''}
                                onChange={e => setCurrentCompany({ ...currentCompany, description: e.target.value })}
                                placeholder="Short description..."
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button className={styles.actionBtn} style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className={styles.primaryBtn} style={{ flex: 1 }} onClick={handleSave}>
                                {isEditing ? 'Save Changes' : 'Create Company'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
