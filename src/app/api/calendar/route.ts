
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (!start || !end) return NextResponse.json({ error: 'Missing dates' }, { status: 400 });

        const cacheKey = `calendar:${start}:${end}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return NextResponse.json(JSON.parse(cached));
        } catch (e) { console.warn('Redis error', e); }

        const [holidaysRes, leavesRes] = await Promise.all([
            supabaseAdmin.from('public_holidays').select('*').gte('date', start).lte('date', end),
            supabaseAdmin.from('leave_requests').select('*, users(name)').eq('status', 'approved').gte('start_date', start).lte('start_date', end)
        ]);

        const allEvents = [
            ...(holidaysRes.data || []).map((h: any) => ({ date: h.date, title: h.name, type: 'holiday' })),
            ...(leavesRes.data || []).map((l: any) => ({ date: l.start_date, title: `${l.users?.name} - ${l.type}`, type: 'leave' }))
        ];

        try {
            await redis.set(cacheKey, JSON.stringify(allEvents), { EX: 3600 });
        } catch (e) { console.warn('Redis write error', e); }

        return NextResponse.json(allEvents);
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
