
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
        // Only an Admin can update/create companies
        if (requesterId) {
             const { data: requesterProfile } = await supabaseAdmin
                .from('users')
                .select('role, company_id')
                .eq('id', requesterId)
                .single();

             if (requesterProfile?.role !== 'admin') {
                 return NextResponse.json({ error: 'Unauthorized: Admins only' }, { status: 403 });
             }

             // If UPDATING (id exists), ensure they only update their own company
             if (id && requesterProfile.company_id !== id) {
                 return NextResponse.json({ error: 'Unauthorized: You can only update your own company' }, { status: 403 });
             }
        } else {
            return NextResponse.json({ error: 'Unauthorized: Requester ID required' }, { status: 401 });
        }

        // 2. Perform Operation using Admin Client (Bypasses RLS)
        let data, error;
        
        if (id) {
            // UPDATE
            const result = await supabaseAdmin
                .from("companies")
                .update(updates)
                .eq("id", id)
                .select()
                .single();
            data = result.data;
            error = result.error;
        } else {
            // INSERT (Create)
            const result = await supabaseAdmin
                .from("companies")
                .insert([updates])
                .select()
                .single();
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error('Supabase Company Operation Error:', error);
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
