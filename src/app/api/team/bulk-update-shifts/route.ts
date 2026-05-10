
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { adminId, companyId, shiftStart, shiftEnd, siteId } = body;

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

        let userIdsToUpdate: string[] | null = null;

        // 2. If siteId is provided, get the list of users assigned to that site
        if (siteId) {
            const { data: assignments, error: assignErr } = await supabaseAdmin
                .from('site_assignments')
                .select('user_id')
                .eq('site_id', siteId)
                .eq('status', 'active');

            if (assignErr) {
                console.error('Fetch Site Assignments Error:', assignErr);
                return NextResponse.json({ error: 'Failed to fetch site assignments' }, { status: 500 });
            }

            userIdsToUpdate = assignments?.map(a => a.user_id) || [];
            
            if (userIdsToUpdate.length === 0) {
                return NextResponse.json({ success: true, updatedCount: 0, message: 'No active staff found for this site.' });
            }
        }

        // 3. Perform the bulk update
        let query = supabaseAdmin
            .from('users')
            .update({
                shift_start: shiftStart,
                shift_end: shiftEnd
            })
            .eq('company_id', companyId);

        if (userIdsToUpdate) {
            query = query.in('id', userIdsToUpdate);
        }

        const { data: updatedUsers, error: updateErr } = await query.select('id');

        if (updateErr) {
            console.error('Bulk Shift Update Error:', updateErr);
            return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        const count = updatedUsers?.length || 0;

        // 4. Record in history
        await supabaseAdmin.from('shift_history').insert({
            admin_id: adminId,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            applied_to_count: count,
            site_id: siteId || null
        });

        return NextResponse.json({ success: true, updatedCount: count });

    } catch (err: any) {
        console.error('Server API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
