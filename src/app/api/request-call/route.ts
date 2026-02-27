import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(req: Request) {
    try {
        const { fullName, mobile } = await req.json();

        if (!fullName || !mobile) {
            return NextResponse.json({ error: 'Name and Mobile number are required' }, { status: 400 });
        }

        // Insert into Supabase 'call_requests' table
        const { data, error } = await supabase
            .from('call_requests')
            .insert([
                { full_name: fullName, mobile: mobile }
            ]);

        if (error) {
            console.error('Supabase Error Insert Call Request:', error);
            return NextResponse.json({ error: 'Could not submit request' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Request saved successfully' }, { status: 200 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
