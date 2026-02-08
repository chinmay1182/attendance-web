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

    // App preferences
    const [emailNotif, setEmailNotif] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [language, setLanguage] = useState('en');

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
                        toast.success("Profile updated in real-time");
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

        if (data.settings) {
            setEmailNotif(data.settings.email_notifications ?? true);
            setDarkMode(data.settings.dark_mode ?? false);
            setLanguage(data.settings.language || 'en');
        }
    };

    const savePreference = async (key: string, value: any) => {
        if (!user) return;

        const newSettings = {
            ...(profile as any)?.settings,
            [key]: value
        };

        await supabase.from('users').update({ settings: newSettings }).eq('id', user.id);
        toast.success("Preference saved");
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    name,
                    phone,
                    department,
                    position,
                    bio,
                    photo_url: photoURL
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success("Profile updated successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update profile.");
        } finally {
            setLoading(false);
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
                                <Input
                                    label="Photo URL"
                                    value={photoURL}
                                    onChange={e => setPhotoURL(e.target.value)}
                                    placeholder="https://example.com/photo.jpg"
                                />
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
                                <div className={styles.settingLabel}>Dark Mode</div>
                                <div className={styles.settingDesc}>Toggle dark theme appearance</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={e => {
                                    setDarkMode(e.target.checked);
                                    savePreference('dark_mode', e.target.checked);
                                }}
                                style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
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
                            <Button variant="secondary" onClick={() => toast("Password change feature coming soon")}>
                                Change
                            </Button>
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
                    </div>
                </div>
            </div>
        </>
    );
}
