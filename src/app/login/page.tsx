"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import styles from "./login.module.css";
import { supabase } from "../../lib/supabaseClient";

const SLIDES = [
    {
        title: <>Empower Your <br /> Workforce.</>,
        subtitle: "Streamline attendance and boost productivity."
    },
    {
        title: <>Seamless <br /> Integration.</>,
        subtitle: "Connect effortlessly with your existing tools."
    },
    {
        title: <>Real-time <br /> Insights.</>,
        subtitle: "Make data-driven decisions with live reporting."
    }
];

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentSlide, setCurrentSlide] = useState(0);

    // New States for Verification Flow
    const [loginStep, setLoginStep] = useState<'credentials' | 'verification'>('credentials');
    const [companyDetails, setCompanyDetails] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        router.prefetch('/dashboard');
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // 0. Resolve Email if Username provided
            let loginEmail = email;
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (!isEmail) {
                // Assume it's a username, lookup email
                const lookupRes = await fetch('/api/auth/lookup-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: email })
                });

                const lookupData = await lookupRes.json();
                if (!lookupRes.ok || !lookupData.email) {
                    throw new Error("Username not found");
                }
                loginEmail = lookupData.email;
            }

            // 1. Authenticate
            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: password,
            });

            if (error) throw error;
            const user = data.user;
            if (!user) throw new Error("No user found");

            // 2. Fetch User Profile
            const profileRes = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.id }),
                cache: 'no-store'
            });

            if (!profileRes.ok) throw new Error("Failed to fetch profile");
            const { user: profileData } = await profileRes.json();
            setUserProfile(profileData);

            // 3. Fetch Company Details if company_id exists
            if (profileData?.company_id) {
                // We need a way to fetch company details. 
                // Since we don't have a dedicated public API for this yet, we can use Supabase client if RLS valid,
                // or simpler: create a small server action or just direct query if allowed.
                // Assuming RLS allows read for authenticated users (which we are now).
                const { data: company, error: companyError } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', profileData.company_id)
                    .single();

                if (company) {
                    setCompanyDetails(company);
                    // Clear any stale local cache
                    if (typeof window !== 'undefined') localStorage.removeItem(`attendance_user_profile_${user.id}`);
                    setLoginStep('verification'); // Go to verification step
                    setLoading(false);
                    return; // Stop here, don't redirect yet
                }
            }

            // If no company or fetch failed, verify logic skips? 
            // Or if admin/employee without company (legacy), just redirect.
            if (typeof window !== 'undefined') localStorage.removeItem(`attendance_user_profile_${user.id}`);
            proceedToDashboard(profileData?.role);

        } catch (err: any) {
            if (err.message === "Username not found") {
                setError("Username not found. Please check or try email.");
            } else {
                setError("Invalid credentials. Please check email/username and password.");
            }
            console.error(err);
            setLoading(false);
        }
    };

    const proceedToDashboard = (role?: string) => {
        if (role === "admin" || role === "hr") {
            router.replace("/dashboard");
        } else {
            router.replace("/dashboard");
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
                        src="/Shared workspace-bro.svg"
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


            {/* 30% Form Side or Verification Side */}
            <div className={styles.formSide}>
                <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <Image src="/myaccount.svg" alt="Attendance Pro" width={220} height={60} priority style={{ objectFit: 'contain' }} />
                    </div>

                    {loginStep === 'credentials' ? (
                        <>
                            <p className={styles.subtitle}>Sign in to continue to Attendance Pro.</p>

                            <form onSubmit={handleLogin} className={styles.form}>
                                <Input
                                    label="Email or Username"
                                    type="text"
                                    placeholder="john@example.com or john_doe"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <Input
                                    label="Password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />

                                {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                                    <Link href="/forgot-password" style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                                        Forgot Password?
                                    </Link>
                                </div>

                                <Button type="submit" isLoading={loading}>
                                    Sign In
                                </Button>
                            </form>

                            <p className={styles.footer}>
                                Don't have an account?
                                <Link href="/signup" className={styles.link}>Sign up</Link>
                            </p>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '16px',
                                overflow: 'hidden',
                                border: '4px solid white',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                {companyDetails?.logo_url ? (
                                    <img src={companyDetails.logo_url} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#64748b' }}>apartment</span>
                                )}
                            </div>

                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>
                                {companyDetails?.name || 'Company Name'}
                            </h2>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>
                                ID: <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{companyDetails?.company_code || 'N/A'}</span>
                            </p>

                            <div style={{ width: '100%', padding: '16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' }}>Logged in as</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                        {userProfile?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 600, color: '#334155' }}>{userProfile?.name}</p>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{email}</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={() => proceedToDashboard(userProfile?.role)}
                                isLoading={loading} // Reuse loading state if needed, though mostly instant here
                            >
                                Verify & Proceed
                            </Button>
                        </div>
                    )}

                    <p className={styles.terms} style={{ marginTop: '24px' }}>
                        By continuing, you agree to our <Link href="#" className={styles.link} style={{ marginLeft: 0 }}>Terms of Service</Link> and <Link href="/privacy-policy" className={styles.link} style={{ marginLeft: 0 }}>Privacy Policy</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}
