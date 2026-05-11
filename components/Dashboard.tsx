'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import { Search, Flag, LogOut, MessageCircle, Wifi, WifiOff, ChevronLeft } from 'lucide-react';

type ConvSummary = {
  phone: string;
  last_message: string | null;
  last_direction: 'Human' | 'AI';
  last_at: string;
  flagged: boolean;
  message_count: number;
};

type Message = {
  id: number;
  created_at: string;
  phone: string;
  direction: 'Human' | 'AI';
  message: string | null;
  notes: string | null;
  review_flagged?: boolean | null;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kuwait',
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuwait',
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export default function Dashboard() {
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [live, setLive] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  // --- Initial list load
  async function loadList() {
    setLoadingList(true);
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  // --- Load selected thread
  async function loadThread(phone: string) {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/conversations?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } finally {
      setLoadingThread(false);
    }
  }

  useEffect(() => {
    if (selected) {
      loadThread(selected);
      setMobileShowThread(true);
    } else {
      setMessages([]);
    }
  }, [selected]);

  // --- Auto-scroll thread to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Realtime subscription
  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          const newMsg = payload.new as Message;
          // Append to thread if it's the selected conversation
          setMessages((prev) =>
            selected === newMsg.phone ? [...prev, newMsg] : prev
          );
          // Refresh sidebar list
          loadList();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => loadList()
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [selected]);

  // --- Filtered conversations
  const filtered = useMemo(() => {
    let list = conversations;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => {
        const phone = (c.phone || '').toLowerCase();
        const msg = (c.last_message || '').toLowerCase();
        return phone.includes(q) || msg.includes(q);
      });
    }
    if (showFlaggedOnly) {
      list = list.filter((c) => c.flagged);
    }
    return list;
  }, [conversations, search, showFlaggedOnly]);

  const selectedConv = conversations.find((c) => c.phone === selected);

  // --- Toggle flag
  async function toggleFlag(phone: string, currentlyFlagged: boolean) {
    // Optimistic update
    setConversations((prev) =>
      prev.map((c) => (c.phone === phone ? { ...c, flagged: !currentlyFlagged } : c))
    );
    try {
      await fetch('/api/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, flagged: !currentlyFlagged }),
      });
    } catch {
      // revert on failure
      setConversations((prev) =>
        prev.map((c) =>
          c.phone === phone ? { ...c, flagged: currentlyFlagged } : c
        )
      );
    }
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  // --- Group thread messages by date for headers
  const groupedMessages = useMemo(() => {
    const groups: { date: string; items: Message[] }[] = [];
    for (const m of messages) {
      const d = formatDate(m.created_at);
      const last = groups[groups.length - 1];
      if (last && last.date === d) {
        last.items.push(m);
      } else {
        groups.push({ date: d, items: [m] });
      }
    }
    return groups;
  }, [messages]);

  return (
    <div className="h-screen flex flex-col bg-ink-50">
      {/* Top bar */}
      <header className="border-b border-ink-200 bg-paper px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center text-white font-display text-lg shadow-sm">
            T
          </div>
          <div>
            <h1 className="font-display text-xl text-ink-800 leading-none">Tanzifco</h1>
            <p className="text-[10px] uppercase tracking-widest text-ink-400 mt-0.5">
              Conversation Monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 text-xs font-medium ${
              live ? 'text-human' : 'text-ink-400'
            }`}
          >
            {live ? (
              <>
                <span className="w-2 h-2 rounded-full bg-human live-dot" />
                <span className="hidden sm:inline">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connecting…</span>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-800 transition px-3 py-1.5 rounded-md hover:bg-ink-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            mobileShowThread ? 'hidden md:flex' : 'flex'
          } w-full md:w-[340px] lg:w-[380px] flex-col border-r border-ink-200 bg-paper flex-shrink-0`}
        >
          {/* Search & filters */}
          <div className="p-4 border-b border-ink-200 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by phone or message…"
                className="w-full pl-9 pr-3 py-2.5 bg-ink-50 border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => setShowFlaggedOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                  showFlaggedOnly
                    ? 'bg-flag/10 text-flag border border-flag/30'
                    : 'text-ink-500 hover:text-ink-800 border border-transparent'
                }`}
              >
                <Flag className="w-3 h-3" />
                Flagged only
              </button>
              <span className="text-ink-400 font-mono">
                {filtered.length} {filtered.length === 1 ? 'thread' : 'threads'}
              </span>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-6 text-center text-sm text-ink-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <MessageCircle className="w-8 h-8 text-ink-300 mx-auto mb-3" />
                <p className="text-sm text-ink-500">
                  {search || showFlaggedOnly
                    ? 'No matches'
                    : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <ul>
                {filtered.map((c) => {
                  const isSelected = c.phone === selected;
                  return (
                    <li key={c.phone}>
                      <button
                        onClick={() => setSelected(c.phone)}
                        className={`w-full text-left px-4 py-3.5 border-b border-ink-100 transition relative group ${
                          isSelected
                            ? 'bg-accent/5'
                            : 'hover:bg-ink-50'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />
                        )}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[13px] text-ink-800 font-medium truncate">
                              {c.phone}
                            </span>
                            {c.flagged && (
                              <Flag className="w-3 h-3 text-flag flex-shrink-0 fill-flag/20" />
                            )}
                          </div>
                          <span className="text-[10px] text-ink-400 flex-shrink-0 font-mono">
                            {relativeTime(c.last_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] uppercase tracking-wider font-medium flex-shrink-0 ${
                              c.last_direction === 'AI' ? 'text-ai' : 'text-human'
                            }`}
                          >
                            {c.last_direction}
                          </span>
                          <span className="text-ink-300">·</span>
                          <p className="text-xs text-ink-500 truncate flex-1 rtl-aware">
                            {c.last_message || <span className="italic text-ink-400">(no text)</span>}
                          </p>
                        </div>
                        <div className="text-[10px] text-ink-400 mt-1 font-mono">
                          {c.message_count}{' '}
                          {c.message_count === 1 ? 'message' : 'messages'}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread pane */}
        <main
          className={`${
            mobileShowThread ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-ink-50 min-w-0`}
        >
          {!selected ? (
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-paper border border-ink-200 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-ink-400" />
                </div>
                <h2 className="font-display text-2xl text-ink-800 mb-2">
                  Select a conversation
                </h2>
                <p className="text-sm text-ink-500">
                  Pick a customer from the list to review the full chat between
                  them and the AI.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="border-b border-ink-200 bg-paper px-6 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobileShowThread(false)}
                    className="md:hidden p-1.5 -ml-1.5 rounded hover:bg-ink-100"
                  >
                    <ChevronLeft className="w-5 h-5 text-ink-600" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ink-200 to-ink-300 flex items-center justify-center text-ink-700 font-display flex-shrink-0">
                    {selected.slice(-2)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-ink-800 font-medium truncate">
                      {selected}
                    </div>
                    <div className="text-[11px] text-ink-400">
                      {selectedConv?.message_count ?? messages.length} messages
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() =>
                      selectedConv &&
                      toggleFlag(selectedConv.phone, selectedConv.flagged)
                    }
                    title="Mandatory: flag any conversation where the AI failed, gave wrong info, or needs review. Flagged conversations remain visible until you unflag them."
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition ${
                      selectedConv?.flagged
                        ? 'bg-flag/10 text-flag border-flag/30 hover:bg-flag/15'
                        : 'text-ink-500 border-ink-200 hover:border-flag/40 hover:text-flag'
                    }`}
                  >
                    <Flag
                      className={`w-3.5 h-3.5 ${
                        selectedConv?.flagged ? 'fill-flag/30' : ''
                      }`}
                    />
                    {selectedConv?.flagged ? 'Flagged' : 'Flag for review'}
                  </button>
                  <span className="text-[10px] text-ink-400 italic">
                    Mandatory · flag any AI mistake or issue
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div ref={threadRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
                {loadingThread ? (
                  <div className="text-center text-sm text-ink-400 py-12">
                    Loading conversation…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-ink-400 py-12">
                    No messages yet.
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-1">
                    {groupedMessages.map((group, gi) => (
                      <div key={gi}>
                        <div className="text-center my-6">
                          <span className="inline-block px-3 py-1 rounded-full bg-paper border border-ink-200 text-[10px] uppercase tracking-wider text-ink-500 font-medium">
                            {group.date}
                          </span>
                        </div>
                        {group.items.map((m, mi) => {
                          const isAI = m.direction === 'AI';
                          return (
                            <div
                              key={m.id}
                              className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-2 animate-slide-in`}
                              style={{ animationDelay: `${Math.min(mi * 20, 200)}ms` }}
                            >
                              <div className={`max-w-[78%] ${isAI ? 'mr-auto' : 'ml-auto'}`}>
                                <div
                                  className={`relative px-4 py-2.5 rounded-2xl ${
                                    isAI
                                      ? 'bubble-ai bg-[#eef2f4] text-ink-800 rounded-tl-md'
                                      : 'bubble-human bg-[#f0ece4] text-ink-800 rounded-tr-md'
                                  }`}
                                >
                                  <div
                                    className={`text-[10px] uppercase tracking-wider font-medium mb-1 ${
                                      isAI ? 'text-ai' : 'text-human'
                                    }`}
                                  >
                                    {isAI ? 'AI · Mohammed' : 'Customer'}
                                  </div>
                                  <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words rtl-aware">
                                    {m.message || <span className="italic text-ink-400">(empty message)</span>}
                                  </div>
                                  <div className="text-[10px] text-ink-400 mt-1 font-mono text-right">
                                    {formatTime(m.created_at)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
