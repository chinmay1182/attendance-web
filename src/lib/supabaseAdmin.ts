
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gfgejihnmtnwnfcxsfkf.supabase.co'
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZ2VqaWhubXRud25mY3hzZmtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc0NjcyMSwiZXhwIjoyMDgyMzIyNzIxfQ.PP6v0b39JP1Nfau6ox8Wwcs2gH8gM_JeXBh5Ojf2teA'

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
