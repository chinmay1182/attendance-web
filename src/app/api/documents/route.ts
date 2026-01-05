
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Since documents might be user specific in future, let's keep it simple for now as all docs are public/company-wide?
        // Based on previous code: await supabase.from('documents').select('*'); -> seems global

        const cacheKey = `documents:all`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return NextResponse.json(JSON.parse(cached));
        } catch (e) { console.warn('Redis error', e); }

        const { data, error } = await supabaseAdmin
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        try {
            await redis.set(cacheKey, JSON.stringify(data), { EX: 3600 }); // 1 hour
        } catch (e) { console.warn('Redis write error', e); }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
