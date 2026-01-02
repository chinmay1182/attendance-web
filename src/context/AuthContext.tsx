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
                // Fetch profile from server API (to bypass RLS)
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
            }
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
