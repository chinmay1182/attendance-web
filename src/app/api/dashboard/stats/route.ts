
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

        // Fetch all data in parallel efficiently
        const today = new Date().toISOString().split('T')[0];

        const [docsRes, sitesRes, totalUsersRes, pendingLeavesRes, onLeaveTodayRes] = await Promise.all([
            // 1. Recent Documents
            supabaseAdmin.from('documents').select('*').limit(3).order('created_at', { ascending: false }),

            // 2. Sites
            supabaseAdmin.from('sites').select('*').limit(2),

            // 3. Total Active Users
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),

            // 4. Pending Leave Requests
            supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

            // 5. Users On Leave Today (Approved & Date overlaps today)
            supabaseAdmin.from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved')
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

    } catch (err: any) {
        console.error('Dashboard Stats Error:', err);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
