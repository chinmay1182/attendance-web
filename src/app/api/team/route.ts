
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

        // 1. Get Admin's Company ID
        const { data: adminUser, error: adminError } = await supabaseAdmin
            .from('users')
            .select('company_id')
            .eq('id', uid)
            .single();

        if (adminError || !adminUser?.company_id) {
            return NextResponse.json({ error: 'User company not found' }, { status: 404 });
        }

        const companyId = adminUser.company_id;
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

        // 1. Delete Attendance Logs First (FK Constraint)
        const { error: attendanceError } = await supabaseAdmin
            .from('attendance')
            .delete()
            .eq('user_id', id);

        if (attendanceError) {
            console.error('Failed to delete attendance logs', attendanceError);
            return NextResponse.json({ error: 'Failed to delete user attendance data' }, { status: 500 });
        }

        // 2. Delete User Profile
        const { error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
