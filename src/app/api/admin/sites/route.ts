import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const supabaseUrl = 'https://gfgejihnmtnwnfcxsfkf.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZ2VqaWhubXRud25mY3hzZmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NDY3MjEsImV4cCI6MjA4MjMyMjcyMX0.BTNOr6TUbSYTMTuLCCmSYttA3sefCWQ3Hx_rhWohINo';
        
        const authHeader = req.headers.get('Authorization');
        
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: authHeader || ''
                }
            }
        });
        
        const { data: sites, error } = await supabase
            .from('sites')
            .select('*')
            .order('name');

        if (error) throw error;

        return NextResponse.json(sites);
    } catch (error: any) {
        console.error("Sites API Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
