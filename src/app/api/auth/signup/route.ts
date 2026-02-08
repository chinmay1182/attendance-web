
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

        // Insert into Supabase using the Service Role Key (bypassing RLS)
        const { data, error } = await supabaseAdmin
            .from('users')
            .insert([
                {
                    id,
                    email,
                    name,
                    role: role || 'employee',
                    company_id: companyId
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            // Rollback company creation if user creation fails (Manual rollback as no transactions in HTTP API easily)
            if (companyId) {
                await supabaseAdmin.from('companies').delete().eq('id', companyId);
            }
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
