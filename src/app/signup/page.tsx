"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import styles from "../login/login.module.css"; // Reuse styles
import { UserRole } from "../../types/user";

const SLIDES = [
    {
        title: <>Join the <br /> Future of Work.</>,
        subtitle: "Create your account and start your journey."
    },
    {
        title: <>Collaborate <br /> Effortlessly.</>,
        subtitle: "Work together with your team seamlessly."
    },
    {
        title: <>Unlock <br /> Potential.</>,
        subtitle: "Access tools that help you grow and succeed."
    }
];

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("employee"); // Default role
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create User in Supabase Auth
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                    },
                },
            });

            if (authError) throw authError;
            const user = data.user;
            if (!user) throw new Error("Signup failed");

            // 2. Create Profile in Public Table (Using our existing API)

            // 3. Create Profile in Supabase
            // 3. Create Profile in Supabase
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: user.id,
                    email: email,
                    name: name,
                    role: role,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to create user profile");
            }



            toast.success("Account created! Please check your email to confirm.", { duration: 6000 });

            // 4. Redirect
            if (role === "admin" || role === "hr") {
                router.push("/dashboard");
            } else {
                router.push("/dashboard");
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                toast.error("This email is already registered. Please login.");
            } else {
                toast.error(err.message || "Failed to create account.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            {/* 70% Animation Side */}
            {/* 70% Animation Side */}
            <div className={styles.animationSide}>
                <div className={`${styles.shape} ${styles.shape1}`}></div>
                <div className={`${styles.shape} ${styles.shape2}`}></div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20, width: '100%' }}>
                    <Image
                        src="/At work-bro.svg"
                        alt="At Work Illustration"
                        width={400}
                        height={400}
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
                    <p className={styles.subtitle}>Join your company workspace</p>

                    <form onSubmit={handleSignup} className={styles.form}>
                        <Input
                            label="Full Name"
                            placeholder="Jane Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="jane@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <div style={{ marginBottom: "20px" }}>
                            <label className={styles.subtitle} style={{ display: "block", marginBottom: "8px", textAlign: "left", fontSize: "0.9rem" }}>Select Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    borderRadius: "12px",
                                    border: "1px solid rgba(0,0,0,0.1)",
                                    color: "black",
                                    outline: "none"
                                }}
                            >
                                <option value="employee" style={{ color: "black" }}>Employee</option>
                                <option value="hr" style={{ color: "black" }}>HR</option>
                                <option value="admin" style={{ color: "black" }}>Admin (Manager)</option>
                            </select>
                        </div>


                        <Button type="submit" isLoading={loading}>
                            Sign Up
                        </Button>
                    </form>

                    <p className={styles.footer}>
                        Already have an account?
                        <Link href="/login" className={styles.link}>Sign in</Link>
                    </p>

                    <p className={styles.terms}>
                        By continuing, you agree to our <Link href="#" className={styles.link} style={{ marginLeft: 0 }}>Terms of Service</Link> and <Link href="#" className={styles.link} style={{ marginLeft: 0 }}>Privacy Policy</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}
