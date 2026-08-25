import { cookies } from 'next/headers';
import {
  createRouteHandlerClient,
  createServerActionClient,
  createServerComponentClient
} from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';

export function createServerSupabaseClient() {
  return createServerComponentClient<Database>({ cookies });
}

export function createServerActionSupabaseClient() {
  return createServerActionClient<Database>({ cookies });
}

export function createRouteHandlerSupabaseClient() {
  return createRouteHandlerClient<Database>({ cookies });
}
