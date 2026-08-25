'use server';

import { createServerActionSupabaseClient } from '@/lib/supabase-server';

export async function loginAction(formData: FormData): Promise<string | null> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return 'Email and password are required.';
  }

  const supabase = createServerActionSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return error.message;
  }

  return null;
}
