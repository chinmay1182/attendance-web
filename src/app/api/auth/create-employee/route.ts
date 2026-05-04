import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            name, email, password, role,
            department, position, phone,
            shift_start, shift_end,
            company_id, created_by,
        } = body;

        if (!name || !email || !password || !company_id) {
            return NextResponse.json({ error: 'Missing required fields: name, email, password, company_id' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Step 1: Verify the requester is an admin in the same company
        if (created_by) {
            const { data: requester, error: reqErr } = await supabaseAdmin
                .from('users')
                .select('role, company_id')
                .eq('id', created_by)
                .single();

            if (reqErr || !requester) {
                return NextResponse.json({ error: 'Requester not found' }, { status: 403 });
            }
            if (requester.role !== 'admin' && requester.role !== 'hr') {
                return NextResponse.json({ error: 'Only Admin or HR can create employees' }, { status: 403 });
            }
            if (requester.company_id !== company_id) {
                return NextResponse.json({ error: 'Cannot create employee for a different company' }, { status: 403 });
            }
        }

        // Step 2: Create auth user using admin API (does not send confirmation email)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm so employee can log in immediately
        });

        if (authError) {
            console.error('Auth create error:', authError);
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        const userId = authUser.user.id;

        // Step 3: Upsert profile into users table
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                email,
                name,
                role: role || 'employee',
                department: department || null,
                position: position || null,
                phone: phone || null,
                shift_start: shift_start || '09:00',
                shift_end: shift_end || '18:00',
                company_id,
            }, { onConflict: 'id' })
            .select()
            .single();

        if (profileError) {
            console.error('Profile upsert error:', profileError);
            // Cleanup: delete the auth user if profile creation failed
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return NextResponse.json({ error: 'Failed to create employee profile: ' + profileError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, employee: profileData });

    } catch (err: any) {
        console.error('Create employee error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
