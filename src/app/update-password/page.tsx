
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import styles from '../login/login.module.css';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success('Password updated successfully!');
                router.replace('/login');
            }
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.animationSide}>
                <div className={`${styles.shape} ${styles.shape1}`}></div>
                <div className={`${styles.shape} ${styles.shape2}`}></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20, width: '100%' }}>
                    <Image
                        src="/Shared workspace-bro.svg"
                        alt="Shared Workspace"
                        width={700}
                        height={700}
                        priority
                        style={{ maxWidth: '60%', height: 'auto', objectFit: 'contain', marginBottom: '20px' }}
                    />
                    <div className={styles.illustrationText}>
                        Welcome Back.
                    </div>
                </div>
            </div>
            <div className={styles.formSide}>
                <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <Image src="/myaccount.svg" alt="Attendance Pro" width={220} height={60} priority style={{ objectFit: 'contain' }} />
                    </div>
                    <h2 className={styles.title} style={{ fontSize: '1.5rem' }}>
                        Set New Password
                    </h2>
                    <p className={styles.subtitle}>Create a strong password for your account.</p>
                    <form onSubmit={handleUpdatePassword} className={styles.form}>
                        <Input
                            label="New Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" isLoading={loading}>
                            Update Password
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
