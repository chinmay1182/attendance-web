"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import styles from './recruitment.module.css';

type Job = {
    id: string;
    title: string;
    department: string;
    applicants_count: number;
};

export default function RecruitmentPage() {
    const [jobs, setJobs] = useState<Job[]>([]);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        const { data, error } = await supabase
            .from('jobs')
            .select('*');

        if (error || !data || data.length === 0) {
            setJobs([
                { id: '1', title: "Senior React Developer", department: "Engineering", applicants_count: 45 },
                { id: '2', title: "HR Executive", department: "HR & Admin", applicants_count: 12 },
                { id: '3', title: "Sales Manager", department: "Sales", applicants_count: 28 }
            ]);
        } else {
            setJobs(data);
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Recruitment (ATS)</h1>
                <div className={styles.grid}>
                    {jobs.map((job) => (
                        <div key={job.id} className={styles.jobCard}>
                            <h3 className={styles.jobTitle}>{job.title}</h3>
                            <p className={styles.dept}>{job.department}</p>
                            <div className={styles.meta}>
                                <span className={styles.applicants}>{job.applicants_count} Applicants</span>
                                <button className={styles.viewBtn}>View</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
