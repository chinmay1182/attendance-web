"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import styles from '../careers.module.css';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function JobApplyPage() {
    const { id } = useParams();
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({ name: '', email: '', phone: '', linkedin: '', resume: null as File | null });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (id) fetchJob(id as string);
    }, [id]);

    const fetchJob = async (jobId: string) => {
        const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
        if (data) setJob(data);
        else notFound();
        setLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setForm({ ...form, resume: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.resume) {
            toast.error("Please fill Name, Email and upload Resume");
            return;
        }

        setSubmitting(true);
        try {
            // Upload Resume
            const fileExt = form.resume.name.split('.').pop();
            const fileName = `${Date.now()}_${form.name.replace(/\s/g, '_')}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(fileName, form.resume);

            if (uploadError) throw new Error("Resume upload failed");

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage.from('resumes').getPublicUrl(fileName);

            // Insert Application
            const { error: dbError } = await supabase.from('applications').insert({
                job_id: job.id,
                candidate_name: form.name,
                email: form.email,
                phone: form.phone,
                linkedin_profile: form.linkedin,
                resume_url: publicUrl,
                status: 'new'
            });

            if (dbError) throw dbError;

            setSubmitted(true);
            toast.success("Application Submitted!");
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    if (!job) return null;

    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Application Received!</h1>
                    <p style={{ color: '#666', marginBottom: '24px' }}>Thanks for applying to <b>{job.title}</b>. We will be in touch shortly.</p>
                    <Link href="/careers" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 600 }}>&larr; Back to Careers</Link>
                </div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#fff' }}>
            <Toaster />
            <nav style={{ padding: '20px 40px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/careers" style={{ textDecoration: 'none', color: '#666', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ marginRight: 4 }}>arrow_back</span> All Jobs
                </Link>
            </nav>

            <div className={styles.container}>
                <div className={styles.detailCard}>
                    <div style={{ marginBottom: '24px' }}>
                        <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 600 }}>{job.department}</span>
                        <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>{job.location} • {job.type}</span>
                    </div>
                    <h1 className={styles.title} style={{ fontSize: '2.5rem' }}>{job.title}</h1>

                    <h3 className={styles.sectionTitle}>About the Role</h3>
                    <div className={styles.description}>{job.description}</div>

                    <h3 className={styles.sectionTitle}>Requirements</h3>
                    <div className={styles.description}>{job.requirements}</div>
                </div>

                <div className={styles.formCard}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '32px' }}>Apply for this position</h2>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Full Name *</label>
                            <input className={styles.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Email Address *</label>
                            <input type="email" className={styles.input} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" required />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Phone Number</label>
                            <input className={styles.input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>LinkedIn Profile URL</label>
                            <input className={styles.input} value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Resume / CV *</label>
                            <input type="file" accept=".pdf,.doc,.docx" className={styles.fileInput} onChange={handleFileChange} required />
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '8px' }}>Accepted: PDF, DOC, DOCX</p>
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={submitting}>
                            {submitting ? 'Submitting Application...' : 'Submit Application'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
