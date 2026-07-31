"use client";
import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface TrialExtensionModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onSuccess?: () => void;
}

export const TrialExtensionModal: React.FC<TrialExtensionModalProps> = ({
    isOpen,
    onClose,
    userId,
    onSuccess
}) => {
    const [duration, setDuration] = useState('1');
    const [unit, setUnit] = useState('weeks');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/user/trial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: userId,
                    duration: parseInt(duration),
                    unit
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to request trial extension');

            toast.success("Trial extension requested successfully!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to submit extension request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }} onClick={onClose}>
            <div style={{
                background: 'white', padding: '32px', borderRadius: '24px', width: '450px', maxWidth: '90%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--primary)' }}>more_time</span>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Request Trial Extension</h2>
                </div>

                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
                    Request additional trial time for your workspace. Please choose the extension duration. The request is limited to a maximum of 1 year.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Duration</label>
                            <input
                                type="number"
                                min="1"
                                value={duration}
                                onChange={e => setDuration(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '12px',
                                    border: '1px solid var(--glass-border)', fontSize: '1rem', background: '#f8fafc'
                                }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Unit</label>
                            <select
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '12px',
                                    border: '1px solid var(--glass-border)', fontSize: '1rem', background: '#f8fafc',
                                    appearance: 'auto'
                                }}
                            >
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                                <option value="months">Months</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '12px 20px', borderRadius: '12px', border: 'none',
                                background: '#f1f5f9', cursor: 'pointer', fontWeight: 600, color: '#64748b'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '12px 24px', borderRadius: '12px', border: 'none',
                                background: 'var(--primary)', color: 'white', cursor: 'pointer',
                                fontWeight: 600, transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
