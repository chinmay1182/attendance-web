
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, updates, requesterId } = body;

        if (!id || !updates) {
            return NextResponse.json(
                { error: 'Missing ID or updates' },
                { status: 400 }
            );
        }

        // 1. Authorization Check: 
        // Only an Admin from the SAME company should be able to update it
        if (requesterId) {
             const { data: requesterProfile } = await supabaseAdmin
                .from('users')
                .select('role, company_id')
                .eq('id', requesterId)
                .single();

             if (requesterProfile?.role !== 'admin') {
                 return NextResponse.json({ error: 'Unauthorized: Admins only' }, { status: 403 });
             }

             if (requesterProfile.company_id !== id) {
                 // Unless they are a super-admin (which we don't have yet), 
                 // they can only update their own company.
                 return NextResponse.json({ error: 'Unauthorized: You can only update your own company' }, { status: 403 });
             }
        } else {
            return NextResponse.json({ error: 'Unauthorized: Requester ID required' }, { status: 401 });
        }

        // 2. Update company using Admin Client (Bypasses RLS)
        const { data, error } = await supabaseAdmin
            .from("companies")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error('Supabase Company Update Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, company: data });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
