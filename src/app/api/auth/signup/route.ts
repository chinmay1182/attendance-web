
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

        // Insert into Supabase using the Service Role Key (bypassing RLS)
        // We are trusting the client provided ID because we are not verifying Firebase token on server yet.
        // In a production app, you should verify the Firebase ID token here.
        const { data, error } = await supabaseAdmin
            .from('users')
            .insert([
                {
                    id,
                    email,
                    name,
                    role: role || 'employee',
                    // created_at will be handled by default value in DB
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
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
