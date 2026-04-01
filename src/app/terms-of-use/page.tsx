"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../privacy-policy/privacy.module.css";

export default function TermsOfUsePage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h1 className={styles.headerTitle}>Terms of Use</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <p className={styles.text}>
            These Terms of Use govern your access to and use of MyAccount
            products, including Attendance, Billing, and SMT.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Acceptance of Terms</h2>
          <p className={styles.text}>
            By accessing or using any MyAccount portal, you agree to comply
            with these terms and all applicable laws.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Permitted Use</h2>
          <p className={styles.text}>
            You may use the platform only for lawful business and operational
            purposes. You agree not to misuse the service, interfere with its
            availability, or attempt unauthorized access to any system.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Accounts and Responsibility</h2>
          <p className={styles.text}>
            You are responsible for maintaining the confidentiality of account
            credentials and for activities performed under your account.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Data and Privacy</h2>
          <p className={styles.text}>
            Your use of the service is also subject to our{" "}
            <Link href="/privacy-policy">Privacy Policy</Link>, which explains
            how data is collected, used, and protected.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Service Availability</h2>
          <p className={styles.text}>
            We may update, suspend, or improve features from time to time to
            maintain platform quality, compliance, or security.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Limitation of Liability</h2>
          <p className={styles.text}>
            MyAccount is provided on an &quot;as available&quot; basis. To the
            fullest extent permitted by law, MyAccount and its operators are not
            liable for indirect, incidental, or consequential damages arising
            from use of the platform.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <p className={styles.text}>
            For questions related to these terms, contact{" "}
            <a href="mailto:support@myaccount.asia">support@myaccount.asia</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
