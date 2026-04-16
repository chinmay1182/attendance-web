"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "react-hot-toast";
import styles from "../login/login.module.css"; 

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [method, setMethod] = useState<'pin' | 'email'>('email');

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      toast.error('Please enter your email first.');
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch('/api/auth/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      
      let data;
      const textResponse = await res.text();
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        console.error("Non-JSON Server response:", textResponse);
        throw new Error("Server error occurred. Please check console.");
      }

      if (data.success) {
        toast.success('OTP sent to your email! Please check your inbox.');
        setOtpSent(true);
      } else {
        throw new Error(data.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while sending OTP.');
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      if (method === 'pin') {
        const { data, error } = await supabase.rpc('reset_admin_password_with_pin', {
          p_email: email.trim().toLowerCase(),
          p_pin: pin.trim(),
          p_new_password: newPassword
        });

        if (error) throw new Error(error.message);
        if (data?.success) {
          toast.success("Password reset successfully! Please sign in.");
          router.replace("/login");
        } else {
          throw new Error(data?.message || "Invalid Email or PIN.");
        }
      } else {
        // Email OTP Method
        const { data, error } = await supabase.rpc('reset_admin_password_with_otp', {
          p_email: email.trim().toLowerCase(),
          p_otp: otp.trim(),
          p_new_password: newPassword
        });

        if (error) throw new Error(error.message);
        if (data?.success) {
          toast.success("Password reset successfully! Please sign in.");
          router.replace("/login");
        } else {
          throw new Error(data?.message || "Invalid or Expired OTP.");
        }
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "An error occurred. Check your connection.";
      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.animationSide} style={{ backgroundColor: '#fef2f2' }}>
        <div className={styles.illustrationContent}>
          <Image
            src="/Shared workspace-bro.svg"
            alt="Security Lock"
            width={700}
            height={700}
            priority
            style={{ maxWidth: "60%", height: "auto", objectFit: "contain", marginBottom: "20px" }}
          />
          <div className={styles.illustrationText} style={{ color: '#991b1b' }}>Secure <br/> Recovery.</div>
          <div className={styles.illustrationSubtitle} style={{ color: '#7f1d1d' }}>
            Choose how you want to securely regain access to your account.
          </div>
        </div>
      </div>

      <div className={styles.formSide}>
        <div className={styles.card}>
          <div className={styles.logoWrap}>
            <Image src="/myaccount.svg" alt="MyAccount" width={220} height={60} priority style={{ objectFit: "contain" }} />
          </div>

          <p className={styles.subtitle}>Reset Your Password</p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', background: '#f1f5f9', padding: '6px', borderRadius: '10px' }}>
            <button 
              type="button"
              onClick={() => { setMethod('email'); setErrorMsg(""); }} 
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: method === 'email' ? '#0f172a' : '#64748b', background: method === 'email' ? '#fff' : 'transparent', boxShadow: method === 'email' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              Via Email OTP
            </button>
            <button 
              type="button"
              onClick={() => { setMethod('pin'); setErrorMsg(""); }} 
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: method === 'pin' ? '#0f172a' : '#64748b', background: method === 'pin' ? '#fff' : 'transparent', boxShadow: method === 'pin' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              Via Security PIN
            </button>
          </div>

          <form className={styles.form} onSubmit={handleReset}>
            {errorMsg && <div className={styles.error}>{errorMsg}</div>}

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="email">Email Address</label>
              <input
                id="email" type="email" className={styles.input}
                placeholder="name@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required disabled={isLoading || (method === 'email' && otpSent)}
              />
            </div>

            {method === 'email' && !otpSent && (
              <button type="button" onClick={handleSendOtp} className={styles.submitBtn} style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }} disabled={isLoading || !email}>
                {isLoading ? "Sending..." : "Send Reset OTP"}
              </button>
            )}

            {method === 'pin' && (
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="pin">6-Digit Recovery PIN</label>
                <input
                  id="pin" type="text" className={styles.input}
                  placeholder="000000"
                  value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  required disabled={isLoading}
                />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Check your Business Profile settings for this PIN.</p>
              </div>
            )}

            {method === 'email' && otpSent && (
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="otp">Enter 6-Digit OTP</label>
                <input
                  id="otp" type="text" className={styles.input}
                  placeholder="000000"
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  required disabled={isLoading}
                />
              </div>
            )}

            {(method === 'pin' || (method === 'email' && otpSent)) && (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword" type="password" className={styles.input}
                    placeholder="••••••••"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    required disabled={isLoading}
                    minLength={6}
                  />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={isLoading || !email || !newPassword}>
                  {isLoading ? "Processing..." : "Reset Password"}
                </button>
              </>
            )}
          </form>

          <p className={styles.footer}>
            Remembered your password?
            <Link href="/login" className={styles.link}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
