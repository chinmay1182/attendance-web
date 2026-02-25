"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./HeroRightSlider.module.css";

const FEATURES = [
    "100% Free Core Modules",
    "No Hidden Charges",
    "Built for Compliance & Growth",
    "Secure & Cloud-Based Access",
];

export default function HeroRightSlider() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % FEATURES.length);
        }, 2500); // Change text every 2.5 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <div className={styles.heroRightCard}>
            {/* Floating Shapes imitating Login Page left side but matching hero theme */}
            <div className={`${styles.shape} ${styles.shape1}`}></div>
            <div className={`${styles.shape} ${styles.shape2}`}></div>

            <div className={styles.contentWrapper}>
                <div className={styles.imageWrapper}>
                    <Image
                        src="/Shared workspace-bro.svg"
                        alt="Workspace Illustration"
                        width={850}
                        height={850}
                        priority
                        style={{ width: "95%", maxWidth: "600px", height: "auto", objectFit: "contain" }}
                    />
                </div>
                <div className={styles.textSliderWrapper}>
                    {FEATURES.map((text, idx) => (
                        <div
                            key={idx}
                            className={`${styles.slideText} ${idx === currentIndex ? styles.active : styles.inactive
                                }`}
                        >
                            {text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
