"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Notification as AppNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '../lib/notificationHelper';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import styles from './NotificationBell.module.css';

export const NotificationBell = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Fetch notifications
    useEffect(() => {
        if (!user?.id) return;
        fetchNotifications();

        const channel = supabase
            .channel('user_notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newNotif = payload.new as AppNotification;
                        setNotifications(prev => [newNotif, ...prev]);
                        setUnreadCount(prev => prev + 1);

                        if (Notification && Notification.permission === 'granted') {
                            new Notification(newNotif.title, {
                                body: newNotif.message,
                                icon: '/myaccount.svg',
                            });
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as AppNotification;
                        setNotifications(prev =>
                            prev.map(n => (n.id === updated.id ? updated : n))
                        );
                        if (updated.is_read) {
                            setUnreadCount(prev => Math.max(0, prev - 1));
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deleted = payload.old as AppNotification;
                        setNotifications(prev => prev.filter(n => n.id !== deleted.id));
                        if (!deleted.is_read) {
                            setUnreadCount(prev => Math.max(0, prev - 1));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Request browser notification permission
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Re-calculate position on scroll/resize to keep it attached
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    const updatePosition = () => {
        if (buttonRef.current && isOpen) {
            const rect = buttonRef.current.getBoundingClientRect();
            const dropdownWidth = 360;
            let leftPos = rect.left;
            
            // If it's too close to the right edge, align right edge of dropdown to right edge of button
            if (leftPos + dropdownWidth > window.innerWidth - 20) {
                leftPos = rect.right - dropdownWidth;
            }

            setDropdownStyle({
                position: 'fixed',
                top: `${rect.bottom + 12}px`,
                left: `${leftPos}px`,
                zIndex: 1000000
            });
        }
    };

    const toggleDropdown = () => {
        if (!isOpen) {
            setTimeout(() => updatePosition(), 0); // Ensure state is ready
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    const fetchNotifications = async () => {
        if (!user?.id) return;

        setLoading(true);
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
        setLoading(false);
    };

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        if (notification.action_url) {
            router.push(notification.action_url);
        }
        setIsOpen(false);
    };

    const handleMarkAllRead = async () => {
        if (!user?.id) return;
        await markAllAsRead(user.id);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        await deleteNotification(notificationId);
    };

    const getNotificationIcon = (category?: string) => {
        switch (category) {
            case 'reward': return '🎉';
            case 'goal': return '🎯';
            case 'leave': return '📅';
            case 'document': return '📄';
            case 'task': return '📌';
            case 'attendance': return '⏰';
            default: return '🔔';
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className={styles.container}>
            <button
                ref={buttonRef}
                className={styles.bellButton}
                onClick={toggleDropdown}
                aria-label="Notifications"
            >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {isOpen && createPortal(
                <div
                    className={styles.dropdown}
                    ref={dropdownRef}
                    style={dropdownStyle}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className={styles.header}>
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className={styles.markAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className={styles.notificationList}>
                        {loading ? (
                            <div className={styles.loading}>Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className={styles.empty}>
                                <span className="material-symbols-outlined">notifications_off</span>
                                <p>No notifications</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className={styles.icon}>
                                        {getNotificationIcon(notification.category)}
                                    </div>
                                    <div className={styles.content}>
                                        <div className={styles.title}>{notification.title}</div>
                                        <div className={styles.message}>{notification.message}</div>
                                        <div className={styles.time}>{getTimeAgo(notification.created_at)}</div>
                                    </div>
                                    <button
                                        className={styles.deleteButton}
                                        onClick={(e) => handleDelete(e, notification.id)}
                                        aria-label="Delete notification"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
