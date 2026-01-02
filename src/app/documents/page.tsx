"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './documents.module.css';

type Document = {
    id: number;
    name: string;
    type: string; // 'General' or 'Payslip'
    created_at: string;
    month?: string;
    year?: string;
};

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedMonth, setSelectedMonth] = useState('All');
    const [selectedYear, setSelectedYear] = useState('2024');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        const { data, error } = await supabase.from('documents').select('*');
        if (error || !data || data.length === 0) {
            // Fallback data
            setDocuments([
                { id: 1, name: "Offer Letter.pdf", type: "General", created_at: "2024-01-12" },
                { id: 2, name: "ID Card Front.jpg", type: "General", created_at: "2024-01-15" },
                { id: 3, name: "NDA Signed.pdf", type: "General", created_at: "2024-01-12" },
                { id: 101, name: "Payslip_Jan_2024.pdf", type: "Payslip", created_at: "2024-02-01", month: "Jan", year: "2024" },
                { id: 102, name: "Payslip_Feb_2024.pdf", type: "Payslip", created_at: "2024-03-01", month: "Feb", year: "2024" },
                { id: 103, name: "Payslip_Mar_2024.pdf", type: "Payslip", created_at: "2024-04-01", month: "Mar", year: "2024" },
                { id: 104, name: "Payslip_Oct_2024.pdf", type: "Payslip", created_at: "2024-11-01", month: "Oct", year: "2024" },
            ]);
        } else {
            setDocuments(data);
        }
    };

    const generalDocuments = documents.filter(d => d.type === 'General');
    const payslips = documents.filter(d => d.type === 'Payslip');

    const filteredPayslips = payslips.filter(slip => {
        const monthMatch = selectedMonth === 'All' || slip.month === selectedMonth;
        const yearMatch = slip.year === selectedYear;
        return monthMatch && yearMatch;
    });

    const getIcon = (name: string) => {
        if (name.endsWith('.pdf')) return '📄';
        if (name.endsWith('.jpg') || name.endsWith('.png')) return '🖼️';
        return '📁';
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>My Documents</h1>

                {/* General Documents Section */}
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>General Documents</h2>
                </div>
                <div className={styles.grid}>
                    {generalDocuments.map(doc => (
                        <div key={doc.id} className={styles.docCard}>
                            <div className={styles.icon}>{getIcon(doc.name)}</div>
                            <div className={styles.info}>
                                <h3>{doc.name}</h3>
                                <p>Added on {new Date(doc.created_at).toLocaleDateString()}</p>
                            </div>
                            <button className={styles.downloadBtn}>View</button>
                        </div>
                    ))}
                    {generalDocuments.length === 0 && <p className={styles.emptyState}>No general documents found.</p>}
                </div>

                {/* Payslips Section */}
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Payslips</h2>
                    <div className={styles.filterContainer}>
                        <select
                            className={styles.select}
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            <option value="All">All Months</option>
                            <option value="Jan">January</option>
                            <option value="Feb">February</option>
                            <option value="Mar">March</option>
                            <option value="Apr">April</option>
                            <option value="May">May</option>
                            <option value="Jun">June</option>
                            <option value="Jul">July</option>
                            <option value="Aug">August</option>
                            <option value="Sep">September</option>
                            <option value="Oct">October</option>
                            <option value="Nov">November</option>
                            <option value="Dec">December</option>
                        </select>
                        <select
                            className={styles.select}
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                        </select>
                    </div>
                </div>

                <div className={styles.grid}>
                    {filteredPayslips.length > 0 ? (
                        filteredPayslips.map(slip => (
                            <div key={slip.id} className={styles.docCard}>
                                <div className={styles.icon}>💰</div>
                                <div className={styles.info}>
                                    <h3>{slip.name}</h3>
                                    <p>Generated on {new Date(slip.created_at).toLocaleDateString()}</p>
                                </div>
                                <button className={styles.downloadBtn}>Download</button>
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            No payslips found for {selectedMonth === 'All' ? 'the selected year' : `${selectedMonth} ${selectedYear}`}.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
