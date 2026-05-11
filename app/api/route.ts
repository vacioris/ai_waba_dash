import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { phone, flagged, reason } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  const sb = supabaseServer();
  // Set the flag (and optional reason) on ALL messages for this phone.
  // When unflagging, clear the reason too.
  const update: { review_flagged: boolean; flag_reason: string | null } = {
    review_flagged: !!flagged,
    flag_reason: flagged ? (reason ?? null) : null,
  };
  const { error } = await sb
    .from('conversations')
    .update(update)
    .eq('phone', phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
