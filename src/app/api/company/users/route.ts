
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redis } from '@/lib/redis';

// Force dynamic because we might add query params later, but for now it's static-ish
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('company_id')
            .eq('id', uid)
            .maybeSingle();

        let companyId = currentUser?.company_id;

        // Fallback: check if user is a company owner
        if (!companyId) {
            const { data: ownedCompany } = await supabaseAdmin
                .from('companies')
                .select('id')
                .eq('owner_id', uid)
                .maybeSingle();
            companyId = ownedCompany?.id || null;
        }

        if (!companyId) {
            return NextResponse.json({ error: 'User company not found' }, { status: 404 });
        }

        const cacheKey = `company:users:${companyId}`;

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
            .eq('company_id', companyId)
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

    } catch {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
