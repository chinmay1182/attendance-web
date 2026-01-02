"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebaseClient";
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

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch role to redirect
            // Fetch role securely from server
            const response = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid })
            });

            let role = 'employee';
            if (response.ok) {
                const { user: profileData } = await response.json();
                if (profileData?.role) {
                    role = profileData.role;
                }
            }

            if (role === "admin" || role === "hr") {
                router.push("/team");
            } else {
                router.push("/dashboard");
            }
        } catch (err: any) {
            setError("Invalid email or password.");
            console.error(err);
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


            {/* 30% Form Side */}
            <div className={styles.formSide}>
                <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <Image src="/myaccount.svg" alt="Attendance Pro" width={220} height={60} priority style={{ objectFit: 'contain' }} />
                    </div>
                    <p className={styles.subtitle}>Sign in to continue to Attendance Pro.</p>

                    <form onSubmit={handleLogin} className={styles.form}>
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="john@example.com"
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

                        <Button type="submit" isLoading={loading}>
                            Sign In
                        </Button>
                    </form>

                    <p className={styles.footer}>
                        Don't have an account?
                        <Link href="/signup" className={styles.link}>Sign up</Link>
                    </p>

                    <p className={styles.terms}>
                        By continuing, you agree to our <Link href="#" className={styles.link} style={{ marginLeft: 0 }}>Terms of Service</Link> and <Link href="#" className={styles.link} style={{ marginLeft: 0 }}>Privacy Policy</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}
