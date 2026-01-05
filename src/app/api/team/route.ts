
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

import { redis } from '@/lib/redis';

export async function GET() {
    try {
        const cacheKey = `company:users:all`;

        // 1. Try Cache
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return NextResponse.json({ users: JSON.parse(cached) });
            }
        } catch (e) {
            console.warn('Redis read failed', e);
        }

        // 2. Fetch DB
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .order('name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Set Cache
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

        // Delete from Supabase Auth (Optional - usually requires Service Role)
        // For now, we just delete from the public.users table
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
