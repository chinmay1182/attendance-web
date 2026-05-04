import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');
        const uid = searchParams.get('uid');

        if (!companyId || !uid) {
            return NextResponse.json({ error: 'companyId and uid are required' }, { status: 400 });
        }

        // Verify user belongs to this company
        const { data: userRecord, error: userError } = await supabaseAdmin
            .from('users')
            .select('company_id')
            .eq('id', uid)
            .single();

        if (userError || !userRecord) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (userRecord.company_id !== companyId) {
            return NextResponse.json({ error: 'Unauthorized: You do not belong to this company' }, { status: 403 });
        }

        // Fetch company using admin client (bypasses RLS)
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Company details error:', err);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
