"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { UserProfile } from "../types/user";

interface AuthContextType {
    user: User | null; // Supabase User
    profile: UserProfile | null; // Supabase Profile
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (uid: string) => {
        const storageKey = `attendance_user_profile_${uid}`;
        // 1. Optimistic UI: Check LocalStorage first
        const cached = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setProfile(parsed);
                // Unblock UI if we have data
                setLoading(false);
            } catch (e) { console.warn(e); }
        }

        try {
            // 2. Fetch fresh profile from server API (Cached by Redis)
            // Note: Supabase Auth ID is the user's UUID.
            const response = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: uid }),
                cache: 'no-store'
            });

            if (response.ok) {
                const { user: profileData } = await response.json();
                if (profileData) {
                    setProfile(profileData as UserProfile);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(storageKey, JSON.stringify(profileData));
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching user profile:", err);
        }
    };

    useEffect(() => {
        // Init Session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user as unknown as User); // Casting for compatibility if types slightly differ
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user as unknown as User);
                fetchProfile(session.user.id);
                // Clean URL hash if present (e.g. after email confirmation)
                if (window.location.hash && window.location.hash.includes('access_token')) {
                    window.history.replaceState(null, '', window.location.pathname);
                }
            } else {
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        // 1. Instant UI Feedback
        setUser(null);
        setProfile(null);
        if (typeof window !== 'undefined' && user?.id) { // Changed user.uid to user.id for Supabase User
            localStorage.removeItem(`attendance_user_profile_${user.id}`);
        }
        setLoading(false);

        try {
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (e) {
            console.error("Logout failed", e);
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
