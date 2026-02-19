"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './delete.module.css';

export default function DeleteAccountPage() {
    const router = useRouter();

    return (
        <>
            <div className={styles.container}>
                <div className={styles.headerRow}>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <h1 className={styles.headerTitle}>Delete Account Instructions</h1>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>How to Delete Your Account</h2>
                        <p className={styles.text}>
                            We respect your right to control your personal data. If you wish to delete your account and all associated data, please follow the steps below:
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Option 1: In-App Deletion</h2>
                        <div className={styles.bulletPoints}>
                            <span className={styles.bulletPoint}>1. Open the application on your mobile device.</span>
                            <span className={styles.bulletPoint}>2. Log in to your account.</span>
                            <span className={styles.bulletPoint}>3. Navigate to the <strong>Settings</strong> or <strong>Profile</strong> section.</span>
                            <span className={styles.bulletPoint}>4. Scroll down to find the <strong>Delete Account</strong> option.</span>
                            <span className={styles.bulletPoint}>5. Follow the on-screen instructions to confirm the deletion.</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Option 2: Contact Support</h2>
                        <p className={styles.text}>
                            If you are unable to access the app or prefer to request deletion manually, you can contact our support team:
                        </p>
                        <div className={styles.bulletPoints}>
                            <span className={styles.bulletPoint}>• Email us at: <a href="mailto:support@myaccount.asia" style={{ color: 'var(--primary)' }}>support@myaccount.asia</a></span>
                            <span className={styles.bulletPoint}>• Use the subject line: "Request for Account Deletion"</span>
                            <span className={styles.bulletPoint}>• Include your registered email address or username for verification.</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>What Happens When You Delete Your Account?</h2>
                        <p className={styles.text}>
                            Please start the deletion process only if you are sure. Once your account is deleted:
                        </p>
                        <div className={styles.bulletPoints}>
                            <span className={styles.bulletPoint}>• Your personal information will be permanently removed from our active databases.</span>
                            <span className={styles.bulletPoint}>• You will lose access to your attendance history, leave records, and other data associated with your account.</span>
                            <span className={styles.bulletPoint}>• Some data may be retained for a limited period as required by law or for legitimate business purposes (e.g., fraud prevention).</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Data Retention</h2>
                        <p className={styles.text}>
                            We retain your data for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
