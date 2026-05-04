import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { phone, flagged } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  const sb = supabaseServer();
  // Set the flag on ALL messages for this phone, so when the list aggregates,
  // the "flagged" state appears regardless of which message it groups by.
  const { error } = await sb
    .from('conversations')
    .update({ review_flagged: !!flagged })
    .eq('phone', phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
