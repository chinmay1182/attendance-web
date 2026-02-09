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
        if (!user) return;

        const channel = supabase.channel('chat_room')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                const newMsg = payload.new as any;
                if (!activeUser) return;

                if (
                    (newMsg.sender_id === user.id && newMsg.receiver_id === activeUser.id) ||
                    (newMsg.sender_id === activeUser.id && newMsg.receiver_id === user.id)
                ) {
                    setMessages(prev => [...prev, {
                        id: newMsg.id,
                        sender: newMsg.sender_id === user.id ? 'me' : newMsg.sender_id,
                        content: newMsg.content,
                        created_at: newMsg.created_at
                    }]);
                }
            })
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const userIds = new Set<string>();
                for (const id in state) {
                    // Supabase presence key is random, so we look at the payload
                    // Payload structure: [ { user_id: '...', online_at: '...' } ]
                    const users = state[id] as any[];
                    users.forEach(u => {
                        if (u.user_id) userIds.add(u.user_id);
                    });
                }
                setOnlineUsers(userIds);
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (activeUser && payload.payload.user_id === activeUser.id) {
                    setTypingUsers(prev => {
                        const next = new Set(prev);
                        next.add(activeUser.id);
                        return next;
                    });
                    setTimeout(() => {
                        setTypingUsers(prev => {
                            const next = new Set(prev);
                            next.delete(activeUser.id);
                            return next;
                        });
                    }, 3000);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [user, activeUser]); // Re-subscribing when activeUser changes is inefficient but simpler for now filters

    // Typing Emitter
    const handleTyping = async () => {
        await supabase.channel('chat_room').send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: user?.id }
        });
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, name').neq('id', user?.id);
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
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeUser.id}),and(sender_id.eq.${activeUser.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data.map(m => ({
                id: m.id,
                sender: m.sender_id === user.id ? 'me' : m.sender_id,
                content: m.content,
                created_at: m.created_at
            })));
        } else {
            setMessages([]);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [activeUser, user]);

    const handleSend = async () => {
        if (!input.trim() || !user || !activeUser) return;

        const content = input;
        setInput(''); // Optimistic clear

        const { error } = await supabase.from('messages').insert([{
            sender_id: user.id,
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
                                <div className={styles.avatar} style={{ position: 'relative' }}>
                                    {u.name.charAt(0)}
                                    {onlineUsers.has(u.id) && (
                                        <div style={{
                                            position: 'absolute', bottom: 0, right: 0, width: 10, height: 10,
                                            borderRadius: '50%', background: '#22c55e', border: '2px solid white'
                                        }} />
                                    )}
                                </div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{u.name}</div>
                                    <div className={styles.lastMsg}>
                                        {onlineUsers.has(u.id) ? 'Online' : 'Offline'}
                                    </div>
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
