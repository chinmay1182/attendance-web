"use client";
import React from 'react';
import { Navbar } from '../../components/Navbar';
import styles from './company.module.css';

export default function CompanyPage() {
    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Company Details</h1>

                <div className={styles.heroSection}>
                    <div className={styles.logoBox}>ACME</div>
                    <div>
                        <h2>Acme Corp International</h2>
                        <p>Innovating the Future since 1995</p>
                    </div>
                </div>

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h3>About Us</h3>
                        <p>Acme Corp is a leading provider of innovative solutions for the modern world. We specialize in creating high-quality products that improve people's lives.</p>
                    </div>

                    <div className={styles.card}>
                        <h3>Contact Info</h3>
                        <div className={styles.contactItem}>
                            <strong>Email:</strong> <span>contact@acmecorp.com</span>
                        </div>
                        <div className={styles.contactItem}>
                            <strong>Phone:</strong> <span>+1 (555) 123-4567</span>
                        </div>
                        <div className={styles.contactItem}>
                            <strong>Website:</strong> <span>www.acmecorp.com</span>
                        </div>
                    </div>

                    <div className={styles.card}>
                        <h3>Leadership</h3>
                        <div className={styles.contactItem}>
                            <strong>CEO:</strong> <span>John Doe</span>
                        </div>
                        <div className={styles.contactItem}>
                            <strong>CTO:</strong> <span>Jane Smith</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
