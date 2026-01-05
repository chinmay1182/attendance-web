
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

// Force dynamic because we might add query params later, but for now it's static-ish
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cacheKey = `company:users:all`;

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
            .from('users')
            .select('*')
            .order('name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Set Cache (TTL 1 hour)
        try {
            await redis.set(cacheKey, JSON.stringify(data), { EX: 3600 });
        } catch (e) {
            console.warn('Redis write failed', e);
        }

        return NextResponse.json(data);

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
