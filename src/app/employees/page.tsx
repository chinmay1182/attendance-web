"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

type Employee = {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    position: string;
    phone: string;
    company_id: string;
    created_at: string;
    photo_url?: string;
    shift_start?: string;
    shift_end?: string;
};

const ROLES = ['employee', 'hr', 'manager', 'admin'];

export default function EmployeesPage() {
    const { user, profile } = useAuth();
    const isAdminOrHr = profile?.role === 'admin' || profile?.role === 'hr';

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('All');

    // Create Employee modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newEmp, setNewEmp] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        department: '',
        position: '',
        phone: '',
        shift_start: '09:00',
        shift_end: '18:00',
    });

    // Edit modal state
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editEmp, setEditEmp] = useState<Employee | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user && isAdminOrHr) {
            fetchEmployees();

            const channel = supabase.channel('employees_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchEmployees())
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [user, profile]);

    const fetchEmployees = async () => {
        if (!profile?.company_id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('name');

        if (error) {
            toast.error('Failed to load employees');
        } else {
            setEmployees(data || []);
        }
        setLoading(false);
    };

    const handleCreateEmployee = async () => {
        if (!newEmp.name || !newEmp.email || !newEmp.password) {
            return toast.error('Name, Email and Password are required');
        }
        if (newEmp.password.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setCreating(true);
        try {
            // Step 1: Create auth user via admin API
            const res = await fetch('/api/auth/create-employee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newEmp.name,
                    email: newEmp.email,
                    password: newEmp.password,
                    role: newEmp.role,
                    department: newEmp.department,
                    position: newEmp.position,
                    phone: newEmp.phone,
                    shift_start: newEmp.shift_start,
                    shift_end: newEmp.shift_end,
                    company_id: profile?.company_id,
                    created_by: user?.id,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create employee');

            toast.success(`Employee ${newEmp.name} created successfully!`);
            setIsCreateOpen(false);
            setNewEmp({ name: '', email: '', password: '', role: 'employee', department: '', position: '', phone: '', shift_start: '09:00', shift_end: '18:00' });
            fetchEmployees();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to create employee');
        } finally {
            setCreating(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editEmp) return;
        setSaving(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: editEmp.id,
                    requesterId: user?.id,
                    updates: {
                        name: editEmp.name,
                        department: editEmp.department,
                        position: editEmp.position,
                        phone: editEmp.phone,
                        role: editEmp.role,
                        shift_start: editEmp.shift_start,
                        shift_end: editEmp.shift_end,
                    }
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update employee');

            toast.success('Employee updated successfully!');
            setIsEditOpen(false);
            setEditEmp(null);
            fetchEmployees();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEmployee = async (emp: Employee) => {
        if (!confirm(`Are you sure you want to remove ${emp.name}? This will permanently delete their account.`)) return;

        const { error } = await supabase.from('users').delete().eq('id', emp.id);
        if (error) {
            toast.error('Failed to delete employee: ' + error.message);
        } else {
            toast.success(`${emp.name} has been removed.`);
            fetchEmployees();
        }
    };

    const filtered = employees.filter(e => {
        const matchSearch = e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.department?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchRole = filterRole === 'All' || e.role === filterRole;
        return matchSearch && matchRole;
    });

    if (!isAdminOrHr) {
        return (
            <>
                <Navbar />
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>lock</span>
                    <h2>Access Restricted</h2>
                    <p>You need Admin or HR permissions to view employee management.</p>
                </div>
            </>
        );
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
        fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc'
    };

    return (
        <>
            <Navbar />
            <div style={{ padding: '0', maxWidth: '1200px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 500 }}>Employee Management</h1>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>{employees.length} employees in your company</p>
                    </div>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#212121', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        Add Employee
                    </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search by name, email, department..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ ...inputStyle, flex: '1', minWidth: '240px' }}
                    />
                    <select
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                        style={{ ...inputStyle, width: '160px', flex: 'none' }}
                    >
                        <option value="All">All Roles</option>
                        {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                </div>

                {/* Employee Table */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading employees...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>group</span>
                            No employees found. Click &quot;Add Employee&quot; to create one.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Employee</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Department</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Role</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Shift</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((emp, i) => (
                                    <tr key={emp.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1.1rem', color: '#334155', flexShrink: 0, backgroundImage: emp.photo_url ? `url(${emp.photo_url})` : 'none', backgroundSize: 'cover' }}>
                                                    {!emp.photo_url && emp.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{emp.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{emp.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.9rem' }}>
                                            {emp.department || '-'}<br />
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{emp.position || ''}</span>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                                                background: emp.role === 'admin' ? '#dcfce7' : emp.role === 'hr' ? '#e0f2fe' : '#f1f5f9',
                                                color: emp.role === 'admin' ? '#16a34a' : emp.role === 'hr' ? '#0369a1' : '#64748b'
                                            }}>
                                                {emp.role?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.85rem' }}>
                                            {emp.shift_start && emp.shift_end ? `${emp.shift_start} - ${emp.shift_end}` : 'Not set'}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => { setEditEmp({ ...emp }); setIsEditOpen(true); }}
                                                    style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEmployee(emp)}
                                                    style={{ padding: '6px 12px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span> Remove
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create Employee Modal */}
            {isCreateOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}
                    onClick={() => setIsCreateOpen(false)}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '560px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0 }}>Add New Employee</h2>
                            <button onClick={() => setIsCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Full Name *</label>
                                <input style={inputStyle} value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} placeholder="John Doe" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Email *</label>
                                <input style={inputStyle} type="email" value={newEmp.email} onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} placeholder="john@company.com" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Password *</label>
                                <input style={inputStyle} type="password" value={newEmp.password} onChange={e => setNewEmp({ ...newEmp, password: e.target.value })} placeholder="Min 6 characters" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Role</label>
                                <select style={inputStyle} value={newEmp.role} onChange={e => setNewEmp({ ...newEmp, role: e.target.value })}>
                                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Department</label>
                                <input style={inputStyle} value={newEmp.department} onChange={e => setNewEmp({ ...newEmp, department: e.target.value })} placeholder="e.g., Engineering" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Position</label>
                                <input style={inputStyle} value={newEmp.position} onChange={e => setNewEmp({ ...newEmp, position: e.target.value })} placeholder="e.g., Software Engineer" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Phone</label>
                                <input style={inputStyle} value={newEmp.phone} onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })} placeholder="+91 98765 43210" />
                            </div>
                        </div>

                        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Shift Start</label>
                                <input style={inputStyle} type="time" value={newEmp.shift_start} onChange={e => setNewEmp({ ...newEmp, shift_start: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Shift End</label>
                                <input style={inputStyle} type="time" value={newEmp.shift_end} onChange={e => setNewEmp({ ...newEmp, shift_end: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                            <button onClick={() => setIsCreateOpen(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                            <button onClick={handleCreateEmployee} disabled={creating} style={{ flex: 2, padding: '12px', background: '#212121', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: creating ? 0.6 : 1 }}>
                                {creating ? 'Creating...' : 'Create Employee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Employee Modal */}
            {isEditOpen && editEmp && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}
                    onClick={() => setIsEditOpen(false)}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '560px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0 }}>Edit Employee</h2>
                            <button onClick={() => setIsEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Full Name</label>
                                <input style={inputStyle} value={editEmp.name} onChange={e => setEditEmp({ ...editEmp, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Role</label>
                                <select style={inputStyle} value={editEmp.role} onChange={e => setEditEmp({ ...editEmp, role: e.target.value })}>
                                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Department</label>
                                <input style={inputStyle} value={editEmp.department || ''} onChange={e => setEditEmp({ ...editEmp, department: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Position</label>
                                <input style={inputStyle} value={editEmp.position || ''} onChange={e => setEditEmp({ ...editEmp, position: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Phone</label>
                                <input style={inputStyle} value={editEmp.phone || ''} onChange={e => setEditEmp({ ...editEmp, phone: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Shift Start</label>
                                <input style={inputStyle} type="time" value={editEmp.shift_start || '09:00'} onChange={e => setEditEmp({ ...editEmp, shift_start: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Shift End</label>
                                <input style={inputStyle} type="time" value={editEmp.shift_end || '18:00'} onChange={e => setEditEmp({ ...editEmp, shift_end: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                            <button onClick={() => setIsEditOpen(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                            <button onClick={handleSaveEdit} disabled={saving} style={{ flex: 2, padding: '12px', background: '#212121', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
