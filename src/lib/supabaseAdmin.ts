
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gfgejihnmtnwnfcxsfkf.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceRoleKey) {
    // We can't throw here because it might break build time if env is missing,
    // but we should warn or handle it. For now, we'll let operations fail if key is missing.
    console.warn('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || '')
