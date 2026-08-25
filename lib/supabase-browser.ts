'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';

export function createBrowserSupabaseClient() {
  return createClientComponentClient<Database>();
}
