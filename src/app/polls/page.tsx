"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './polls.module.css';
import toast from 'react-hot-toast';

type Poll = {
    id: string;
    question: string;
    options: string[]; // JSON string in DB or array
    status: string;
};

export default function PollsPage() {
    const { user } = useAuth();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [selectedOption, setSelectedOption] = useState<string>('');

    useEffect(() => {
        fetchPolls();
    }, []);

    const fetchPolls = async () => {
        const { data, error } = await supabase.from('polls').select('*').eq('status', 'Active');
        if (error || !data || data.length === 0) {
            setPolls([{
                id: '1',
                question: "Choose the Theme for Annual Party 🎉",
                options: ['Masquerade Ball', 'Retro 80s', 'Hawaiian Luau', 'Hollywood Night'],
                status: 'Active'
            }]);
        } else {
            // Ensure options are parsed if stored as JSON string
            const parsedData = data.map(p => ({
                ...p,
                options: typeof p.options === 'string' ? JSON.parse(p.options) : p.options
            }));
            setPolls(parsedData);
        }
    };



    // ...

    const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});

    useEffect(() => {
        if (user) {
            setupRealtime();
            fetchInitialCounts();
        }
    }, [user, polls]);

    const fetchInitialCounts = async () => {
        // In a real app, this would be a group_by query or fetched with polls
        // Simulating or direct fetching if possible. 
        // For now, we listen for *new* votes. Retaining basic fetch logic.
        const { data } = await supabase.from('poll_votes').select('poll_id, option_selected');
        if (data) {
            const counts: any = {};
            data.forEach((v: any) => {
                if (!counts[v.poll_id]) counts[v.poll_id] = {};
                counts[v.poll_id][v.option_selected] = (counts[v.poll_id][v.option_selected] || 0) + 1;
            });
            setVoteCounts(counts);
        }
    };

    const setupRealtime = () => {
        const channel = supabase.channel('polls_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'poll_votes' },
                (payload: any) => {
                    const vote = payload.new;
                    setVoteCounts(prev => {
                        const pCounts = prev[vote.poll_id] || {};
                        return {
                            ...prev,
                            [vote.poll_id]: {
                                ...pCounts,
                                [vote.option_selected]: (pCounts[vote.option_selected] || 0) + 1
                            }
                        };
                    });
                    import('react-hot-toast').then(({ default: toast }) => {
                        toast('New vote received!', { position: 'bottom-right', icon: '🗳️' });
                    });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const handleVote = async (pollId: string) => {
        if (!user) return toast.error("You must be logged in to vote.");
        if (!selectedOption) return toast.error("Please select an option!");

        const { error } = await supabase.from('poll_votes').insert([
            { poll_id: pollId, user_id: user.uid, option_selected: selectedOption }
        ]);

        if (error) {
            console.error(error);
            if (error.code === '23505') { // Unique violation
                toast.error("You have already voted on this poll!");
            } else {
                toast.error("Failed to submit vote.");
            }
        } else {
            toast.success("Vote recorded successfully!");
            setSelectedOption(''); // Reset selection
        }
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <h1 className={styles.title}>Polls & Surveys</h1>
                {polls.map((poll) => (
                    <div key={poll.id} className={styles.pollCard}>
                        <div className={styles.pollHeader}>
                            <span className={styles.status}>{poll.status}</span>
                            <h3 className={styles.pollQuestion}>{poll.question}</h3>
                        </div>
                        <div className={styles.optionsList}>
                            {poll.options.map((otp) => {
                                const count = voteCounts[poll.id]?.[otp] || 0;
                                const total = Object.values(voteCounts[poll.id] || {}).reduce((a, b) => a + b, 0);
                                const percent = total > 0 ? Math.round((count / total) * 100) : 0;

                                return (
                                    <div key={otp} style={{ marginBottom: '8px' }}>
                                        <label className={styles.optionLabel} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', zIndex: 2, position: 'relative' }}>
                                                <input
                                                    type="radio"
                                                    name={`poll-${poll.id}`}
                                                    className={styles.radio}
                                                    value={otp}
                                                    onChange={(e) => setSelectedOption(e.target.value)}
                                                    checked={selectedOption === otp}
                                                />
                                                <span className={styles.optionText}>{otp}</span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', zIndex: 2, position: 'relative' }}>{count} votes ({percent}%)</span>

                                            {/* Progress Bar Background */}
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                height: '100%',
                                                width: `${percent}%`,
                                                background: 'rgba(79, 70, 229, 0.1)',
                                                zIndex: 1,
                                                transition: 'width 0.5s ease-in-out'
                                            }}></div>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                        <button onClick={() => handleVote(poll.id)} className={styles.voteBtn}>Vote</button>
                    </div>
                ))}
            </div>
        </>
    );
}
