
"use client";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Skeleton } from "./Skeleton";

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: string[];
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
    const { profile, loading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (!loading && profile && !allowedRoles.includes(profile.role)) {
            router.push('/dashboard');
        }
    }, [profile, loading, user, router, allowedRoles]);

    if (loading || !profile || !allowedRoles.includes(profile.role)) {
        return (
            <div style={{ padding: '40px', marginLeft: '280px' }}>
                <Skeleton height={40} width={300} style={{ marginBottom: '20px' }} />
                <Skeleton height={200} width="100%" borderRadius={16} />
            </div>
        );
    }

    return <>{children}</>;
};
