
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const { username } = await request.json();

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('username', username)
            .single();

        if (error || !data) {
            return NextResponse.json({ email: null, error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ email: data.email });
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
