
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gfgejihnmtnwnfcxsfkf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZ2VqaWhubXRud25mY3hzZmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NDY3MjEsImV4cCI6MjA4MjMyMjcyMX0.BTNOr6TUbSYTMTuLCCmSYttA3sefCWQ3Hx_rhWohINo'

export const supabase = createClient(supabaseUrl, supabaseKey)
