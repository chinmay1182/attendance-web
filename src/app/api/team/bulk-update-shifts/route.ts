
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { adminId, companyId, shiftStart, shiftEnd } = body;

        if (!adminId || !companyId || !shiftStart || !shiftEnd) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Verify if the sender is actually an Admin of that company
        const { data: adminUser, error: adminErr } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', adminId)
            .eq('company_id', companyId)
            .single();

        if (adminErr || adminUser?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized. Admin privileges required.' }, { status: 403 });
        }

        // 2. Perform the bulk update
        const { data: updatedUsers, error: updateErr } = await supabaseAdmin
            .from('users')
            .update({
                shift_start: shiftStart,
                shift_end: shiftEnd
            })
            .eq('company_id', companyId)
            .select('id');

        if (updateErr) {
            console.error('Bulk Shift Update Error:', updateErr);
            return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        const count = updatedUsers?.length || 0;

        // 3. Record in history
        await supabaseAdmin.from('shift_history').insert({
            admin_id: adminId,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            applied_to_count: count
        });

        return NextResponse.json({ success: true, updatedCount: count });

    } catch (err: any) {
        console.error('Server API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
