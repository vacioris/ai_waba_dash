import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client (anon key, RLS-bound) — used for realtime subscriptions
export const supabaseBrowser = () => createClient(url, anonKey);

// Server client (service role, bypasses RLS) — used for all data fetching
export const supabaseServer = () =>
  createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export type Conversation = {
  id: number;
  created_at: string;
  phone: string;
  direction: 'Human' | 'AI';
  message: string;
  notes: string | null;
  review_flagged?: boolean | null;
  flag_reason?: string | null;
};
