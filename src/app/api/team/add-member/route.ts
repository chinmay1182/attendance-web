
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            name, email, password, role, companyId, username,
            department, phone, bio, id_proof, address, salary, joiningDate 
        } = body;

        // Validation
        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing name, email, password or role' }, { status: 400 });
        }

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID is missing' }, { status: 400 });
        }

        // 1. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, username }
        });

        if (authError) {
            console.error('Auth Create Error:', authError);
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        const userId = authData.user.id;

        // 2. Fetch Corporate ID for the company
        const { data: companyData } = await supabaseAdmin
            .from('companies')
            .select('corporate_id')
            .eq('id', companyId)
            .single();

        const corporate_id = companyData?.corporate_id || null;

        // 3. Create User Profile in DB
        const insertData: any = {
            id: userId,
            name,
            email,
            role,
            company_id: companyId,
            corporate_id,
            username: username || null,
            department: department || null,
            phone: phone || null,
            bio: bio || null,
            id_proof: id_proof || null,
            address: address || null,
            salary: salary ? parseFloat(salary) : null
        };

        if (joiningDate) {
            insertData.created_at = new Date(joiningDate).toISOString();
        }

        const { error: dbError } = await supabaseAdmin
            .from('users')
            .upsert([insertData], { onConflict: 'id' });

        if (dbError) {
            console.error('DB Upsert Error:', dbError);
            // Cleanup auth user on failure if it was a fresh creation
            // Note: If upsert failed, we still might want to keep the auth user
            // but for safety in this flow, we delete if it's a fresh attempt
            // await supabaseAdmin.auth.admin.deleteUser(userId); 
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, userId });
    } catch (err: any) {
        console.error('Add Member API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
