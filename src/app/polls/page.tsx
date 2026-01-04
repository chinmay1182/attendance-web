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
                            {poll.options.map((otp) => (
                                <label key={otp} className={styles.optionLabel}>
                                    <input
                                        type="radio"
                                        name={`poll-${poll.id}`}
                                        className={styles.radio}
                                        value={otp}
                                        onChange={(e) => setSelectedOption(e.target.value)}
                                        checked={selectedOption === otp}
                                    />
                                    <span className={styles.optionText}>{otp}</span>
                                </label>
                            ))}
                        </div>
                        <button onClick={() => handleVote(poll.id)} className={styles.voteBtn}>Vote</button>
                    </div>
                ))}
            </div>
        </>
    );
}
