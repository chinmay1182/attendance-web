import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const supabaseUrl = 'https://gfgejihnmtnwnfcxsfkf.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZ2VqaWhubXRud25mY3hzZmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NDY3MjEsImV4cCI6MjA4MjMyMjcyMX0.BTNOr6TUbSYTMTuLCCmSYttA3sefCWQ3Hx_rhWohINo';
        
        // Get the auth token from the request headers
        const authHeader = req.headers.get('Authorization');
        
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: authHeader || ''
                }
            }
        });
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's company_id from users table
        const { data: userProfile } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle();

        let companyId = userProfile?.company_id;

        // Fallback to check if they are a company owner
        if (!companyId) {
            const { data: ownedCompany } = await supabase
                .from('companies')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();
            companyId = ownedCompany?.id;
        }

        if (!companyId) {
            return NextResponse.json({ error: 'No company found for user' }, { status: 404 });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('company_id', companyId)
            .order('name');

        if (error) throw error;

        return NextResponse.json(users);
    } catch (error: any) {
        console.error("API Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


