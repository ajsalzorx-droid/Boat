import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { isAdminEmail } from '@/lib/admin-emails'

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message)
  }
}

/**
 * "Verify token" middleware for admin server actions.
 * Reads the session cookie and asks Supabase to verify the JWT (getUser() checks the
 * signature and expiry with the Auth server). Throws 401 if there is no valid token,
 * 403 if the user isn't an admin.
 */
export async function verifyAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new AuthError('Please log in again.', 401)
  if (!isAdminEmail(user.email)) throw new AuthError('This account is not allowed to make changes.', 403)

  // Writes use the service_role client when configured (lets RLS block every direct write);
  // otherwise they fall back to the verified user's own session.
  const db = createServiceClient() ?? supabase
  return { user, db }
}
