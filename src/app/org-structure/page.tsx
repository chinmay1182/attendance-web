"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './org-structure.module.css';
import toast from 'react-hot-toast';

type Department = {
    id: string;
    name: string;
};

export default function OrgStructurePage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching departments:', error);
            // Fallback to static data if table doesn't exist yet/fails
            setDepartments([
                { id: '1', name: 'Engineering' },
                { id: '2', name: 'HR & Admin' },
                { id: '3', name: 'Sales & Marketing' },
                { id: '4', name: 'Product' },
                { id: '5', name: 'Finance' }
            ]);
        } else {
            setDepartments(data || []);
        }
        setLoading(false);
    };

    const handleAddDepartment = async () => {
        const name = prompt("Enter new department name:");
        if (!name) return;

        const { data, error } = await supabase
            .from('departments')
            .insert([{ name }])
            .select();

        if (error) {
            toast.error("Failed to add department");
            console.error(error);
        } else {
            toast.success("Department added successfully");
            fetchDepartments();
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Organization Structure</h1>
                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>Departments</h3>
                        <ul className={styles.list}>
                            {departments.map(dept => (
                                <li key={dept.id} className={styles.listItem}>
                                    {dept.name} <span className={styles.action}>Edit</span>
                                </li>
                            ))}
                            {departments.length === 0 && !loading && <li className={styles.listItem}>No departments found.</li>}
                        </ul>
                        <button onClick={handleAddDepartment} className={styles.addBtn}>+ Add Department</button>
                    </div>
                </div>
            </div>
        </>
    );
}
