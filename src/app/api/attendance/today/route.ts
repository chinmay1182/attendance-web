
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

        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `attendance:today:${today}:${uid}`;

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
            .from('attendance')
            .select('*')
            .eq('user_id', uid)
            .eq('date', today)
            .single();

        if (error && error.code !== 'PGRST116') {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const result = data || null;

        // 3. Set Cache (Short TTL as clock-ins happen)
        try {
            // Cache for 60 seconds to reduce spam, but allow updates to appear relatively quickly
            await redis.set(cacheKey, JSON.stringify(result), { EX: 60 });
        } catch (e) {
            console.warn('Redis write failed', e);
        }

        return NextResponse.json(result);

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
