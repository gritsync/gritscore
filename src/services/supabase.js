import { createClient } from '@supabase/supabase-js'
import config from '../config/environment.js'

const supabaseUrl = config.SUPABASE_URL || 'https://frojcdtvkoacfsjsadzl.supabase.co'
const supabaseAnonKey = config.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyb2pjZHR2a29hY2ZzanNhZHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzE5NzQsImV4cCI6MjA0NjU0Nzk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 