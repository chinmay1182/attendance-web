
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

import { redis } from '@/lib/redis';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        const companyIdParam = searchParams.get('companyId');

        // 1. Get Admin's Company ID and Role
        const { data: adminUser, error: adminError } = await supabaseAdmin
            .from('users')
            .select('company_id, role')
            .eq('id', uid)
            .single();

        if (adminError) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Use param if provided, otherwise default to user's company
        let companyId = companyIdParam || adminUser.company_id;

        if (!companyId) {
            return NextResponse.json({ error: 'No company associated' }, { status: 400 });
        }

        const cacheKey = `company:users:${companyId}`;

        // 2. Try Cache
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return NextResponse.json({ users: JSON.parse(cached) });
            }
        } catch (e) {
            console.warn('Redis read failed', e);
        }

        // 3. Fetch DB
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('company_id', companyId)
            .order('name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 4. Set Cache
        try {
            await redis.set(cacheKey, JSON.stringify(data), { EX: 3600 });
        } catch (e) {
            console.warn('Redis write failed', e);
        }

        return NextResponse.json({ users: data });
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        // 0. Fetch user info to get company_id for cache invalidation
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('company_id')
            .eq('id', id)
            .single();

        const companyId = userData?.company_id;

        // 1. Delete from all potential related tables to handle FK constraints
        const tablesWithUserId = [
            'attendance',
            'site_assignments',
            'shift_history',
            'leave_requests',
            'candidate_notes',
            'overtime_requests',
            'expense_claims'
        ];

        for (const table of tablesWithUserId) {
            const { error: tableErr } = await supabaseAdmin
                .from(table)
                .delete()
                .eq('user_id', id);
            
            if (tableErr) {
                console.warn(`Non-critical error deleting from ${table}:`, tableErr.message);
            }
        }

        // 2. Delete User Profile from public.users
        const { error: profileError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', id);

        if (profileError) {
            console.error('Profile deletion error:', profileError);
            return NextResponse.json({ error: 'Failed to delete user profile: ' + profileError.message }, { status: 500 });
        }

        // 3. Delete from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        
        if (authError) {
            console.warn('Auth user deletion failed or user already gone:', authError.message);
        }

        // 4. Invalidate Redis Cache for the company
        if (companyId) {
            try {
                const { redis } = await import('@/lib/redis');
                const cacheKey = `company:users:${companyId}`;
                await redis.del(cacheKey);
            } catch (e) {
                console.warn('Redis cache invalidation failed:', e);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Delete API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
