"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './team.module.css';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type Employee = {
    id: string; // uuid
    name: string;
    email: string;
    role: string;
    department?: string;
    company_id?: string;
    created_at: string; // Used as Join Date
    phone?: string;
    site_assignments?: { site_id: string, site: { name: string } }[];
    bio?: string; // Notes
    id_proof?: string;
    address?: string;
};

type Department = { id: string, name: string };
type Site = { id: string, name: string };

export default function TeamPage() {
    const { user, profile } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Online Status
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        email: '',
        password: '', // Only for creation
        role: 'employee',
        department: '',
        siteId: '',
        joiningDate: '', // YYYY-MM-DD
        username: '',
        phone: '',
        bio: '',
        idProof: '',
        address: ''
    });

    const canManage = profile?.role === 'admin' || profile?.role === 'hr';

    useEffect(() => {
        if (profile?.id) {
            fetchData();
            setupRealtime();
        }
    }, [profile?.id]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchEmployees(), fetchDepartments(), fetchSites(), fetchOnlineStatus()]);
        setLoading(false);
    };

    const fetchEmployees = async () => {
        // 1. Fetch Users
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (usersError) {
            console.error('Error fetching users:', usersError);
            toast.error('Failed to load employees');
            return;
        }

        // 2. Fetch Assignments with Site data
        const { data: assignmentsData, error: assignmentsError } = await supabase
            .from('site_assignments')
            .select('user_id, site_id, site:sites(name)');

        if (assignmentsError) {
            console.error('Error fetching assignments:', assignmentsError);
        }

        // 3. Merge Data
        if (usersData) {
            const employeesWithSites = usersData.map(user => {
                const userAssignments = assignmentsData
                    ? assignmentsData.filter((a: any) => a.user_id === user.id)
                    : [];
                return {
                    ...user,
                    site_assignments: userAssignments
                };
            });
            setEmployees(employeesWithSites);
        }
    };

    const fetchDepartments = async () => {
        const { data } = await supabase.from('departments').select('*').order('name');
        if (data) setDepartments(data);
    };

    const fetchSites = async () => {
        const { data } = await supabase.from('sites').select('id, name').order('name');
        if (data) setSites(data);
    };

    const fetchOnlineStatus = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from('attendance')
            .select('user_id')
            .eq('date', today)
            .is('clock_out', null)
            .not('clock_in', 'is', null);

        if (data) {
            setOnlineUserIds(new Set(data.map((d: any) => d.user_id as string)));
        }
    };

    const setupRealtime = () => {
        const channel = supabase.channel('team_page_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchEmployees())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_assignments' }, () => fetchEmployees())
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
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, password }));
    };

    const generateUsername = () => {
        if (!formData.name) {
            toast.error("Please enter a name first");
            return;
        }
        const base = formData.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const random = Math.floor(Math.random() * 1000);
        setFormData(prev => ({ ...prev, username: `${base}${random}` }));
    };

    const handleExport = () => {
        const dataToExport = employees.map(emp => ({
            Name: emp.name,
            Email: emp.email,
            Role: emp.role,
            Department: emp.department || '-',
            Phone: emp.phone || '-',
            Site: emp.site_assignments && emp.site_assignments.length > 0 ? emp.site_assignments[0].site.name : '-',
            Joined: new Date(emp.created_at).toLocaleDateString(),
            Address: emp.address || '-',
            ID_Proof: emp.id_proof || '-',
            Notes: emp.bio || '-'
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(wb, ws, "Employees");
        XLSX.writeFile(wb, "Employees_Data.xlsx");
        toast.success("Exported successfully");
    };

    const handleSave = async () => {
        if (!formData.name || !formData.email || (!isEditing && !formData.password)) {
            toast.error("Please fill required fields (Name, Email, Password)");
            return;
        }

        setSubmitting(true);
        try {
            if (isEditing) {
                // Update existing user
                const updates: any = {
                    name: formData.name,
                    role: formData.role,
                    department: formData.department,
                    phone: formData.phone,
                    bio: formData.bio,
                    id_proof: formData.idProof,
                    address: formData.address
                };

                if (formData.joiningDate) {
                    updates.created_at = new Date(formData.joiningDate).toISOString();
                }

                const { error } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', formData.id);

                if (error) throw error;

                // Update Site Assignment
                await supabase.from('site_assignments').delete().eq('user_id', formData.id);

                if (formData.siteId) {
                    await supabase.from('site_assignments').insert({
                        user_id: formData.id,
                        site_id: formData.siteId,
                        status: 'active'
                    });
                }

                toast.success("Employee updated successfully");
            } else {
                // Create new user via API
                const res = await fetch('/api/team/add-member', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        password: formData.password,
                        role: formData.role,
                        companyId: profile?.company_id || 'default',
                        username: formData.username || formData.email.split('@')[0] + Math.floor(Math.random() * 1000)
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to create user");

                const newUserId = data.userId;

                const updates: any = {
                    department: formData.department,
                    phone: formData.phone,
                    bio: formData.bio,
                    id_proof: formData.idProof,
                    address: formData.address
                };
                if (formData.joiningDate) {
                    updates.created_at = new Date(formData.joiningDate).toISOString();
                }

                await supabase.from('users').update(updates).eq('id', newUserId);

                if (formData.siteId) {
                    await supabase.from('site_assignments').insert({
                        user_id: newUserId,
                        site_id: formData.siteId,
                        status: 'active'
                    });
                }

                toast.success("Employee added successfully");
            }
            setIsModalOpen(false);
            resetForm();
            fetchEmployees();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will delete the user and all associated data.")) return;

        try {
            const res = await fetch('/api/team', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                toast.success("User deleted");
                fetchEmployees();
            } else {
                toast.error("Failed to delete user");
            }
        } catch (error) {
            toast.error("Error deleting user");
        }
    };

    const openAdd = () => {
        resetForm();
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const openEdit = (emp: Employee) => {
        const siteId = emp.site_assignments && emp.site_assignments.length > 0
            ? emp.site_assignments[0].site_id
            : '';

        setFormData({
            id: emp.id,
            name: emp.name,
            email: emp.email,
            password: '',
            role: emp.role,
            department: emp.department || '',
            siteId: siteId,
            joiningDate: emp.created_at ? new Date(emp.created_at).toISOString().split('T')[0] : '',
            username: '',
            phone: emp.phone || '',
            bio: emp.bio || '',
            idProof: emp.id_proof || '',
            address: emp.address || ''
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: '',
            name: '',
            email: '',
            password: '',
            role: 'employee',
            department: '',
            siteId: '',
            joiningDate: new Date().toISOString().split('T')[0],
            username: '',
            phone: '',
            bio: '',
            idProof: '',
            address: ''
        });
    };

    return (
        <>
            <Navbar />

            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 className={styles.title}>Team Members</h1>
                    <button className={styles.actionBtn} onClick={handleExport} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '8px' }}>download</span>
                        Export
                    </button>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name / Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Phone</th>
                                <th>Site</th>
                                <th>Joined Date</th>
                                {canManage && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                            ) : (
                                <>
                                    {employees.length === 0 && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No employees found.</td></tr>
                                    )}
                                    {employees.map(emp => (
                                        <tr key={emp.id}>
                                            <td>
                                                <div className={styles.userInfo}>
                                                    <div className={styles.avatarWrapper}>
                                                        <div className={styles.avatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: '#e2e8f0', color: '#64748b' }}>
                                                            {emp.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {onlineUserIds.has(emp.id) && <div className={styles.statusOnline} title="Online"></div>}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                                                        {(emp.bio) && <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.bio}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.roleBadge} ${styles['role' + emp.role]}`}>
                                                    {emp.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>{emp.department || '-'}</td>
                                            <td>{emp.phone || '-'}</td>
                                            <td>
                                                {emp.site_assignments && emp.site_assignments.length > 0
                                                    ? emp.site_assignments[0].site.name
                                                    : '-'}
                                            </td>
                                            <td>{new Date(emp.created_at).toLocaleDateString()}</td>
                                            {canManage && (
                                                <td>
                                                    <button className={styles.actionBtn} onClick={() => openEdit(emp)}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                                        Edit
                                                    </button>
                                                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(emp.id)}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                        Delete
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ height: '100px' }}></div>

                {/* FAB */}
                {canManage && (
                    <button className={styles.fab} onClick={openAdd} aria-label="Add Employee">
                        <span className="material-symbols-outlined">add</span>
                    </button>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>{isEditing ? 'Edit Employee' : 'Add New Employee'}</h2>

                        <div className={styles.grid}>
                            {/* Name */}
                            <div>
                                <label className={styles.label}>Full Name *</label>
                                <input
                                    className={styles.input}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className={styles.label}>Email Address *</label>
                                <input
                                    className={styles.input}
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                    disabled={isEditing}
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className={styles.label}>Mobile Number</label>
                                <input
                                    className={styles.input}
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="e.g. +91 9876543210"
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label className={styles.label}>Address</label>
                                <input
                                    className={styles.input}
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="City, State"
                                />
                            </div>

                            {/* ID Proof */}
                            <div>
                                <label className={styles.label}>ID Proof (Number)</label>
                                <input
                                    className={styles.input}
                                    value={formData.idProof}
                                    onChange={e => setFormData({ ...formData, idProof: e.target.value })}
                                    placeholder="Passport / Aadhar / PAN"
                                />
                            </div>

                            {/* Notes */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Notes / Bio</label>
                                <textarea
                                    className={styles.input}
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    placeholder="Additional details..."
                                    style={{ height: '80px', resize: 'vertical' }}
                                />
                            </div>

                            {/* Username (Add Only) */}
                            {!isEditing && (
                                <div>
                                    <label className={styles.label}>Username (Optional)</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            className={styles.input}
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            placeholder="e.g. john_doe"
                                        />
                                        <button
                                            type="button"
                                            onClick={generateUsername}
                                            style={{
                                                padding: '0 12px',
                                                background: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Password (Add Only) */}
                            {!isEditing && (
                                <div>
                                    <label className={styles.label}>Password *</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Min. 6 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={generatePassword}
                                            style={{
                                                padding: '0 12px',
                                                background: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Role */}
                            <div>
                                <label className={styles.label}>Role *</label>
                                <select
                                    className={styles.select}
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="employee">Employee</option>
                                    <option value="hr">HR</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {/* Department */}
                            <div>
                                <label className={styles.label}>Department</label>
                                <select
                                    className={styles.select}
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                >
                                    <option value="">-- Select Department --</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Site */}
                            <div>
                                <label className={styles.label}>Assigned Site</label>
                                <select
                                    className={styles.select}
                                    value={formData.siteId}
                                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                                >
                                    <option value="">-- None / Remote --</option>
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Joined Date */}
                            <div>
                                <label className={styles.label}>Joining Date</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={formData.joiningDate}
                                    onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button className={`${styles.modalBtn} ${styles.cancelBtn}`} onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </button>
                            <button className={`${styles.modalBtn} ${styles.primaryBtn}`} onClick={handleSave} disabled={submitting}>
                                {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Employee')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
