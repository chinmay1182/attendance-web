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

        // Fetch user profile to check trial info
        const { data, error } = await supabaseAdmin
            .from("business_profiles")
            .select("*")
            .eq("user_id", uid)
            .eq("project_name", "attendance web")
            .maybeSingle();

        if (error) {
            console.error('Supabase Trial Fetch Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ trial: data });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { uid, duration, unit } = body;

        if (!uid || !duration || !unit) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Convert duration to days based on unit
        let days = parseInt(duration);
        if (isNaN(days)) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        if (unit === 'weeks') {
            days = days * 7;
        } else if (unit === 'months') {
            days = days * 30; // Approximation
        }

        // Max 1 year limit (365 days)
        if (days > 365) {
            return NextResponse.json({ error: 'Extension cannot exceed 1 year (365 days).' }, { status: 400 });
        }

        // Fetch current trial profile
        const { data: currentProfile, error: fetchError } = await supabaseAdmin
            .from("business_profiles")
            .select("id")
            .eq("user_id", uid)
            .eq("project_name", "attendance web")
            .maybeSingle();

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!currentProfile) {
            return NextResponse.json({ error: 'Trial profile not found' }, { status: 404 });
        }

        // Update trial extension request
        const { data, error } = await supabaseAdmin
            .from("business_profiles")
            .update({
                trial_extension_days: days,
                trial_extension_status: 'pending',
                trial_extension_requested_at: new Date().toISOString()
            })
            .eq("id", currentProfile.id)
            .select()
            .single();

        if (error) {
            console.error('Supabase Trial Update Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, trial: data });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
