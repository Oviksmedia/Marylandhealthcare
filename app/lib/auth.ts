import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabaseAdmin';

/**
 * Resolves the caller's identity and role from the server auth session.
 * Returns null if unauthenticated or profile not found.
 */
export async function getCallerProfile() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single();

  return profile;
}
