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
    address?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    cin?: string;
    contact_number?: string;
    email?: string;
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
                    (payload: any) => {
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
        if (!profile?.company_id) { setLoading(false); return; }
        setLoading(true);
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profile.company_id)
            .order('created_at', { ascending: false });

        if (data) setCompanies(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentCompany.name) {
            toast.error("Company name is required");
            return;
        }

        console.log("Saving company. isEditing:", isEditing, "ID:", currentCompany.id);

        try {
            if (isEditing && currentCompany.id) {
                // Update
                const updatePayload = {
                    name: currentCompany.name,
                    description: currentCompany.description,
                    location: currentCompany.location,
                    address: currentCompany.address,
                    state: currentCompany.state,
                    pincode: currentCompany.pincode,
                    gstin: currentCompany.gstin,
                    cin: currentCompany.cin,
                    contact_number: currentCompany.contact_number,
                    email: currentCompany.email
                };

                console.log("Update payload:", updatePayload);

                const { data, error, count } = await supabase
                    .from('companies')
                    .update(updatePayload)
                    .eq('id', currentCompany.id)
                    .select();

                if (error) {
                    console.error("Supabase update error:", error);
                    throw error;
                }

                console.log("Update response data:", data);

                if (!data || data.length === 0) {
                    console.warn("Update succeeded but no rows were affected. This usually means the ID was not found or RLS blocked the update.");
                    toast.error("Company not found or access denied.");
                } else {
                    toast.success("Company updated");
                    // Manually update the local state to ensure immediate UI update
                    setCompanies(prev => prev.map(c => c.id === currentCompany.id ? data[0] : c));
                }
            } else {
                // Create
                const payload = {
                    name: currentCompany.name,
                    company_code: 'COMP' + Date.now().toString(),
                    description: currentCompany.description,
                    location: currentCompany.location,
                    address: currentCompany.address,
                    state: currentCompany.state,
                    pincode: currentCompany.pincode,
                    gstin: currentCompany.gstin,
                    cin: currentCompany.cin,
                    contact_number: currentCompany.contact_number,
                    email: currentCompany.email,
                    owner_id: user?.id
                };
                
                console.log("Sending insert payload to Supabase:", payload);

                const { data, error } = await supabase
                    .from('companies')
                    .insert([payload])
                    .select();

                if (error) {
                    console.error("Supabase insert error:", error);
                    throw error;
                }
                
                if (data && data.length > 0) {
                    setCompanies(prev => [data[0], ...prev]);
                }
                
                toast.success("Company added");
            }
            setIsModalOpen(false);
            setCurrentCompany({});
            
            // Re-fetch to be absolutely sure
            fetchCompanies();
            
        } catch (error: any) {
            console.error("Operation failed:", error);
            toast.error(error.message || "Operation failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', id);

            if (error) {
                console.error("Delete error:", error);
                toast.error("Failed to delete company: " + error.message);
            } else {
                toast.success("Company deleted");
                // Manually update the local state for immediate feedback
                setCompanies(prev => prev.filter(c => c.id !== id));
            }
        } catch (err: any) {
            console.error("Delete operation failed:", err);
            toast.error("An error occurred during deletion.");
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
                                    <th>Company Details</th>
                                    <th>Description</th>
                                    <th>Location / Address</th>
                                    <th>Tax / Identity</th>
                                    <th>Contact Info</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                                ) : (
                                    <>
                                        {companies.length === 0 && (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No companies found.</td></tr>
                                        )}
                                        {companies.map(comp => (
                                            <tr key={comp.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{comp.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {comp.id.substring(0, 8)}...</div>
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '200px' }}>{comp.description || '-'}</td>
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{comp.location || '-'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{comp.address} {comp.state} {comp.pincode}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '0.85rem' }}><span style={{ color: '#94a3b8' }}>GST:</span> {comp.gstin || '-'}</div>
                                                    <div style={{ fontSize: '0.85rem' }}><span style={{ color: '#94a3b8' }}>CIN:</span> {comp.cin || '-'}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '0.85rem' }}>{comp.contact_number || '-'}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{comp.email || '-'}</div>
                                                </td>
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
                        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>{isEditing ? 'Edit Company' : 'Add New Company (v2)'}</h2>

                        <div className={styles.inputGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Company Name *</label>
                                <input
                                    className={styles.input}
                                    value={currentCompany.name || ''}
                                    onChange={e => setCurrentCompany({ ...currentCompany, name: e.target.value })}
                                    placeholder="e.g. Reliance Industries"
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Location / HQ</label>
                                <input
                                    className={styles.input}
                                    value={currentCompany.location || ''}
                                    onChange={e => setCurrentCompany({ ...currentCompany, location: e.target.value })}
                                    placeholder="e.g. Mumbai, Maharashtra"
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Full Address</label>
                            <input
                                className={styles.input}
                                value={currentCompany.address || ''}
                                onChange={e => setCurrentCompany({ ...currentCompany, address: e.target.value })}
                                placeholder="Street, Building, etc."
                            />
                        </div>

                        <div className={styles.inputGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>State</label>
                                <input
                                    className={styles.input}
                                    value={currentCompany.state || ''}
                                    onChange={e => setCurrentCompany({ ...currentCompany, state: e.target.value })}
                                    placeholder="e.g. Maharashtra"
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Pincode / ZIP</label>
                                <input
                                    className={styles.input}
                                    value={currentCompany.pincode || ''}
                                    onChange={e => setCurrentCompany({ ...currentCompany, pincode: e.target.value })}
                                    placeholder="e.g. 400001"
                                />
                            </div>
                        </div>

                        <div className={styles.inputGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>GSTIN</label>
                                <input
                                    className={styles.input}
                                    value={currentCompany.gstin || ''}
                                    onChange={e => setCurrentCompany({ ...currentCompany, gstin: e.target.value })}
                                    placeholder="e.g. 27AAAAA0000A1Z5"
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>CIN</label>
                                <input
                                    className={styles.input}
                                    value={currentCompany.cin || ''}
                                    onChange={e => setCurrentCompany({ ...currentCompany, cin: e.target.value })}
                                    placeholder="e.g. L12345MH2000PLC123456"
                                />
                            </div>
                        </div>

                        <div className={styles.inputGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Contact Number</label>
                                <input
                                    className={styles.input}
                                    value={currentCompany.contact_number || ''}
                                    onChange={e => setCurrentCompany({ ...currentCompany, contact_number: e.target.value })}
                                    placeholder="e.g. +91 98765 43210"
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Email Address</label>
                                <input
                                    className={styles.input}
                                    type="email"
                                    value={currentCompany.email || ''}
                                    onChange={e => setCurrentCompany({ ...currentCompany, email: e.target.value })}
                                    placeholder="contact@company.in"
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                value={currentCompany.description || ''}
                                onChange={e => setCurrentCompany({ ...currentCompany, description: e.target.value })}
                                placeholder="Short description..."
                                style={{ minHeight: '60px' }}
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
