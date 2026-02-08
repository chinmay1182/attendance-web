
"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import styles from "../login/login.module.css";
import { supabase } from "../../lib/supabaseClient";
import toast from 'react-hot-toast';

const SLIDES = [
    {
        title: <>Seamless <br /> Recovery.</>,
        subtitle: "Get back to managing your team in seconds."
    },
    {
        title: <>Secure <br /> Access.</>,
        subtitle: "Your data security is our top priority."
    },
    {
        title: <>Reliable <br /> Platform.</>,
        subtitle: "Count on us to keep your operations running smooth."
    }
];

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'sent'>('idle');
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Verify if email exists
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, role')
                .eq('email', email)
                .single();

            if (userError || !userData) {
                toast.error("Email not found. Please check and try again.");
                setLoading(false);
                return;
            }

            // Only allow admins or HR to reset? Or anyone?
            // "abhi admin ka forgot password banao" -> implies focus on admin.
            // But usually forgot password is for everyone.
            // User specifically said "admin ka...".
            // I'll allow anyone but logic is same.

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) {
                toast.error(error.message);
            } else {
                setStatus('sent');
                toast.success("Reset link sent!");
            }
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            {/* 70% Animation Side */}
            <div className={styles.animationSide}>
                <div className={`${styles.shape} ${styles.shape1}`}></div>
                <div className={`${styles.shape} ${styles.shape2}`}></div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20, width: '100%' }}>
                    <Image
                        src="/Shared workspace-bro.svg" // Reuse same SVG
                        alt="Shared Workspace"
                        width={700}
                        height={700}
                        priority
                        style={{ maxWidth: '60%', height: 'auto', objectFit: 'contain', marginBottom: '20px' }}
                    />
                    <div className={styles.illustrationText}>
                        {SLIDES[currentSlide].title}
                    </div>
                    <div className={styles.illustrationSubtitle}>
                        {SLIDES[currentSlide].subtitle}
                    </div>
                </div>
            </div>


            {/* 30% Form Side */}
            <div className={styles.formSide}>
                <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <Image src="/myaccount.svg" alt="Attendance Pro" width={220} height={60} priority style={{ objectFit: 'contain' }} />
                    </div>

                    {status === 'idle' ? (
                        <>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>
                                Forgot Password?
                            </h2>
                            <p className={styles.subtitle}>Enter your email to receive reset instructions.</p>

                            <form onSubmit={handleReset} className={styles.form}>
                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="admin@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />

                                <Button type="submit" isLoading={loading}>
                                    Send Reset Link
                                </Button>
                            </form>

                            <p className={styles.footer}>
                                Remember your password?
                                <Link href="/login" className={styles.link}>Sign in</Link>
                            </p>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                            <div style={{
                                width: '80px', height: '80px', margin: '0 auto 24px',
                                background: '#dcfce7', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#16a34a' }}>mark_email_read</span>
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Check your email</h3>
                            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
                                We have sent a password reset link to <strong>{email}</strong>.
                                Please check your inbox and click the link to reset your password.
                            </p>
                            <Button type="button" onClick={() => setStatus('idle')} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#475569' }}>
                                Try another email
                            </Button>
                            <p className={styles.footer}>
                                <Link href="/login" className={styles.link}>Back to Login</Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
