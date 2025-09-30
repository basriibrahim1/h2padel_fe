// lib/supabase/admin.ts atau sejenisnya
import { createClient } from '@supabase/supabase-js';

// PENTING: Gunakan Service Role Key. Ini HARUS dirahasiakan
// dan hanya digunakan di server.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // HARUS SERVICE ROLE KEY
);

export { supabaseAdmin };