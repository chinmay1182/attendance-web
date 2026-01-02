"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './automation-rules.module.css';

type Rule = {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
};

export default function AutomationRulesPage() {
    const [rules, setRules] = useState<Rule[]>([]);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        const { data, error } = await supabase.from('automation_rules').select('*');

        if (error || !data || data.length === 0) {
            setRules([
                { id: '1', name: "Late Mark Auto-Deduction", description: "If late > 3 times, deduct 0.5 CL.", is_active: true },
                { id: '2', name: "Overtime Calculation", description: "If working hours > 9 hrs, mark as Overtime.", is_active: true },
                { id: '3', name: "Auto-Checkout", description: "If checkout missing at 11:59 PM, auto-checkout.", is_active: false }
            ]);
        } else {
            setRules(data);
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Automation Rules</h1>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h3 className={styles.subTitle}>Active Rules</h3>
                        <button className={styles.createBtn}>+ Create Rule</button>
                    </div>

                    <div className={styles.rulesList}>
                        {rules.map((rule, i) => (
                            <div key={i} className={styles.ruleItem}>
                                <div>
                                    <h4 className={styles.ruleName}>{rule.name}</h4>
                                    <p className={styles.ruleDesc}>{rule.description}</p>
                                </div>
                                <div className={styles.meta}>
                                    <span className={`${styles.badge} ${rule.is_active ? styles.active : styles.inactive}`}>
                                        {rule.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <button className={styles.editBtn}>Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
