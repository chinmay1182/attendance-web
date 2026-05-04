import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET: List holidays (cached for 24h)
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('public_holidays')
            .select('*')
            .order('date', { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

// POST: Add a holiday (admin only)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, date, type, requesterId } = body;

        if (!name || !date || !requesterId) {
            return NextResponse.json({ error: 'name, date, and requesterId are required' }, { status: 400 });
        }

        // Verify admin
        const { data: req } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
        if (req?.role !== 'admin' && req?.role !== 'hr') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from('public_holidays')
            .insert([{ name, date, type: type || 'Public Holiday' }])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

// DELETE: Remove a holiday (admin only)
export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { id, requesterId } = body;

        if (!id || !requesterId) {
            return NextResponse.json({ error: 'id and requesterId are required' }, { status: 400 });
        }

        // Verify admin
        const { data: req } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
        if (req?.role !== 'admin' && req?.role !== 'hr') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { error } = await supabaseAdmin.from('public_holidays').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
