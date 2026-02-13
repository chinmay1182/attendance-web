"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './employee-docs.module.css';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

type Employee = {
    id: string; // user_id
    name: string;
    role: string;
    email: string;
    photoURL?: string;
};

type EmployeeDoc = {
    id: string; // uuid
    user_id: string;
    name: string;
    url: string;
    type: string;
    created_at: string;
};

export default function EmployeeDocsPage() {
    const { profile } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
    const [docs, setDocs] = useState<EmployeeDoc[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    // Upload State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [docType, setDocType] = useState('General');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (profile?.role === 'admin' || profile?.role === 'hr') {
            fetchEmployees();
        }
    }, [profile]);

    useEffect(() => {
        if (selectedEmp) {
            fetchDocs(selectedEmp.id);
        }
    }, [selectedEmp]);

    const fetchEmployees = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('name');

        if (data) setEmployees(data);
    };

    const fetchDocs = async (userId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('employee_documents')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (data) setDocs(data);
        else setDocs([]);
        setLoading(false);
    };

    const handleUpload = async () => {
        if (!uploadFile || !selectedEmp) return;
        setUploading(true);

        try {
            // 1. Upload to Storage
            const fileExt = uploadFile.name.split('.').pop();
            const fileName = `${selectedEmp.id}/${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('employee_docs') // Ensure this bucket exists
                .upload(fileName, uploadFile);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase
                .storage
                .from('employee_docs')
                .getPublicUrl(fileName);

            // 3. Insert Record
            const { error: insertError } = await supabase
                .from('employee_documents')
                .insert([{
                    user_id: selectedEmp.id,
                    name: uploadFile.name,
                    url: publicUrl,
                    type: docType
                }]);

            if (insertError) throw insertError;

            toast.success("Document uploaded successfully!");
            setIsUploadOpen(false);
            setUploadFile(null);
            fetchDocs(selectedEmp.id);

        } catch (error: any) {
            console.error(error);
            if (error.message?.includes('Bucket not found')) {
                toast.error("Error: Storage bucket 'employee_docs' is missing. Please contact administrator.");
            } else {
                toast.error(error.message || "Upload failed");
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (docId: string, docUrl: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        // Extract path from URL for storage deletion if needed, 
        // but for now just delete the record is often enough if storage auto-cleans or ignore.
        // Properly: delete from storage too.
        // const path = docUrl.split('/employee_docs/')[1];
        // await supabase.storage.from('employee_docs').remove([path]);

        const { error } = await supabase
            .from('employee_documents')
            .delete()
            .eq('id', docId);

        if (error) {
            toast.error("Failed to delete");
        } else {
            toast.success("Document deleted");
            if (selectedEmp) fetchDocs(selectedEmp.id);
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getIcon = (name: string) => {
        if (name.endsWith('.pdf')) return <span className="material-symbols-outlined">picture_as_pdf</span>;
        if (name.match(/\.(jpg|jpeg|png)$/i)) return <span className="material-symbols-outlined">image</span>;
        return <span className="material-symbols-outlined">description</span>;
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.content}>
                    {/* Sidebar: Employee List */}
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <h3 style={{ margin: 0 }}>Employees</h3>
                            <input
                                type="text"
                                placeholder="Search employees..."
                                className={styles.sidebarSearch}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className={styles.employeeList}>
                            {filteredEmployees.map(emp => (
                                <div
                                    key={emp.id}
                                    className={`${styles.employeeItem} ${selectedEmp?.id === emp.id ? styles.active : ''}`}
                                    onClick={() => setSelectedEmp(emp)}
                                >
                                    <div className={styles.avatar}>
                                        {emp.photoURL ? <img src={emp.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : emp.name.charAt(0)}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{emp.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{emp.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Main Content: Documents */}
                    <main className={styles.mainArea}>
                        {selectedEmp ? (
                            <>
                                <div className={styles.mainHeader}>
                                    <div>
                                        <h2 style={{ margin: 0 }}>{selectedEmp.name}'s Documents</h2>
                                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Manage generic documents, letters, and payslips.</p>
                                    </div>
                                    <button className={styles.addBtn} onClick={() => setIsUploadOpen(true)}>
                                        <span className="material-symbols-outlined">upload_file</span>
                                        Upload Document
                                    </button>
                                </div>

                                <div className={styles.docGrid}>
                                    {loading ? <p>Loading documents...</p> : (
                                        <>
                                            {docs.length === 0 && (
                                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                    No documents found for this employee.
                                                </div>
                                            )}
                                            {docs.map(doc => (
                                                <div key={doc.id} className={styles.docCard} onClick={() => window.open(doc.url, '_blank')}>
                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                        <div className={styles.docIcon}>{getIcon(doc.name)}</div>
                                                        <div className={styles.docInfo} style={{ flex: 1, overflow: 'hidden' }}>
                                                            <h3 title={doc.name}>{doc.name}</h3>
                                                            <p>{doc.type} • {new Date(doc.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className={styles.docActions}>
                                                        <button
                                                            className={styles.actionBtn}
                                                            onClick={(e) => { e.stopPropagation(); window.open(doc.url, '_blank'); }}
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                                                            View
                                                        </button>
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id, doc.url); }}
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px' }}>folder_shared</span>
                                <p>Select an employee from the sidebar to view their documents.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsUploadOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Upload Document</h3>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Document Type</label>
                            <select
                                className={styles.select}
                                value={docType}
                                onChange={e => setDocType(e.target.value)}
                            >
                                <option>General</option>
                                <option>Offer Letter</option>
                                <option>Payslip</option>
                                <option>Contract</option>
                                <option>ID Proof</option>
                            </select>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Select File</label>
                            <input
                                type="file"
                                className={styles.input}
                                onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                className={styles.actionBtn}
                                onClick={() => setIsUploadOpen(false)}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.primaryBtn}
                                onClick={handleUpload}
                                disabled={uploading || !uploadFile}
                                style={{ flex: 2 }}
                            >
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
