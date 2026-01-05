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
    const [users, setUsers] = useState<UserStub[]>([]);
    const [activeUser, setActiveUser] = useState<UserStub | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) fetchUsers();
    }, [user]);

    // Presence State
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (user && activeUser) {
            fetchMessages();

            // Message Subscription
            const channel = supabase.channel('chat_room')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                    // ... (existing message logic)
                    const newMsg = payload.new as any;
                    if (
                        (newMsg.sender_id === user.uid && newMsg.receiver_id === activeUser.id) ||
                        (newMsg.sender_id === activeUser.id && newMsg.receiver_id === user.uid)
                    ) {
                        setMessages(prev => [...prev, {
                            id: newMsg.id,
                            sender: newMsg.sender_id === user.uid ? 'me' : newMsg.sender_id,
                            content: newMsg.content,
                            created_at: newMsg.created_at
                        }]);
                    }
                })
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const userIds = new Set<string>();
                    // Map presence state to user IDs
                    for (const id in state) {
                        userIds.add(id); // keys are user_ids usually if we set key
                    }
                    // Actually presence state keys are random UUIDs unless we specify key. 
                    // We typically track via mapped user_id from presence payload.
                })
                .on('broadcast', { event: 'typing' }, (payload) => {
                    if (payload.payload.user_id === activeUser.id) {
                        setTypingUsers(prev => {
                            const next = new Set(prev);
                            next.add(activeUser.id);
                            return next;
                        });
                        // Clear typing after 3s
                        setTimeout(() => {
                            setTypingUsers(prev => {
                                const next = new Set(prev);
                                next.delete(activeUser.id);
                                return next;
                            });
                        }, 3000);
                    }
                })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [user, activeUser]);

    // Typing Emitter
    const handleTyping = async () => {
        await supabase.channel('chat_room').send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: user?.uid }
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, name').neq('id', user?.uid);
        if (data && data.length > 0) {
            setUsers(data);
            setActiveUser(data[0]);
        } else {
            // Fallback for demo if no other users
            const demoUsers = [
                { id: '1', name: 'Alice Johnson' },
                { id: '2', name: 'Bob Smith' }
            ];
            setUsers(demoUsers);
            setActiveUser(demoUsers[0]);
        }
    };

    const fetchMessages = async () => {
        if (!user || !activeUser) return;

        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.uid},receiver_id.eq.${activeUser.id}),and(sender_id.eq.${activeUser.id},receiver_id.eq.${user.uid})`)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data.map(m => ({
                id: m.id,
                sender: m.sender_id === user.uid ? 'me' : m.sender_id,
                content: m.content,
                created_at: m.created_at
            })));
        } else {
            setMessages([]);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !user || !activeUser) return;

        const content = input;
        setInput(''); // Optimistic clear

        const { error } = await supabase.from('messages').insert([{
            sender_id: user.uid,
            receiver_id: activeUser.id,
            content: content
        }]);

        if (error) {
            console.error(error);
            // Revert or show error could go here
        }
        // Listener updates UI, or we can optimistically update here too
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
                                className={`${styles.userItem} ${activeUser?.id === u.id ? styles.activeUser : ''}`}
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
                    {activeUser ? (
                        <>
                            <div className={styles.chatHeader}>
                                {activeUser.name}
                                <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                                    {typingUsers.has(activeUser.id) ? 'Typing...' : 'Online'}
                                </div>
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
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <button className={styles.sendBtn} onClick={handleSend}>➤</button>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            Select a user to chat with
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
