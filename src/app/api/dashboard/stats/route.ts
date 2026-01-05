
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
        }

        const cacheKey = `dashboard:stats:${uid}`;

        // 1. Try Cache
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return NextResponse.json(JSON.parse(cached));
            }
        } catch (e) {
            console.warn('Redis read failed', e);
        }

        // 2. Fetch all data in parallel
        const [docsRes, sitesRes] = await Promise.all([
            supabaseAdmin.from('documents').select('*').limit(3).order('created_at', { ascending: false }),
            supabaseAdmin.from('sites').select('*').limit(2)
        ]);

        const result = {
            docs: docsRes.data || [],
            sites: sitesRes.data || []
        };

        // 3. Set Cache (TTL 10 mins - these don't change often)
        try {
            await redis.set(cacheKey, JSON.stringify(result), { EX: 600 });
        } catch (e) {
            console.warn('Redis write failed', e);
        }

        return NextResponse.json(result);

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
