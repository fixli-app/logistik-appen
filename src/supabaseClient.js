import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xerzzwabcobrfzvumebx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlcnp6d2FiY29icmZ6dnVtZWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODczNTksImV4cCI6MjA5MzY2MzM1OX0.OZDjoCur-s3T6K3mAnLs_4ISMsJbZSCfIjHK0Cdu-c8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)