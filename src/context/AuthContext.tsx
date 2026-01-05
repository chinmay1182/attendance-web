"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebaseClient";
import { supabase } from "../lib/supabaseClient";
import { UserProfile } from "../types/user";

interface AuthContextType {
    user: User | null; // Firebase User
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // 1. Optimistic UI: Check LocalStorage first
                const storageKey = `attendance_user_profile_${firebaseUser.uid}`;
                const cached = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        setProfile(parsed);
                        // If we have cached data, unblock UI immediately
                        setLoading(false);
                    } catch (e) {
                        console.warn("Error parsing cached profile", e);
                    }
                }

                // 2. Fetch fresh profile from server API (to bypass RLS)
                try {
                    const response = await fetch('/api/user/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: firebaseUser.uid })
                    });

                    if (response.ok) {
                        const { user: profileData, error } = await response.json();
                        if (profileData) {
                            setProfile(profileData as UserProfile);
                            // Update LocalStorage
                            if (typeof window !== 'undefined') {
                                localStorage.setItem(storageKey, JSON.stringify(profileData));
                            }
                        } else {
                            // Handle profile not found (optional: create one?)
                            console.log("No profile found for user.");
                        }
                    }
                } catch (err) {
                    console.error("Error fetching user profile:", err);
                }
            } else {
                setProfile(null);
                // Clear local storage on logout? Optional, better to keep for quick login if same user
            }
            // Ensure loading is set to false in all cases (if not already done by cache)
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
