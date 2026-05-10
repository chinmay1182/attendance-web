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

        // Verify user belongs to this company (or is the owner)
        const { data: userRecord, error: userError } = await supabaseAdmin
            .from('users')
            .select('company_id, role')
            .eq('id', uid)
            .maybeSingle(); // Use maybeSingle() so null doesn't throw an error

        // If user record not found in users table, check if they're a company owner
        if (!userRecord) {
            // Fallback: check if user is owner of the company directly
            const { data: company, error: companyError } = await supabaseAdmin
                .from('companies')
                .select('*')
                .eq('id', companyId)
                .eq('owner_id', uid)
                .maybeSingle();

            if (companyError) {
                console.error('Company owner check error:', companyError);
                return NextResponse.json({ error: 'Company not found' }, { status: 404 });
            }

            if (company) {
                return NextResponse.json(company);
            }

            return NextResponse.json({ error: 'User not found or unauthorized' }, { status: 404 });
        }

        // Allow if user's company_id matches, OR if user is an admin/owner of this company
        const isOwner = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('id', companyId)
            .eq('owner_id', uid)
            .maybeSingle();

        const belongsToCompany = userRecord.company_id === companyId;
        const isCompanyOwner = !!isOwner.data;

        if (!belongsToCompany && !isCompanyOwner) {
            return NextResponse.json({ error: 'Unauthorized: You do not belong to this company' }, { status: 403 });
        }

        // Fetch company using admin client (bypasses RLS)
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

        if (error) {
            console.error('Company fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Company details error:', err);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
