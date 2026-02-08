export type UserRole = 'admin' | 'hr' | 'employee';

export interface UserProfile {
    id: string; // Firebase UID
    email: string;
    name: string;
    role: UserRole;
    photoURL?: string;
    phone?: string;
    bio?: string;
    shift_start?: string; // '09:00:00'
    shift_end?: string;
    department?: string;
    company_id?: string;
    createdAt: string;
}
