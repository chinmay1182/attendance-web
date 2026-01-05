"use client";

import React, { useState } from "react";
import styles from "../app/page.module.css";

export function FaqItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={styles.faqItem}>
            <div className={styles.faqQuestion} onClick={() => setIsOpen(!isOpen)}>
                <span>{question}</span>
                <span>{isOpen ? '−' : '+'}</span>
            </div>
            {isOpen && <div className={styles.faqAnswer}>{answer}</div>}
        </div>
    );
}
