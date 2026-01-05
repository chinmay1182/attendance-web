
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cacheKey = `settings:general`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return NextResponse.json(JSON.parse(cached));
        } catch (e) { console.warn('Redis error', e); }

        const { data, error } = await supabaseAdmin.from('settings').select('value').eq('key', 'general').single();

        const settings = data || { value: {} };

        try {
            await redis.set(cacheKey, JSON.stringify(settings), { EX: 86400 }); // Cache setting for 24 hours
        } catch (e) { console.warn('Redis write error', e); }

        return NextResponse.json(settings);
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
