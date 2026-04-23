"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './recruitment.module.css';
import toast from 'react-hot-toast';

type Job = {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    status: 'open' | 'closed' | 'draft';
    created_at: string;
    company_id?: string;
    application_count?: number;
};

type Application = {
    id: string;
    candidate_name: string;
    job_id: string;
    status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
    email: string;
    resume_url: string;
    created_at: string;
    job?: { title: string };
};

type Note = {
    id: string;
    content: string;
    created_at: string;
    author_id: string;
    author_name?: string;
};

type Department = {
    id: string;
    name: string;
};

export default function RecruitmentPage() {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'jobs' | 'candidates'>('jobs');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    // Create Job Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newJob, setNewJob] = useState({ title: '', department: '', location: '', type: 'Full-time', description: '', requirements: '' });
    const [submitting, setSubmitting] = useState(false);

    // Edit Job Modal
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [editJobData, setEditJobData] = useState({ title: '', department: '', location: '', type: 'Full-time', description: '', requirements: '' });

    // Candidate Detail Modal
    const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
    const [candidateNotes, setCandidateNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        if (user) {
            fetchDepartments();
            fetchJobs();
            fetchApplications();

            // Realtime Recruitment Board
            const channel = supabase.channel('recruitment_board')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'applications' },
                    (payload) => {
                        const rec = payload.new as Application;
                        if (payload.eventType === 'INSERT') {
                            setApplications(prev => [rec, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            setApplications(prev => prev.map(a => a.id === rec.id ? { ...a, ...rec } : a));
                        }
                    }
                )
                .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchJobs())
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [user]);

    const fetchDepartments = async () => {
        const { data } = await supabase
            .from('departments')
            .select('id, name')
            .order('name', { ascending: true });
        if (data) setDepartments(data);
    };

    const fetchJobs = async () => {
        if (!profile?.company_id) return;

        const { data: jobsData } = await supabase
            .from('jobs')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false });

        if (jobsData) {
            const { data: apps } = await supabase
                .from('applications')
                .select('job_id');
            const counts: any = {};
            apps?.forEach((a: any) => counts[a.job_id] = (counts[a.job_id] || 0) + 1);
            setJobs(jobsData.map(j => ({ ...j, application_count: counts[j.id] || 0 })));
        }
    };

    const fetchApplications = async () => {
        if (!profile?.company_id) return;

        // Fetch only applications for jobs belonging to this company
        const { data: companyJobs } = await supabase
            .from('jobs')
            .select('id')
            .eq('company_id', profile.company_id);

        if (!companyJobs || companyJobs.length === 0) {
            setApplications([]);
            return;
        }

        const jobIds = companyJobs.map(j => j.id);
        const { data } = await supabase
            .from('applications')
            .select('*, job:jobs(title)')
            .in('job_id', jobIds)
            .order('created_at', { ascending: false });

        if (data) setApplications(data as any);
    };

    // Wait for profile to be loaded before fetching
    useEffect(() => {
        if (user && profile?.company_id) {
            fetchJobs();
            fetchApplications();
        }
    }, [profile?.company_id]);

    const handleCreateJob = async () => {
        if (!newJob.title || !newJob.department) {
            toast.error("Title and Department are required");
            return;
        }
        if (!profile?.company_id) {
            toast.error("Company information not found");
            return;
        }
        setSubmitting(true);
        const { error } = await supabase.from('jobs').insert({
            ...newJob,
            status: 'open',
            created_by: user?.id,
            company_id: profile.company_id
        });

        if (error) {
            toast.error("Failed to post job");
        } else {
            toast.success("Job Posted Successfully");
            setIsCreateOpen(false);
            setNewJob({ title: '', department: '', location: '', type: 'Full-time', description: '', requirements: '' });
            fetchJobs();
        }
        setSubmitting(false);
    };

    const openEditModal = (job: Job) => {
        setEditingJob(job);
        setEditJobData({
            title: job.title,
            department: job.department,
            location: job.location,
            type: job.type,
            description: (job as any).description || '',
            requirements: (job as any).requirements || '',
        });
        setIsEditOpen(true);
    };

    const handleEditJob = async () => {
        if (!editingJob || !editJobData.title || !editJobData.department) {
            toast.error("Title and Department are required");
            return;
        }
        setSubmitting(true);
        const { error } = await supabase.from('jobs').update({
            title: editJobData.title,
            department: editJobData.department,
            location: editJobData.location,
            type: editJobData.type,
            description: editJobData.description,
            requirements: editJobData.requirements,
        }).eq('id', editingJob.id);

        if (error) {
            toast.error("Failed to update job");
        } else {
            toast.success("Job Updated Successfully");
            setIsEditOpen(false);
            setEditingJob(null);
            fetchJobs();
        }
        setSubmitting(false);
    };

    const handleDeleteJob = async (jobId: string) => {
        if (!confirm("Are you sure you want to delete this job? This cannot be undone.")) return;
        const { error } = await supabase.from('jobs').delete().eq('id', jobId);
        if (error) {
            toast.error("Failed to delete job");
        } else {
            toast.success("Job deleted");
            fetchJobs();
        }
    };

    const handleToggleJobStatus = async (job: Job) => {
        const newStatus = job.status === 'open' ? 'closed' : 'open';
        const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', job.id);
        if (error) {
            toast.error("Failed to update job status");
        } else {
            toast.success(`Job ${newStatus === 'open' ? 'Activated' : 'Deactivated'}`);
            fetchJobs();
        }
    };

    const copyApplyLink = (jobId: string) => {
        const link = `${window.location.origin}/careers/${jobId}`;
        navigator.clipboard.writeText(link);
        toast.success("Application Link Copied!");
    };

    // Candidate Modal Logic
    const openCandidateModal = async (app: Application) => {
        setSelectedCandidate(app);
        const { data } = await supabase.from('candidate_notes').select('*').eq('application_id', app.id).order('created_at', { ascending: true });
        if (data) setCandidateNotes(data);
    };

    const handleAddNote = async () => {
        if (!newNote || !selectedCandidate) return;
        const { error } = await supabase.from('candidate_notes').insert({
            application_id: selectedCandidate.id,
            author_id: user?.id,
            content: newNote
        });
        if (error) {
            toast.error("Failed to add note");
        } else {
            setNewNote('');
            const { data } = await supabase.from('candidate_notes').select('*').eq('application_id', selectedCandidate.id).order('created_at', { ascending: true });
            if (data) setCandidateNotes(data);
        }
    };

    const updateStatus = async (status: string) => {
        if (!selectedCandidate) return;
        await supabase.from('applications').update({ status }).eq('id', selectedCandidate.id);
        setSelectedCandidate({ ...selectedCandidate, status: status as any });
        fetchApplications();
        toast.success(`Moved to ${status}`);
    };

    const columns = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'];

    const JobFormFields = ({ data, onChange }: { data: typeof newJob, onChange: (d: typeof newJob) => void }) => (
        <>
            <div className={styles.inputGroup}>
                <label className={styles.label}>Job Title *</label>
                <input className={styles.input} value={data.title} onChange={e => onChange({ ...data, title: e.target.value })} placeholder="e.g. Senior Frontend Developer" />
            </div>

            <div className={styles.row}>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Department *</label>
                    <select className={styles.select} value={data.department} onChange={e => onChange({ ...data, department: e.target.value })}>
                        <option value="">Select Dept</option>
                        {departments.length > 0
                            ? departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)
                            : (
                                <>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Design">Design</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Sales">Sales</option>
                                    <option value="HR">HR</option>
                                </>
                            )
                        }
                    </select>
                </div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Job Type</label>
                    <select className={styles.select} value={data.type} onChange={e => onChange({ ...data, type: e.target.value })}>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                    </select>
                </div>
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Location</label>
                <input className={styles.input} value={data.location} onChange={e => onChange({ ...data, location: e.target.value })} placeholder="e.g. Remote / New York" />
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Description</label>
                <textarea className={styles.textarea} value={data.description} onChange={e => onChange({ ...data, description: e.target.value })} placeholder="Job responsibilities..." />
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Requirements</label>
                <textarea className={styles.textarea} value={data.requirements} onChange={e => onChange({ ...data, requirements: e.target.value })} placeholder="Skills needed..." />
            </div>
        </>
    );

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Recruitment (ATS)</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Manage jobs and track candidates</p>
                    </div>
                    {activeTab === 'jobs' && (
                        <button onClick={() => setIsCreateOpen(true)} className={styles.primaryBtn}>
                            Post New Job
                        </button>
                    )}
                </div>

                <div className={styles.tabs}>
                    <button onClick={() => setActiveTab('jobs')} className={`${styles.tabBtn} ${activeTab === 'jobs' ? styles.active : ''}`}>Active Jobs</button>
                    <button onClick={() => setActiveTab('candidates')} className={`${styles.tabBtn} ${activeTab === 'candidates' ? styles.active : ''}`}>Candidates Board</button>
                </div>

                {activeTab === 'jobs' && (
                    <div className={styles.jobsList}>
                        {jobs.map(job => (
                            <div key={job.id} className={styles.jobCard}>
                                <div className={styles.jobInfo}>
                                    <h3>
                                        {job.title}
                                        <span className={`${styles.statusBadge} ${styles['status' + job.status]}`}>{job.status}</span>
                                        {job.status === 'open' && (
                                            <a
                                                href={`/careers/${job.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '0.75rem', marginLeft: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: 500, border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', background: '#eff6ff' }}
                                            >
                                                Live on Careers Page ↗
                                            </a>
                                        )}
                                    </h3>
                                    <div className={styles.jobMeta}>
                                        <span>{job.department}</span>
                                        <span>•</span>
                                        <span>{job.location}</span>
                                        <span>•</span>
                                        <span>{job.type}</span>
                                        <span>•</span>
                                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ textAlign: 'center', marginRight: '8px' }}>
                                        <b style={{ fontSize: '1.5rem', display: 'block' }}>{job.application_count}</b>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Applicants</span>
                                    </div>
                                    <button onClick={() => copyApplyLink(job.id)} className={styles.secondaryBtn}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>share</span> Share
                                    </button>
                                    <button onClick={() => openEditModal(job)} className={styles.secondaryBtn} title="Edit Job">
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleToggleJobStatus(job)}
                                        className={styles.secondaryBtn}
                                        title={job.status === 'open' ? 'Deactivate Job' : 'Activate Job'}
                                        style={{ color: job.status === 'open' ? '#f59e0b' : '#10b981' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                            {job.status === 'open' ? 'pause_circle' : 'play_circle'}
                                        </span>
                                        {job.status === 'open' ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteJob(job.id)}
                                        className={styles.secondaryBtn}
                                        title="Delete Job"
                                        style={{ color: '#ef4444' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {jobs.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No jobs posted yet.</p>}
                    </div>
                )}

                {activeTab === 'candidates' && (
                    <div className={styles.kanbanBoard}>
                        {columns.map(col => (
                            <div key={col} className={styles.kanbanColumn}>
                                <div className={styles.columnHeader}>
                                    <span style={{ textTransform: 'capitalize' }}>{col}</span>
                                    <span className={styles.countBadge}>{applications.filter(a => a.status === col).length}</span>
                                </div>
                                <div className={styles.columnContent}>
                                    {applications.filter(a => a.status === col).map(app => (
                                        <div key={app.id} className={styles.candidateCard} onClick={() => openCandidateModal(app)}>
                                            <h4 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{app.candidate_name}</h4>
                                            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{app.job?.title}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(app.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Job Modal */}
                {isCreateOpen && (
                    <div className={styles.modalOverlay} onClick={() => setIsCreateOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0 }}>Post a New Job</h2>
                                <button onClick={() => setIsCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#666' }}>×</button>
                            </div>

                            <JobFormFields data={newJob} onChange={setNewJob} />

                            <button onClick={handleCreateJob} className={styles.primaryBtn} style={{ width: '100%' }} disabled={submitting}>
                                {submitting ? 'Posting...' : 'Publish Job'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Edit Job Modal */}
                {isEditOpen && editingJob && (
                    <div className={styles.modalOverlay} onClick={() => setIsEditOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0 }}>Edit Job</h2>
                                <button onClick={() => setIsEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#666' }}>×</button>
                            </div>

                            <JobFormFields data={editJobData} onChange={setEditJobData} />

                            <button onClick={handleEditJob} className={styles.primaryBtn} style={{ width: '100%' }} disabled={submitting}>
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Candidate Detail Modal */}
                {selectedCandidate && (
                    <div className={styles.modalOverlay} onClick={() => setSelectedCandidate(null)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ width: '800px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h2 style={{ margin: 0 }}>{selectedCandidate.candidate_name}</h2>
                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Applied for {selectedCandidate.job?.title}</p>
                                </div>
                                <button onClick={() => setSelectedCandidate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#666' }}>×</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
                                {/* Left: Info & Notes */}
                                <div>
                                    <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--glass-border)' }}>
                                        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                            <a href={`mailto:${selectedCandidate.email}`} className={styles.secondaryBtn}>Email Candidate</a>
                                            {selectedCandidate.resume_url && <a href={selectedCandidate.resume_url} target="_blank" className={styles.secondaryBtn}>View Resume ↗</a>}
                                        </div>
                                    </div>

                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Internal Notes</h3>
                                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                                        {candidateNotes.map(note => (
                                            <div key={note.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{note.content}</p>
                                                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(note.created_at).toLocaleString()}</small>
                                            </div>
                                        ))}
                                        {candidateNotes.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>No notes yet.</p>}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input className={styles.input} style={{ marginBottom: 0 }} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a private note..." onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
                                        <button onClick={handleAddNote} className={styles.primaryBtn} style={{ width: 'auto' }}>Add</button>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Move Stage</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {columns.map(col => (
                                            <button
                                                key={col}
                                                onClick={() => updateStatus(col)}
                                                className={styles.secondaryBtn}
                                                style={{
                                                    justifyContent: 'flex-start',
                                                    background: selectedCandidate.status === col ? 'var(--primary)' : 'white',
                                                    color: selectedCandidate.status === col ? 'white' : 'var(--text-main)',
                                                    borderColor: selectedCandidate.status === col ? 'var(--primary)' : 'var(--glass-border)'
                                                }}
                                            >
                                                <span style={{ textTransform: 'capitalize' }}>{col}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
