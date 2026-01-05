"use client";
import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

import styles from './bulk-data.module.css';

export default function BulkDataPage() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ users: 0, logs: 0 });

    useEffect(() => {
        fetchStats();

        // Realtime stats
        const channel = supabase.channel('bulk_data_stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchStats())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchStats())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchStats = async () => {
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: logCount } = await supabase.from('attendance').select('*', { count: 'exact', head: true });
        setStats({ users: userCount || 0, logs: logCount || 0 });
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            if (jsonData.length === 0) throw new Error("File is empty");

            // Basic validation: Check for at least 'email'
            const valid = jsonData.filter((r: any) => r.email && r.name).map((user: any) => ({
                email: user.email,
                name: user.name,
                role: user.role || 'employee',
                department: user.department || 'General',
                password: user.password || 'password123' // Temp default
                // Note: Auth user creation is complex via client side, usually requires detailed backend logic.
                // Here we simulate successful insert into 'users' public table for demo purposes, 
                // assuming an underlying trigger or subsequent admin process handles Auth.
            }));

            // Insert into public users table
            const { error } = await supabase.from('users').upsert(valid, { onConflict: 'email' });
            if (error) throw error;

            toast.success(`Successfully imported ${valid.length} records!`);
        } catch (err: any) {
            console.error(err);
            toast.error("Import Failed: " + err.message);
        } finally {
            setLoading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleExport = async () => {
        const toastId = toast.loading('Generating Report...');
        try {
            const { data: attendance } = await supabase.from('attendance').select('*, users(name)');
            const { data: users } = await supabase.from('users').select('*');

            const wb = XLSX.utils.book_new();

            // Sheet 1: Employees
            if (users) {
                const wsUsers = XLSX.utils.json_to_sheet(users);
                XLSX.utils.book_append_sheet(wb, wsUsers, "Employees");
            }

            // Sheet 2: Attendance
            if (attendance) {
                const cleanLogs = attendance.map(a => ({
                    Date: a.date,
                    Name: a.users?.name,
                    Status: a.status,
                    In: a.clock_in ? new Date(a.clock_in).toLocaleTimeString() : '-',
                    Out: a.clock_out ? new Date(a.clock_out).toLocaleTimeString() : '-'
                }));
                const wsLogs = XLSX.utils.json_to_sheet(cleanLogs);
                XLSX.utils.book_append_sheet(wb, wsLogs, "Attendance Logs");
            }

            XLSX.writeFile(wb, "Company_Data_Export.xlsx");
            toast.success("Download Started", { id: toastId });
        } catch (err) {
            toast.error("Export Failed", { id: toastId });
        }
    };
    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Bulk Data Tools</h1>

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <span className={styles.icon}>📥</span>
                        <h3 className={styles.cardTitle}>Import Employees</h3>
                        <p className={styles.cardDesc}>
                            Current Records: <strong>{stats.users} Users</strong>
                            <br />
                            Upload Excel/CSV file to bulk import employees. Columns: name, email, role, department.
                        </p>
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleImport}
                            style={{ display: 'none' }}
                            id="import-file"
                        />
                        <button
                            className={`${styles.actionBtn} ${styles.primaryBtn}`}
                            onClick={() => document.getElementById('import-file')?.click()}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Upload File'}
                        </button>
                    </div>

                    <div className={styles.card}>
                        <span className={styles.icon}>📤</span>
                        <h3 className={styles.cardTitle}>Export All Data</h3>
                        <p className={styles.cardDesc}>
                            Total Logs: <strong>{stats.logs}</strong>
                            <br />
                            Download a comprehensive report of all attendance logs and user data.
                        </p>
                        <button
                            onClick={handleExport}
                            className={`${styles.actionBtn} ${styles.secondaryBtn}`}
                        >
                            Download Report
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
