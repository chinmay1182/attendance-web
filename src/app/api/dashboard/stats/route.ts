
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
        }

        const { data: currentUser, error: currentUserError } = await supabaseAdmin
            .from('users')
            .select('company_id, role')
            .eq('id', uid)
            .maybeSingle(); // use maybeSingle so missing records don't throw

        let companyId = currentUser?.company_id;

        // Fallback: if user not in users table or has no company_id, check if they're a company owner
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

        const today = new Date().toISOString().split('T')[0];

        const [docsRes, sitesRes, totalUsersRes, pendingLeavesRes, onLeaveTodayRes] = await Promise.all([
            // 1. Recent Documents
            currentUser?.role === 'admin'
                ? supabaseAdmin
                    .from('documents')
                    .select('*, users!inner(company_id)')
                    .eq('users.company_id', companyId)
                    .limit(3)
                    .order('created_at', { ascending: false })
                : supabaseAdmin
                    .from('documents')
                    .select('*')
                    .eq('user_id', uid)
                    .limit(3)
                    .order('created_at', { ascending: false }),

            // 2. Sites
            currentUser?.role === 'admin'
                ? supabaseAdmin
                    .from('sites')
                    .select('*')
                    .eq('company_id', companyId)
                    .limit(2)
                : supabaseAdmin
                    .from('sites')
                    .select('*, site_assignments!inner(user_id, status)')
                    .eq('site_assignments.user_id', uid)
                    .eq('site_assignments.status', 'active')
                    .limit(2),

            // 3. Total Active Users
            supabaseAdmin
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId),

            // 4. Pending Leave Requests
            supabaseAdmin
                .from('leave_requests')
                .select('id, users!inner(company_id)', { count: 'exact', head: true })
                .eq('status', 'pending')
                .eq('users.company_id', companyId),

            // 5. Users On Leave Today (Approved & Date overlaps today)
            supabaseAdmin.from('leave_requests')
                .select('id, users!inner(company_id)', { count: 'exact', head: true })
                .eq('status', 'approved')
                .eq('users.company_id', companyId)
                .lte('start_date', today)
                .gte('end_date', today)
        ]);

        const result = {
            docs: docsRes.data || [],
            sites: sitesRes.data || [],
            stats: {
                totalUsers: totalUsersRes.count || 0,
                pendingLeaves: pendingLeavesRes.count || 0,
                onLeaveToday: onLeaveTodayRes.count || 0
            }
        };

        return NextResponse.json(result);

    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
