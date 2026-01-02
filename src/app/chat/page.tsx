"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Navbar } from '../../components/Navbar';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import styles from './chat.module.css';

type Message = {
    id: string;
    sender: string;
    content: string;
    created_at: string;
};

type UserStub = {
    id: string;
    name: string;
};

export default function ChatPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [users, setUsers] = useState<UserStub[]>([
        { id: '1', name: 'Alice Johnson' },
        { id: '2', name: 'Bob Smith' },
        { id: '3', name: 'Charlie Davis' }
    ]);
    const [activeUser, setActiveUser] = useState<UserStub>(users[0]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch mock messages initially or real ones if table exists
        // simplified for demo
        setMessages([
            { id: 'm1', sender: '1', content: 'Hey, did you submit the report?', created_at: new Date().toISOString() },
            { id: 'm2', sender: 'me', content: 'Yes, just sent it via email!', created_at: new Date().toISOString() }
        ]);
    }, [activeUser]);

    const handleSend = () => {
        if (!input.trim()) return;
        const newMsg: Message = {
            id: Date.now().toString(),
            sender: 'me',
            content: input,
            created_at: new Date().toISOString()
        };
        setMessages([...messages, newMsg]);
        setInput('');

        // Scroll to bottom
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    return (
        <>
            <Navbar />
            <div className={styles.container}>
                <div className={styles.sidebar}>
                    <div className={styles.searchBar}>
                        <input type="text" placeholder="Search people..." className={styles.searchInput} />
                    </div>
                    <div className={styles.usersList}>
                        {users.map(u => (
                            <div
                                key={u.id}
                                className={`${styles.userItem} ${activeUser.id === u.id ? styles.activeUser : ''}`}
                                onClick={() => setActiveUser(u)}
                            >
                                <div className={styles.avatar}>{u.name.charAt(0)}</div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{u.name}</div>
                                    <div className={styles.lastMsg}>Click to chat</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={styles.chatArea}>
                    <div className={styles.chatHeader}>
                        {activeUser.name}
                    </div>
                    <div className={styles.messagesContainer} ref={scrollRef}>
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`${styles.messageBubble} ${msg.sender === 'me' ? styles.outgoing : styles.incoming}`}
                            >
                                {msg.content}
                            </div>
                        ))}
                    </div>
                    <div className={styles.inputArea}>
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className={styles.messageInput}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button className={styles.sendBtn} onClick={handleSend}>➤</button>
                    </div>
                </div>
            </div>
        </>
    );
}
