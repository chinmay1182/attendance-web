
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, email, name, role } = body;

        // Basic validation
        if (!id || !email) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 1. Create Company if Admin
        let companyId = null;

        if (role === 'admin') {
            if (!body.companyName) {
                return NextResponse.json({ error: 'Company Name is required for Admin' }, { status: 400 });
            }

            // Create Company first
            const companyCode = body.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000); // Simple slug

            const { data: companyData, error: companyError } = await supabaseAdmin
                .from('companies')
                .insert([{
                    name: body.companyName,
                    company_code: companyCode
                }])
                .select()
                .single();

            if (companyError) {
                console.error('Company Create Error:', companyError);
                return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
            }
            companyId = companyData.id;
        }

        // Use upsert to handle race condition:
        // Supabase may have a DB trigger that auto-inserts into public.users on auth.signup.
        // If that trigger fires first, a plain insert would throw a duplicate PK error.
        // upsert (ON CONFLICT DO UPDATE) safely handles both cases.
        const { data, error } = await supabaseAdmin
            .from('users')
            .upsert(
                {
                    id,
                    email,
                    name,
                    role: role || 'employee',
                    company_id: companyId
                },
                { onConflict: 'id' }
            )
            .select()
            .single();

        if (error) {
            console.error('Supabase Upsert Error:', error);
            // Rollback company creation if user upsert fails
            if (companyId) {
                await supabaseAdmin.from('companies').delete().eq('id', companyId);
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Create Business Profile for Trial period tracking if Admin
        if (role === 'admin') {
            const trialStart = new Date();
            const trialEnd = new Date();
            trialEnd.setDate(trialStart.getDate() + 7);

            const { error: profileError } = await supabaseAdmin
                .from('business_profiles')
                .insert([{
                    user_id: id,
                    company_name: body.companyName || null,
                    email: email,
                    user_name: name,
                    user_email: email,
                    project_name: 'attendance web',
                    trial_start_date: trialStart.toISOString(),
                    trial_end_date: trialEnd.toISOString(),
                    trial_extension_status: 'none',
                    trial_extension_days: 0
                }]);

            if (profileError) {
                console.error('Business Profile Setup Error:', profileError);
                // We won't block signup, but we log the error
            }
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
