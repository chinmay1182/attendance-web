
"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient'; // Direct supabase call for simplicity in update
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Navbar } from '../../components/Navbar';
import styles from './settings.module.css';

import toast from 'react-hot-toast';

export default function SettingsPage() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [photoURL, setPhotoURL] = useState('');

    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setPhone((profile as any).phone || '');
            setBio((profile as any).bio || '');
            setPhotoURL(profile.photoURL || '');
        }
    }, [profile]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('users')
                .update({ name, phone, bio, photo_url: photoURL })
                .eq('id', user.uid);

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
                    {/* Profile Section (Left) */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>Profile Information</h2>
                        <form onSubmit={handleUpdate}>
                            <div className={styles.avatarSection}>
                                <div className={styles.avatar} style={{ backgroundImage: `url(${photoURL || '/default-avatar.png'})` }}>
                                    {!photoURL && name.charAt(0)}
                                </div>
                                <Input
                                    label="Photo URL"
                                    value={photoURL}
                                    onChange={e => setPhotoURL(e.target.value)}
                                    placeholder="https://example.com/photo.jpg"
                                />
                            </div>

                            <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} />
                            <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
                            <Input label="Bio" value={bio} onChange={e => setBio(e.target.value)} />

                            <Button type="submit" isLoading={loading}>Save Changes</Button>
                        </form>
                    </div>

                    {/* App Settings (Right) */}
                    <div className={styles.card}>
                        <h2 className={styles.sectionTitle}>App Preferences</h2>

                        <div className={styles.settingItem}>
                            <div>
                                <div className={styles.settingLabel}>Email Notifications</div>
                                <div className={styles.settingDesc}>Receive email updates about attendance</div>
                            </div>
                            <input type="checkbox" defaultChecked style={{ accentColor: '#212121', width: 20, height: 20 }} />
                        </div>

                        <div className={styles.settingItem}>
                            <div>
                                <div className={styles.settingLabel}>Dark Mode</div>
                                <div className={styles.settingDesc}>Toggle dark theme (Coming Soon)</div>
                            </div>
                            <input type="checkbox" disabled style={{ width: 20, height: 20 }} />
                        </div>

                        <div className={styles.settingItem}>
                            <div>
                                <div className={styles.settingLabel}>Language</div>
                                <div className={styles.settingDesc}>Select your preferred language</div>
                            </div>
                            <select style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <option>English</option>
                                <option>Spanish</option>
                                <option>French</option>
                            </select>
                        </div>

                        <h2 className={styles.sectionTitle} style={{ marginTop: '40px' }}>Security</h2>
                        <div className={styles.settingItem}>
                            <div>
                                <div className={styles.settingLabel}>Password</div>
                                <div className={styles.settingDesc}>Last changed 3 months ago</div>
                            </div>
                            <Button variant="secondary" onClick={() => alert("Password change flow")}>Change</Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
