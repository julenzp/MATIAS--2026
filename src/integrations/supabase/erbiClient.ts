/**
 * Cliente Supabase externo — ERBI RUTAS 2026
 * Solo lectura (SELECT). Contiene los datos maestros:
 * - tracking_tokens
 * - passengers
 * - schedule_trips
 * - attendance_records
 */
import { createClient } from '@supabase/supabase-js';

const ERBI_URL = 'https://ewdgsvwieiczhzdcapyb.supabase.co';
const ERBI_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZGdzdndpZWljemh6ZGNhcHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjg5NDMsImV4cCI6MjA4NTgwNDk0M30.WYjU0KYS8RmPmytaoDEdhVtZH9CnVprxvwwIOv3sZi4';

export const supabaseErbi = createClient(ERBI_URL, ERBI_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
