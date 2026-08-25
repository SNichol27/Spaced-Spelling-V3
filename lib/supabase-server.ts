import { cookies } from 'next/headers';
import {
  createRouteHandlerClient,
  createServerActionClient,
  createServerComponentClient
} from '@supabase/auth-helpers-nextjs';

export function createServerSupabaseClient() {
  return createServerComponentClient({ cookies });
}

export function createServerActionSupabaseClient() {
  return createServerActionClient({ cookies });
}

export function createRouteHandlerSupabaseClient() {
  return createRouteHandlerClient({ cookies });
}
