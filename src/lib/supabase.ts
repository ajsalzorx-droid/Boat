import { createClient } from '@/utils/supabase/client';

// Cookie-based browser client: shares the session created on /admin/login, so
// admin and kitchen requests carry the signed-in user's JWT instead of the anon key.
export const supabase = createClient();
