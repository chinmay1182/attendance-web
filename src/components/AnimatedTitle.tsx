"use client";

import React, { useState, useEffect } from 'react';
import styles from '../app/page.module.css';

const WORDS = [
    "Workforce Management",
    "Team Productivity",
    "Leave Approvals",
    "Expense Tracking"
];

export default function AnimatedTitle() {
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);

    useEffect(() => {
        if (subIndex === WORDS[index].length + 1 && !reverse) {
            const timeout = setTimeout(() => setReverse(true), 2000); // Wait 2s before deleting
            return () => clearTimeout(timeout);
        }

        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((prev) => (prev + 1) % WORDS.length);
            return;
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, reverse ? 30 : 80); // Typing speed

        return () => clearTimeout(timeout);
    }, [subIndex, index, reverse]);

    return (
        <span className={`${styles.gradientText} ${styles.animatedTitleContainer}`}>
            {`${WORDS[index].substring(0, subIndex)}`}
            <span className={styles.animatedTitleCursor}> </span>
        </span>
    );
}
