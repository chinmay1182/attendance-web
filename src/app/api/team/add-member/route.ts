
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password, role, companyId, username } = body;

        // Validation
        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // If username provided, validate simple format?
        if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
            return NextResponse.json({ error: 'Invalid username format (letters, numbers, underscore only)' }, { status: 400 });
        }

        // Check uniqueness of username early? Or let insert fail? 
        if (username) {
            const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('username', username).single();
            if (existingUser) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
            }
        }

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID is missing' }, { status: 400 });
        }

        // 1. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto confirm
            user_metadata: { name, username } // Save username in metadata too?
        });

        if (authError) {
            console.error('Auth Create Error:', authError);
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        const userId = authData.user.id;

        // 2. Create User Profile in DB
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .insert([{
                id: userId,
                name,
                email,
                role,
                company_id: companyId,
                username: username || null
            }]);

        if (dbError) {
            console.error('DB Insert Error:', dbError);
            // Optional: Delete auth user if DB insert fails to maintain consistency
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, userId });
    } catch (err: any) {
        console.error('Add Member API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
