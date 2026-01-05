
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cacheKey = `notices:all`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return NextResponse.json(JSON.parse(cached));
        } catch (e) { console.warn('Redis error', e); }

        const { data, error } = await supabaseAdmin
            .from('notices')
            .select(`
                *,
                sender:users!sender_id(name)
            `)
            .order('created_at', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        try {
            await redis.set(cacheKey, JSON.stringify(data), { EX: 3600 });
        } catch (e) { console.warn('Redis write error', e); }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
