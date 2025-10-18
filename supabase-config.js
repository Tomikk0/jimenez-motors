// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://your-project-ref.supabase.co'
const supabaseKey = 'your-anon-key'
export const supabase = createClient(supabaseUrl, supabaseKey)
