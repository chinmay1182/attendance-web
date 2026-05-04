"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Navbar } from '../../components/Navbar';
import styles from './settings.module.css';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const isAdmin = profile?.role === 'admin';

    // Profile fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [department, setDepartment] = useState('');
    const [position, setPosition] = useState('');
    const [bio, setBio] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [recoveryPin, setRecoveryPin] = useState('');

    // App preferences
    const [emailNotif, setEmailNotif] = useState(true);
    const [language, setLanguage] = useState('en');

    const [uploading, setUploading] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // Delete Account State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);

    useEffect(() => {
        if (profile) {
            updateLocalState(profile);

            // Real-time sync for profile updates
            const channel = supabase.channel(`settings_profile_${user?.id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user?.id}` },
                    (payload) => {
                        updateLocalState(payload.new);
                        // toast.success("Profile updated in real-time"); // Optional: prevent spam
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [profile, user]);

    const updateLocalState = (data: any) => {
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setDepartment(data.department || '');
        setPosition(data.position || '');
        setBio(data.bio || '');
        setPhotoURL(data.photo_url || '');
        setRecoveryPin(data.recovery_pin || '');

        if (data.settings) {
            setEmailNotif(data.settings.email_notifications ?? true);
            setLanguage(data.settings.language || 'en');
        }
    };

    const savePreference = async (key: string, value: any) => {
        if (!user) return;

        const newSettings = {
            ...(profile as any)?.settings,
            [key]: value
        };

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.id,
                    updates: { settings: newSettings }
                })
            });

            if (!res.ok) throw new Error('Failed to save preference');
            toast.success("Preference saved");
        } catch (err) {
            toast.error("Failed to save preference");
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user) return;

        try {
            setUploading(true);
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            if (data) {
                setPhotoURL(data.publicUrl);
                // Auto-save to profile via API
                await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: user.id, updates: { photo_url: data.publicUrl } })
                });
                toast.success('Avatar updated!');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error uploading avatar.');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const updates = {
                name,
                phone,
                department,
                position,
                bio,
                photo_url: photoURL,
                recovery_pin: recoveryPin
            };

            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.id,
                    updates
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update profile');
            
            toast.success("Profile updated successfully!");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            setPasswordError("Passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            return;
        }

        setChangingPassword(true);
        setPasswordError('');

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast.success("Password updated successfully!");
            setIsPasswordModalOpen(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to update password");
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        if (!deleteReason.trim()) {
            toast.error("Please provide a reason for account deletion");
            return;
        }
        setDeletingAccount(true);
        try {
            // Always require admin approval regardless of who created the account.
            // Insert a deletion request record for admin to review.
            const { error } = await supabase
                .from('deletion_requests')
                .insert([{
                    user_id: user.id,
                    reason: deleteReason,
                    status: 'pending',
                    requested_at: new Date().toISOString(),
                }]);

            if (error) {
                // If the table doesn't exist yet, we fall back to a helpful message
                if (error.code === '42P01') {
                    toast.error("Deletion requests table not found. Please contact your administrator directly.");
                } else {
                    throw error;
                }
            } else {
                toast.success("Account deletion request submitted. An admin will review and approve it.");
                setIsDeleteModalOpen(false);
                setDeleteReason('');
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to submit deletion request");
        } finally {
            setDeletingAccount(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Account Settings</h1>

                <div className={styles.grid}>
                    {/* Profile Information */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>Profile Information</h2>
                        <form onSubmit={handleUpdate}>
                            <div className={styles.avatarSection}>
                                <div className={styles.avatar} style={{ backgroundImage: photoURL ? `url(${photoURL})` : 'none' }}>
                                    {!photoURL && name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label className={styles.uploadBtn}>
                                        {uploading ? 'Uploading...' : 'Change Photo'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            style={{ display: 'none' }}
                                            disabled={uploading}
                                        />
                                    </label>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Max 2MB. JPG, PNG</span>
                                </div>
                            </div>

                            <Input
                                label="Full Name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />

                            <Input
                                label="Email"
                                value={email}
                                disabled
                                placeholder="Email cannot be changed"
                            />

                            <Input
                                label="Phone Number"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />

                            <Input
                                label="Department"
                                value={department}
                                onChange={e => setDepartment(e.target.value)}
                                placeholder="e.g., Engineering, HR, Sales"
                            />

                            <Input
                                label="Position"
                                value={position}
                                onChange={e => setPosition(e.target.value)}
                                placeholder="e.g., Software Engineer, Manager"
                            />

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Bio</label>
                                <textarea
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    placeholder="Tell us about yourself..."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '14px',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            <Button type="submit" isLoading={loading}>Save Changes</Button>
                        </form>
                    </div>

                    {/* App Preferences */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>App Preferences</h2>

                        <div className={styles.settingItem}>
                            <div>
                                <div className={styles.settingLabel}>Email Notifications</div>
                                <div className={styles.settingDesc}>Receive email updates about attendance and leaves</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={emailNotif}
                                onChange={e => {
                                    setEmailNotif(e.target.checked);
                                    savePreference('email_notifications', e.target.checked);
                                }}
                                style={{ accentColor: 'var(--primary)', width: 20, height: 20 }}
                            />
                        </div>



                        <div className={styles.settingItem}>
                            <div>
                                <div className={styles.settingLabel}>Language</div>
                                <div className={styles.settingDesc}>Select your preferred language</div>
                            </div>
                            <select
                                value={language}
                                onChange={e => {
                                    setLanguage(e.target.value);
                                    savePreference('language', e.target.value);
                                }}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                            </select>
                        </div>

                        <h2 className={styles.sectionTitle} style={{ marginTop: '32px' }}>Security</h2>

                        <div className={styles.settingItem}>
                            <div>
                                <div className={styles.settingLabel}>Password</div>
                                <div className={styles.settingDesc}>Update your password to keep your account secure</div>
                            </div>
                            <Button variant="secondary" onClick={() => setIsPasswordModalOpen(true)}>
                                Change
                            </Button>
                        </div>

                        <div className={styles.settingItem} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginTop: '24px' }}>
                            <div style={{ flex: 1 }}>
                                <div className={styles.settingLabel}>Security PIN (Recovery Code)</div>
                                <div className={styles.settingDesc}>6-digit code used to reset password if email is inaccessible</div>
                                <div style={{ marginTop: '12px', maxWidth: '200px' }}>
                                    <Input
                                        placeholder="000000"
                                        value={recoveryPin}
                                        onChange={e => setRecoveryPin(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                        maxLength={6}
                                    />
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <>
                                <h2 className={styles.sectionTitle} style={{ marginTop: '32px' }}>Admin Settings</h2>

                                <div className={styles.settingItem}>
                                    <div>
                                        <div className={styles.settingLabel}>Role</div>
                                        <div className={styles.settingDesc}>Administrator</div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px',
                                        background: '#10b981',
                                        color: 'white',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}>
                                        ADMIN
                                    </span>
                                </div>

                                <div className={styles.settingItem}>
                                    <div>
                                        <div className={styles.settingLabel}>Company Management</div>
                                        <div className={styles.settingDesc}>Manage company details and settings</div>
                                    </div>
                                    <Button variant="secondary" onClick={() => window.location.href = '/companies'}>
                                        Manage
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Danger Zone — Delete Account */}
                        <h2 className={styles.sectionTitle} style={{ marginTop: '32px', color: '#ef4444', borderBottomColor: '#fee2e2' }}>Danger Zone</h2>
                        <div className={styles.settingItem}>
                            <div>
                                <div className={styles.settingLabel} style={{ color: '#ef4444' }}>Delete Account</div>
                                <div className={styles.settingDesc}>
                                    Request account deletion. Admin approval is required before your account is permanently removed.
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                style={{
                                    padding: '8px 16px', background: '#fff', color: '#ef4444',
                                    border: '1.5px solid #ef4444', borderRadius: '8px',
                                    fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>

                {/* Password Change Modal */}
                {isPasswordModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                    }} onClick={() => setIsPasswordModalOpen(false)}>
                        <div style={{
                            background: 'white', padding: '32px', borderRadius: '16px', width: '400px', maxWidth: '90%'
                        }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginTop: 0 }}>Change Password</h2>

                            <div style={{ marginTop: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '16px' }}
                                    placeholder="Min 6 characters"
                                />
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '16px' }}
                                    placeholder="Re-enter password"
                                />
                            </div>

                            {passwordError && <p style={{ color: 'red', marginTop: '12px', fontSize: '14px' }}>{passwordError}</p>}

                            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#f1f5f9', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <Button onClick={handleChangePassword} isLoading={changingPassword}>
                                    Update Password
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Account Modal */}
                {isDeleteModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                    }} onClick={() => setIsDeleteModalOpen(false)}>
                        <div style={{
                            background: 'white', padding: '32px', borderRadius: '16px', width: '460px', maxWidth: '90%'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#ef4444' }}>warning</span>
                                <h2 style={{ margin: 0, color: '#ef4444' }}>Request Account Deletion</h2>
                            </div>

                            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem', color: '#c2410c' }}>
                                ⚠️ This request will be sent to your admin for approval. Once approved, your account and all associated data will be permanently deleted. This action cannot be undone.
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Reason for Deletion</label>
                                <textarea
                                    value={deleteReason}
                                    onChange={e => setDeleteReason(e.target.value)}
                                    placeholder="Please provide a reason for deleting your account..."
                                    rows={4}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                        fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deletingAccount}
                                    style={{
                                        padding: '10px 20px', borderRadius: '8px', border: 'none',
                                        background: '#ef4444', color: 'white', cursor: 'pointer',
                                        fontWeight: 600, opacity: deletingAccount ? 0.6 : 1
                                    }}
                                >
                                    {deletingAccount ? 'Submitting...' : 'Submit Deletion Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
