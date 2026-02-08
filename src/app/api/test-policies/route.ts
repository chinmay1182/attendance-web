import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('🧪 TEST API: Fetching policies directly from database...');

        // Check if supabaseAdmin is configured
        if (!supabaseAdmin) {
            console.error('❌ supabaseAdmin is not configured');
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
        }

        const { data, error } = await supabaseAdmin
            .from('leave_policies')
            .select('*')
            .order('name');

        console.log('🔍 Query result:', { data, error });

        if (error) {
            console.error('❌ Database error:', error);
            return NextResponse.json({
                error: error.message,
                details: error,
                hint: 'Check SUPABASE_SERVICE_ROLE_KEY in environment variables'
            }, { status: 500 });
        }

        console.log('✅ Successfully fetched:', data?.length, 'policies');
        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            policies: data
        });
    } catch (err: any) {
        console.error('❌ Exception:', err);
        return NextResponse.json({
            error: 'Internal Error',
            message: err.message,
            stack: err.stack
        }, { status: 500 });
    }
}
