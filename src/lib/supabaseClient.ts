
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gfgejihnmtnwnfcxsfkf.supabase.co'
const supabaseKey = 'sb_publishable_bwAZ3HOZUsumX7sp1puUag_8ehm-jVV'

export const supabase = createClient(supabaseUrl, supabaseKey)
