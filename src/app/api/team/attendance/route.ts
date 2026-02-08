
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
        }

        // 1. Fetch all users
        const { data: users, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, name, department');

        if (userError) {
            console.error('Fetch users error:', userError);
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        // 2. Fetch attendance for that date
        const { data: attendance, error: attendanceError } = await supabaseAdmin
            .from('attendance')
            .select('*')
            .eq('date', date);

        if (attendanceError) {
            console.error('Fetch attendance error:', attendanceError);
            return NextResponse.json({ error: attendanceError.message }, { status: 500 });
        }

        // 3. Merge Data
        // If users is present, map them.
        const result = users?.map(u => {
            const att = attendance?.find(a => a.user_id === u.id);
            return {
                user_id: u.id,
                name: u.name,
                department: u.department,
                photoURL: null,
                status: att ? att.status : 'absent',
                clock_in: att ? att.clock_in : null,
                clock_out: att ? att.clock_out : null,
                total_hours: att ? att.total_hours : 0
            };
        });

        return NextResponse.json(result || []);

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
