"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../login/login.module.css";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "react-hot-toast";

const SLIDES = [
  {
    title: (
      <>
        Join the <br /> Future of Work.
      </>
    ),
    subtitle: "Create your workspace and start managing with ease.",
  },
  {
    title: (
      <>
        Collaborate <br /> Effortlessly.
      </>
    ),
    subtitle: "Bring your team together in one unified platform.",
  },
  {
    title: (
      <>
        Unlock <br /> Potential.
      </>
    ),
    subtitle: "Access powerful tools to grow your business efficiency.",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      // 1. Create User in Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (authError) throw authError;
      const user = data.user;
      if (!user) throw new Error("Signup failed");

      // 2. Create Profile in Supabase via API
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          email: email,
          name: name,
          role: 'admin',
          companyName: companyName,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create user profile");

      toast.success("Account created! Please check your email to confirm.", { duration: 6000 });
      router.push("/dashboard");

    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Failed to create account.";
      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.animationSide}>
        <div className={`${styles.shape} ${styles.shape1}`} />
        <div className={`${styles.shape} ${styles.shape2}`} />

        <div className={styles.illustrationContent}>
          <Image
            src="/At work-bro.svg"
            alt="At work illustration"
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
              alt="MyAccount"
              width={220}
              height={60}
              priority
              style={{ objectFit: "contain" }}
            />
          </div>

          <p className={styles.subtitle}>Join your company workspace.</p>

          <form className={styles.form} onSubmit={handleSignup}>
            {errorMsg && <div className={styles.error}>{errorMsg}</div>}

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="companyName">
                Company Name
              </label>
              <input
                id="companyName"
                type="text"
                className={styles.input}
                placeholder="Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                className={styles.input}
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="jane@example.com"
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
                className={styles.input}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || !email || !password || !name || !companyName}
            >
              {isLoading ? "Signing Up..." : "Sign Up"}
            </button>
          </form>

          <p className={styles.footer}>
            Already have an account?
            <Link href="/login" className={styles.link}>
              Sign in
            </Link>
          </p>

          <p className={styles.terms}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
