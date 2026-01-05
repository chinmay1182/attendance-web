"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './sites.module.css';
import toast from 'react-hot-toast';

type Site = {
    id: string;
    name: string;
    address: string;
    description: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    is_active: boolean;
    created_at: string;
    daily_tasks?: string;
    entry_policy?: string;
    assigned_count?: number;
};

type Assignment = {
    id: string;
    site_id: string;
    user_id: string;
    status: string;
    user: { name: string, email: string, role: string };
    site: Site;
    last_log?: { log_time: string, latitude: number, longitude: number, photo_url?: string };
};

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function SitesPage() {
    const { user, profile } = useAuth();
    const isAdmin = profile?.role === 'admin';
    const isHr = profile?.role === 'hr';
    const canManage = isAdmin || isHr;

    const [sites, setSites] = useState<Site[]>([]);
    const [myAssignment, setMyAssignment] = useState<Assignment | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'assignments'>('overview');

    // Admin State
    const [users, setUsers] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    // Modals
    const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [selectedSiteId, setSelectedSiteId] = useState('');

    // Photo Verification & Geofence State
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [geoDistance, setGeoDistance] = useState<number | null>(null);
    const [canCheckIn, setCanCheckIn] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);

    // Forms
    const [newSite, setNewSite] = useState({
        name: '', address: '', description: '', latitude: '', longitude: '', radius: '100',
        daily_tasks: '', entry_policy: ''
    });
    const [newAssign, setNewAssign] = useState({ user_id: '', site_id: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (canManage) {
            fetchSites();
            fetchUsers();
            fetchAssignments();

            const channel = supabase.channel('sites_admin_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, () => fetchSites())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'site_assignments' }, () => fetchAssignments())
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        } else if (user) {
            fetchMyAssignment();

            const channel = supabase.channel('sites_user_realtime')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'site_assignments', filter: `user_id=eq.${user.uid}` },
                    () => {
                        fetchMyAssignment();
                        import('react-hot-toast').then(({ default: toast }) => { toast("Site Assignment Updated"); });
                    }
                )
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [user, profile]);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    // --- Data Fetching ---

    const fetchSites = async () => {
        const { data } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
        if (data) setSites(data);
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, name, email, role');
        if (data) setUsers(data);
    };

    const fetchAssignments = async () => {
        const { data } = await supabase
            .from('site_assignments')
            .select(`
                *,
                user:users(name, email, role),
                site:sites(name, address)
            `)
            .eq('status', 'active');
        if (data) setAssignments(data as any);
    };

    const fetchMyAssignment = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('site_assignments')
            .select(`
                *,
                site:sites(*)
            `)
            .eq('user_id', user.uid)
            .eq('status', 'active')
            .single();
        if (data) {
            setMyAssignment(data as any);
            // Verify location immediately
            verifyLocation(data.site);
        }
    };

    // --- Actions ---

    const handleAddSite = async () => {
        if (!newSite.name || !newSite.latitude || !newSite.longitude) {
            toast.error("Name and Location are required");
            return;
        }
        setSubmitting(true);
        const { error } = await supabase.from('sites').insert({
            name: newSite.name,
            address: newSite.address,
            description: newSite.description,
            latitude: parseFloat(newSite.latitude),
            longitude: parseFloat(newSite.longitude),
            radius_meters: parseInt(newSite.radius),
            daily_tasks: newSite.daily_tasks,
            entry_policy: newSite.entry_policy
        });

        if (error) {
            toast.error("Failed to add site");
        } else {
            toast.success("New site added!");
            setIsAddSiteOpen(false);
            setNewSite({ name: '', address: '', description: '', latitude: '', longitude: '', radius: '100', daily_tasks: '', entry_policy: '' });
            fetchSites();
        }
        setSubmitting(false);
    };

    const handleAssignUser = async () => {
        if (!newAssign.user_id || !newAssign.site_id) {
            toast.error("Select user and site");
            return;
        }

        await supabase
            .from('site_assignments')
            .update({ status: 'completed' })
            .eq('user_id', newAssign.user_id)
            .eq('status', 'active');

        const { error } = await supabase.from('site_assignments').insert({
            user_id: newAssign.user_id,
            site_id: newAssign.site_id,
            assigned_by: user?.uid,
            status: 'active'
        });

        if (error) {
            toast.error("Failed to assign");
        } else {
            toast.success("User assigned successfully");
            setIsAssignOpen(false);
            setNewAssign({ user_id: '', site_id: '' });
            fetchAssignments();
        }
    };

    const handleBroadcast = async () => {
        if (!selectedSiteId || !broadcastMessage) {
            toast.error("Select Site and Message");
            return;
        }

        const targetUsers = assignments.filter(a => a.site_id === selectedSiteId).map(a => a.user_id);

        if (targetUsers.length > 0) {
            // In a real app, this would insert into 'notices' with target_user_ids
            toast.success(`Broadcast sent to ${targetUsers.length} staff on site.`);
            setBroadcastMessage('');
            setIsBroadcastOpen(false);
        } else {
            toast.error("No staff currently assigned to this site.");
        }
    };

    // --- Check-In & Verification ---

    const verifyLocation = (site: Site) => {
        setLoadingLocation(true);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const dist = getDistanceFromLatLonInMeters(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    site.latitude,
                    site.longitude
                );
                setGeoDistance(dist);
                // Allow some buffer or use strict radius
                setCanCheckIn(dist <= site.radius_meters);
                setLoadingLocation(false);
            }, (err) => {
                toast.error("Location access required.");
                setLoadingLocation(false);
            }, { enableHighAccuracy: true });
        } else {
            setLoadingLocation(false);
        }
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            toast.error("Camera access denied");
            setIsCameraOpen(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.drawImage(videoRef.current, 0, 0, 300, 200);
                const dataUrl = canvasRef.current.toDataURL('image/png');
                setCapturedPhoto(dataUrl);
                stopCamera();
                setIsCameraOpen(false);
            }
        }
    };

    const finalizeCheckIn = async () => {
        if (!myAssignment || !capturedPhoto) return;

        toast.loading("Verifying Identity & Location...", { id: 'checkin' });

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { error } = await supabase.from('site_logs').insert({
                assignment_id: myAssignment.id,
                user_id: user?.uid,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                photo_url: capturedPhoto,
                notes: 'Verified Check-in',
                is_verified: true,
                distance_from_site: geoDistance
            });

            if (error) {
                toast.error("Check-in failed", { id: 'checkin' });
            } else {
                toast.success("Identity Verified & Checked In!", { id: 'checkin' });
                setCapturedPhoto(null);
            }
        });
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 className={styles.title}>{canManage ? 'Site Management' : 'My Site'}</h1>
                    {canManage && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setIsAssignOpen(true)} className={styles.tabBtn} style={{ background: '#212121', color: 'white', borderColor: '#212121' }}>
                                Assign User
                            </button>
                            <button onClick={() => setIsAddSiteOpen(true)} className={styles.tabBtn}>
                                Add Site
                            </button>
                            <button onClick={() => setIsBroadcastOpen(true)} className={styles.tabBtn} style={{ background: '#e0f2fe', color: '#0284c7', borderColor: '#e0f2fe' }}>
                                Broadcast
                            </button>
                        </div>
                    )}
                </div>

                {/* Employee View */}
                {!canManage && (
                    <div className={styles.grid}>
                        {myAssignment ? (
                            <div className={styles.siteCard}>
                                <div className={styles.siteHeader}>
                                    <div>
                                        <h3>{myAssignment.site.name}</h3>
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
                                            Distance: {loadingLocation ? 'Locating...' : geoDistance ? `${Math.round(geoDistance)}m` : 'Unknown'}
                                        </p>
                                    </div>
                                    <span className={`${styles.badge} ${canCheckIn ? styles.badgeActive : styles.badgeInactive}`}>
                                        {canCheckIn ? 'In Range' : 'Too Far'}
                                    </span>
                                </div>
                                <div className={styles.mapPreview}>
                                    <img
                                        src={`https://image.maps.ls.hereapi.com/mia/1.6/mapview?apiKey=GDl2vmjbRIX_WuX44MJUbieWTl8A7AW9eFyLhSIDj8I&c=${myAssignment.site.latitude},${myAssignment.site.longitude}&z=15&h=300&w=600`}
                                        alt="Map"
                                        className={styles.mapImg}
                                    />
                                </div>

                                {myAssignment.site.entry_policy && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.9rem', color: '#92400e' }}>
                                        <strong>⚠️ Entry Policy:</strong> {myAssignment.site.entry_policy}
                                    </div>
                                )}

                                {myAssignment.site.daily_tasks && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Daily Tasks</h4>
                                        <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: '#475569' }}>
                                            {myAssignment.site.daily_tasks.split('\n').map((task, i) => <li key={i}>{task}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {!capturedPhoto ? (
                                    <>
                                        {isCameraOpen ? (
                                            <div style={{ textAlign: 'center' }}>
                                                <video ref={videoRef} autoPlay style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', background: '#000' }}></video>
                                                <canvas ref={canvasRef} width="300" height="200" style={{ display: 'none' }}></canvas>
                                                <button onClick={capturePhoto} className={styles.primaryBtn}>Take Photo</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={startCamera}
                                                className={styles.primaryBtn}
                                                style={{ opacity: canCheckIn ? 1 : 0.5, cursor: canCheckIn ? 'pointer' : 'not-allowed' }}
                                                disabled={!canCheckIn}
                                            >
                                                Start Verified Check-in
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <img src={capturedPhoto} alt="Selfie" style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }} />
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button onClick={() => { setCapturedPhoto(null); startCamera(); }} className={styles.tabBtn} style={{ flex: 1 }}>Retake</button>
                                            <button onClick={finalizeCheckIn} className={styles.primaryBtn} style={{ flex: 1, marginTop: 0 }}>Confirm Check-in</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: '40px', background: 'white', borderRadius: '16px', textAlign: 'center', color: '#64748b' }}>
                                You are not currently assigned to any site.
                            </div>
                        )}
                    </div>
                )}

                {/* Admin View */}
                {canManage && (
                    <>
                        <div className={styles.tabs}>
                            <button onClick={() => setActiveTab('overview')} className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.active : ''}`}>All Sites</button>
                            <button onClick={() => setActiveTab('assignments')} className={`${styles.tabBtn} ${activeTab === 'assignments' ? styles.active : ''}`}>Active Assignments</button>
                        </div>

                        {activeTab === 'overview' && (
                            <div className={styles.grid}>
                                {sites.map(site => (
                                    <div key={site.id} className={styles.siteCard}>
                                        <div className={styles.siteHeader}>
                                            <h3>{site.name}</h3>
                                            <span className={`${styles.badge} ${site.is_active ? styles.badgeActive : styles.badgeInactive}`}>
                                                {site.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className={styles.mapPreview}>
                                            <img
                                                src={`https://image.maps.ls.hereapi.com/mia/1.6/mapview?apiKey=GDl2vmjbRIX_WuX44MJUbieWTl8A7AW9eFyLhSIDj8I&c=${site.latitude},${site.longitude}&z=14&h=300&w=600`}
                                                alt="Map"
                                                className={styles.mapImg}
                                            />
                                        </div>
                                        <p className={styles.address}>{site.address}</p>
                                        <div className={styles.meta}>
                                            <span>Radius: {site.radius_meters}m</span>
                                            <span>Lat: {site.latitude.toFixed(4)}, Lng: {site.longitude.toFixed(4)}</span>
                                        </div>
                                        <div style={{ marginTop: '16px', fontSize: '0.85rem' }}>
                                            {assignments.filter(a => a.site_id === site.id).length} Active Staff
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'assignments' && (
                            <div className={styles.grid}>
                                {assignments.map(assign => (
                                    <div key={assign.id} className={styles.siteCard}>
                                        <div className={styles.siteHeader}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div className={styles.userAvatar} style={{ width: '40px', height: '40px' }}>{assign.user?.name?.charAt(0)}</div>
                                                <div>
                                                    <h3 style={{ fontSize: '1rem', marginBottom: '2px' }}>{assign.user?.name}</h3>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{assign.user?.email}</div>
                                                </div>
                                            </div>
                                            <span className={`${styles.badge} ${styles.badgeActive}`}>On Site</span>
                                        </div>
                                        <div style={{ padding: '16px 0', borderTop: '1px solid #f1f5f9', marginTop: '16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{assign.site?.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>{assign.site?.address}</div>
                                        </div>
                                        <div className={styles.mapPreview} style={{ height: '120px' }}>
                                            <img
                                                src={`https://image.maps.ls.hereapi.com/mia/1.6/mapview?apiKey=GDl2vmjbRIX_WuX44MJUbieWTl8A7AW9eFyLhSIDj8I&c=${assign.site?.latitude},${assign.site?.longitude}&z=15&h=300&w=600`}
                                                alt="Map"
                                                className={styles.mapImg}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {assignments.length === 0 && <p>No active assignments.</p>}
                            </div>
                        )}
                    </>
                )}

                {/* Add Site Modal */}
                {isAddSiteOpen && (
                    <div className={styles.modalOverlay} onClick={() => setIsAddSiteOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ width: '600px' }}>
                            <button className={styles.closeBtn} onClick={() => setIsAddSiteOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Add New Site</h3>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Site Name</label>
                                <input className={styles.input} value={newSite.name} onChange={e => setNewSite({ ...newSite, name: e.target.value })} placeholder="e.g. Headquarters" />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Address</label>
                                <input className={styles.input} value={newSite.address} onChange={e => setNewSite({ ...newSite, address: e.target.value })} placeholder="Full Address" />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Daily Tasks / SOPs</label>
                                <textarea className={styles.textarea} value={newSite.daily_tasks} onChange={e => setNewSite({ ...newSite, daily_tasks: e.target.value })} placeholder="List required tasks..." style={{ height: '80px' }} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Entry Policy</label>
                                <input className={styles.input} value={newSite.entry_policy} onChange={e => setNewSite({ ...newSite, entry_policy: e.target.value })} placeholder="e.g. Hard hat required" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Latitude</label>
                                    <input type="number" className={styles.input} value={newSite.latitude} onChange={e => setNewSite({ ...newSite, latitude: e.target.value })} placeholder="0.0000" />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Longitude</label>
                                    <input type="number" className={styles.input} value={newSite.longitude} onChange={e => setNewSite({ ...newSite, longitude: e.target.value })} placeholder="0.0000" />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Radius (m)</label>
                                    <input type="number" className={styles.input} value={newSite.radius} onChange={e => setNewSite({ ...newSite, radius: e.target.value })} />
                                </div>
                            </div>

                            <button onClick={handleAddSite} className={styles.primaryBtn} disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create Site'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Broadcast Modal */}
                {isBroadcastOpen && (
                    <div className={styles.modalOverlay} onClick={() => setIsBroadcastOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeBtn} onClick={() => setIsBroadcastOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Broadcast Message</h3>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Select Target Site</label>
                                <select className={styles.select} value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)}>
                                    <option value="">-- Choose Site --</option>
                                    {sites.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Message</label>
                                <textarea className={styles.textarea} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Emergency alert or announcement..." />
                            </div>

                            <button onClick={handleBroadcast} className={styles.primaryBtn} style={{ background: '#0284c7' }}>
                                Send Broadcast
                            </button>
                        </div>
                    </div>
                )}

                {/* Assign Modal */}
                {isAssignOpen && (
                    <div className={styles.modalOverlay} onClick={() => setIsAssignOpen(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()}>
                            <button className={styles.closeBtn} onClick={() => setIsAssignOpen(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Assign User to Site</h3>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Select User</label>
                                <select className={styles.select} value={newAssign.user_id} onChange={e => setNewAssign({ ...newAssign, user_id: e.target.value })}>
                                    <option value="">-- Choose User --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Select Site</label>
                                <select className={styles.select} value={newAssign.site_id} onChange={e => setNewAssign({ ...newAssign, site_id: e.target.value })}>
                                    <option value="">-- Choose Site --</option>
                                    {sites.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button onClick={handleAssignUser} className={styles.primaryBtn}>
                                Assign Now
                            </button>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>This will override any existing assignments for the selected user.</p>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}
