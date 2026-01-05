
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
        }

        const cacheKey = `leaves:${uid}`;

        // 1. Try Cache
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return NextResponse.json(JSON.parse(cached));
            }
        } catch (e) {
            console.warn('Redis read failed', e);
        }

        // 2. Fetch DB
        const { data, error } = await supabaseAdmin
            .from('leaves')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Set Cache (TTL 5 mins)
        try {
            await redis.set(cacheKey, JSON.stringify(data), { EX: 300 });
        } catch (e) {
            console.warn('Redis write failed', e);
        }

        return NextResponse.json(data);

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
