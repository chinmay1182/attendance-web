"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "react-hot-toast";

const SLIDES = [
  {
    title: (
      <>
        Empower Your <br /> Workforce.
      </>
    ),
    subtitle: "Manage attendance faster with a clean, reliable workspace.",
  },
  {
    title: (
      <>
        Seamless <br /> Administration.
      </>
    ),
    subtitle: "Track entries, masters, and reports without slowing down.",
  },
  {
    title: (
      <>
        Real-time <br /> Visibility.
      </>
    ),
    subtitle: "Stay on top of every update with one connected dashboard.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Verification flow states from attendance-web
  const [loginStep, setLoginStep] = useState<'credentials' | 'verification'>('credentials');
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      // 0. Resolve Email if Username provided
      let loginEmail = email;
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!isEmail) {
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) throw authError;
      const user = authData.user;
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
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .single();

        if (company) {
          setCompanyDetails(company);
          setLoginStep('verification');
          setIsLoading(false);
          return;
        }
      }

      proceedToDashboard(profileData?.role);

    } catch (err: any) {
      console.error(err);
      let msg = err.message || "An unexpected error occurred.";
      if (msg === "Username not found") msg = "Username not found. Please check or try email.";
      else if (msg === "Failed to fetch profile") msg = "Server error: Profile setup is incomplete.";

      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToDashboard = (role?: string) => {
    router.replace("/dashboard");
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.animationSide}>
        <div className={`${styles.shape} ${styles.shape1}`} />
        <div className={`${styles.shape} ${styles.shape2}`} />

        <div className={styles.illustrationContent}>
          <Image
            src="/Shared workspace-bro.svg"
            alt="Shared workspace illustration"
            width={700}
            height={700}
            priority
            style={{
              maxWidth: "60%",
              height: "auto",
              objectFit: "contain",
              marginBottom: "20px",
            }}
          />
          <div className={styles.illustrationText}>{SLIDES[currentSlide].title}</div>
          <div className={styles.illustrationSubtitle}>
            {SLIDES[currentSlide].subtitle}
          </div>
        </div>
      </div>

      <div className={styles.formSide}>
        <div className={styles.card}>
          <div className={styles.logoWrap}>
            <Image
              src="/BizKitLogo.svg"
              alt="BizKit"
              width={220}
              height={60}
              priority
              style={{ objectFit: "contain" }}
            />
          </div>

          {loginStep === 'credentials' ? (
            <>
              <p className={styles.subtitle}>Sign in to continue to Attendance Pro.</p>

              <form className={styles.form} onSubmit={handleLogin}>
                {errorMsg && <div className={styles.error}>{errorMsg}</div>}

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="email">
                    Email or Username
                  </label>
                  <input
                    id="email"
                    type="text"
                    name="email"
                    className={styles.input}
                    placeholder="john@example.com or john_doe"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    className={styles.input}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className={styles.helperRow}>
                  <Link href="/forgot-password" className={styles.helperLink}>
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isLoading || !email || !password}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </button>
              </form>

              <p className={styles.footer}>
                Don&apos;t have an account?
                <Link href="/signup" className={styles.link}>
                  Sign up
                </Link>
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
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#111827', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {userProfile?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: '#334155' }}>{userProfile?.name}</p>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{email}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => proceedToDashboard(userProfile?.role)}
                disabled={isLoading}
              >
                Verify & Proceed
              </button>
            </div>
          )}

          <p className={styles.terms}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
