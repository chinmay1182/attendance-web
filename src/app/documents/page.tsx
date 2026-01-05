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
        try {
            const res = await fetch('/api/documents', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Failed to fetch documents", error);
        }
    };

    useEffect(() => {
        const channel = supabase.channel('docs_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'documents' },
                () => fetchDocuments()
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const generalDocuments = documents.filter(d => d.type === 'General');
    const payslips = documents.filter(d => d.type === 'Payslip');

    const filteredPayslips = payslips.filter(slip => {
        const monthMatch = selectedMonth === 'All' || slip.month === selectedMonth;
        const yearMatch = slip.year === selectedYear;
        return monthMatch && yearMatch;
    });

    const getIcon = (name: string) => {
        if (name.endsWith('.pdf')) return <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>picture_as_pdf</span>;
        if (name.endsWith('.jpg') || name.endsWith('.png')) return <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>imagesmode</span>;
        return <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>description</span>;
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
                                <div className={styles.icon}><span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>receipt</span></div>
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
