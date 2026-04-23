
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        // Resolve company_id from uid
        let companyId: string | null = null;
        if (uid) {
            const { data: currentUser } = await supabaseAdmin
                .from('users')
                .select('company_id')
                .eq('id', uid)
                .single();
            companyId = currentUser?.company_id || null;
        }

        const cacheKey = companyId ? `notices:company:${companyId}` : `notices:all`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return NextResponse.json(JSON.parse(cached));
        } catch (e) { console.warn('Redis error', e); }

        let query = supabaseAdmin
            .from('notices')
            .select(`*, sender:users!sender_id(name, company_id)`)
            .order('created_at', { ascending: false });

        // If we know the company, filter to only notices sent by users in that company
        // (audience=all notices from any company could be global, but scoping by sender company is safer)
        if (companyId) {
            // Get all user IDs in this company to filter sender
            const { data: companyUsers } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('company_id', companyId);

            if (companyUsers && companyUsers.length > 0) {
                const userIds = companyUsers.map(u => u.id);
                query = query.in('sender_id', userIds) as any;
            }
        }

        const { data, error } = await query;

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        try {
            await redis.set(cacheKey, JSON.stringify(data), { EX: 300 }); // 5 min TTL for notices
        } catch (e) { console.warn('Redis write error', e); }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
