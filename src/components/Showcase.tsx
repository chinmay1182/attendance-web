"use client";

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './Showcase.module.css';

const MOCKUPS = [
    { img: "/mockups/group-62.png", title: "Smart Dashboard", desc: "Get a bird's-eye view of your daily schedule, active hours, and quick actions." },
    { img: "/mockups/group-63.png", title: "One-Tap Attendance", desc: "Clock in seamlessly with location verification and device restrictions." },
    { img: "/mockups/group-64.png", title: "Employee Rewards", desc: "View and redeem rewards earned through your hard work and dedication." },
    { img: "/mockups/group-65.png", title: "Real-time Notifications", desc: "Stay updated with real-time notifications about your attendance, leaves, and rewards." },
    { img: "/mockups/group-66.png", title: "Settings", desc: "Customize your app preferences and manage your account settings." },
    { img: "/mockups/group-67.png", title: "Company Sites", desc: "Manage your company sites and locations." },
    { img: "/mockups/group-68.png", title: "Leave Management", desc: "Apply for leaves, view balances, and track approval status." },
    { img: "/mockups/group-69.png", title: "Expense Claims", desc: "Upload bills and request reimbursements directly from the app." },
];

export default function Showcase() {
    const scrollRef = useRef<HTMLDivElement>(null);
    let isHovering = false;

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        let reqId: number;

        const autoScroll = () => {
            if (!isHovering && el) {
                el.scrollLeft += 0.5; // Auto scroll speed

                // Very basic restart if hit end
                if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
                    el.scrollLeft = 0;
                }
            }
            reqId = requestAnimationFrame(autoScroll);
        };

        reqId = requestAnimationFrame(autoScroll);

        const handleMouseEnter = () => { isHovering = true; };
        const handleMouseLeave = () => { isHovering = false; };

        el.addEventListener('mouseenter', handleMouseEnter);
        el.addEventListener('mouseleave', handleMouseLeave);
        el.addEventListener('touchstart', handleMouseEnter);
        el.addEventListener('touchend', handleMouseLeave);

        return () => {
            cancelAnimationFrame(reqId);
            el.removeEventListener('mouseenter', handleMouseEnter);
            el.removeEventListener('mouseleave', handleMouseLeave);
            el.removeEventListener('touchstart', handleMouseEnter);
            el.removeEventListener('touchend', handleMouseLeave);
        };
    }, []);

    const slideLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: -360, behavior: 'smooth' });
        }
    };

    const slideRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 360, behavior: 'smooth' });
        }
    };

    return (
        <section className={styles.showcaseSection}>
            <div className={styles.showcaseHeader}>
                <div className={styles.headerContent}>
                    <div className={styles.headerText}>
                        <h2 className={styles.sectionTitle}>Available on Google Play Store</h2>
                        <p className={styles.showcaseDesc}>
                            MyAccount Android Application is live on the Google Play Store for a seamless mobile experience. Download now to manage SMT, Attendance & Billing anytime, anywhere.
                        </p>
                    </div>
                    <div className={styles.navArrows}>
                        <button onClick={slideLeft} className={styles.arrowBtn} aria-label="Scroll left" title="Scroll left">
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={styles.arrowIcon}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button onClick={slideRight} className={styles.arrowBtn} aria-label="Scroll right" title="Scroll right">
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={styles.arrowIcon}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.mockupsContainer} ref={scrollRef}>
                <div className={styles.mockupsTrack}>
                    {/* We duplicate the items once so it looks better if you reach the end */}
                    {[...MOCKUPS, ...MOCKUPS].map((m, i) => (
                        <ShowcaseCard key={i} img={m.img} title={m.title} desc={m.desc} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function ShowcaseCard({ img, title, desc }: { img: string, title: string, desc: string }) {
    return (
        <div className={styles.mockupCard}>
            <div className={styles.mockupImageWrapper}>
                <Image src={img} alt={title} width={280} height={560} className={styles.mockupImage} unoptimized />
            </div>
            <div className={styles.mockupInfo}>
                <h4 className={styles.mockupTitle}>{title}</h4>
                <p className={styles.mockupFeature}>{desc}</p>
            </div>
        </div>
    );
}
