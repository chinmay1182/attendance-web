"use client";
import React from 'react';
import { Navbar } from '../../components/Navbar';

import styles from './bulk-data.module.css';

export default function BulkDataPage() {
    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Bulk Data Tools</h1>

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <span className={styles.icon}>📥</span>
                        <h3 className={styles.cardTitle}>Import Data</h3>
                        <p className={styles.cardDesc}>Upload CSV/Excel files to bulk import employees, biometric logs, or leave balances.</p>
                        <button className={`${styles.actionBtn} ${styles.primaryBtn}`}>Upload File</button>
                    </div>

                    <div className={styles.card}>
                        <span className={styles.icon}>📤</span>
                        <h3 className={styles.cardTitle}>Export Data</h3>
                        <p className={styles.cardDesc}>Download comprehensive reports of attendance, payroll, and audit logs in Excel/PDF.</p>
                        <button className={`${styles.actionBtn} ${styles.secondaryBtn}`}>Download Report</button>
                    </div>
                </div>
            </div>
        </>
    );
}
