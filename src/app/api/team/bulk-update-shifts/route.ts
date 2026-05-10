
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { adminId, companyId, shiftStart, shiftEnd, siteId, isGlobal } = body;

        if (!adminId || (!companyId && !isGlobal) || !shiftStart || !shiftEnd) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Verify if the sender is an Admin
        const { data: adminUser, error: adminErr } = await supabaseAdmin
            .from('users')
            .select('role, id')
            .eq('id', adminId)
            .single();

        if (adminErr || adminUser?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized. Admin privileges required.' }, { status: 403 });
        }

        // 2. Determine target companies
        let targetCompanyIds: string[] = [];
        if (isGlobal) {
            // Get all companies where this user is an admin or the owner
            const { data: userCompanies } = await supabaseAdmin
                .from('users')
                .select('company_id')
                .eq('id', adminId)
                .eq('role', 'admin');
            
            const { data: ownedCompanies } = await supabaseAdmin
                .from('companies')
                .select('id')
                .eq('owner_id', adminId);

            const allCompanyIds = new Set([
                ...(userCompanies?.map(u => u.company_id).filter(Boolean) as string[]),
                ...(ownedCompanies?.map(c => c.id) || [])
            ]);
            
            targetCompanyIds = Array.from(allCompanyIds);
        } else {
            targetCompanyIds = [companyId];
        }


        if (targetCompanyIds.length === 0) {
            return NextResponse.json({ error: 'No target companies found.' }, { status: 404 });
        }

        let userIdsToUpdate: string[] | null = null;

        // 3. If siteId is provided, get the list of users assigned to that site
        if (siteId && !isGlobal) {
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

        // 4. Perform the bulk update
        let query = supabaseAdmin
            .from('users')
            .update({
                shift_start: shiftStart,
                shift_end: shiftEnd
            })
            .in('company_id', targetCompanyIds);

        if (userIdsToUpdate) {
            query = query.in('id', userIdsToUpdate);
        }

        const { data: updatedUsers, error: updateErr } = await query.select('id');


        if (updateErr) {
            console.error('Bulk Shift Update Error:', updateErr);
            return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        const count = updatedUsers?.length || 0;

        // 5. Record in history
        const { error: historyErr } = await supabaseAdmin.from('shift_history').insert({
            admin_id: adminId,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            applied_to_count: count,
            site_id: (siteId === 'all' || !siteId) ? null : siteId
        });

        if (historyErr) {
            console.error('History Recording Error:', historyErr);
            // We don't fail the whole request if history fails, but we log it
        }

        return NextResponse.json({ success: true, updatedCount: count });


    } catch (err: any) {
        console.error('Server API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
