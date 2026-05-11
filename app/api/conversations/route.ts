import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, Conversation } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const sb = supabaseServer();

  if (phone) {
    // Single thread mode — return all messages for one phone, oldest first
    const { data, error } = await sb
      .from('conversations')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
  }

  // List mode — get most recent message per phone for the sidebar
  const { data, error } = await sb
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byPhone = new Map<string, {
    phone: string;
    last_message: string;
    last_direction: 'Human' | 'AI';
    last_at: string;
    flagged: boolean;
    flag_reason: string | null;
    message_count: number;
  }>();

  for (const m of (data ?? []) as Conversation[]) {
    const existing = byPhone.get(m.phone);
    if (!existing) {
      byPhone.set(m.phone, {
        phone: m.phone,
        last_message: m.message,
        last_direction: m.direction,
        last_at: m.created_at,
        flagged: !!m.review_flagged,
        flag_reason: m.flag_reason ?? null,
        message_count: 1,
      });
    } else {
      existing.message_count += 1;
      if (m.review_flagged) existing.flagged = true;
      // Take the first non-empty reason we see (rows are ordered newest first,
      // so this gives us the most recently saved reason)
      if (!existing.flag_reason && m.flag_reason) {
        existing.flag_reason = m.flag_reason;
      }
    }
  }

  const conversations = Array.from(byPhone.values()).sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
  );

  return NextResponse.json({ conversations });
}
