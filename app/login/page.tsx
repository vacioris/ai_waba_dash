'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 paper-texture">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent to-accent-dark rounded-2xl flex items-center justify-center text-white font-display text-3xl shadow-lg shadow-accent/20">
              T
            </div>
          </div>
          <h1 className="font-display text-5xl font-light text-ink-800 mb-3 tracking-tight">
            Tanzifco
          </h1>
          <p className="text-ink-500 text-sm tracking-wider uppercase">
            Conversation Monitor
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-paper rounded-2xl border border-ink-200 p-8 shadow-sm">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-500 font-medium">
              Access Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="mt-2 w-full px-4 py-3 bg-ink-50 border border-ink-200 rounded-lg text-ink-800 font-mono focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="mt-4 px-4 py-3 bg-accent/5 border border-accent/20 rounded-lg text-sm text-accent-dark">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="mt-6 w-full py-3 bg-ink-800 hover:bg-ink-900 disabled:bg-ink-300 text-white rounded-lg font-medium tracking-wide transition shadow-sm"
          >
            {loading ? 'Verifying…' : 'Enter Dashboard'}
          </button>
        </form>

        <p className="text-center text-xs text-ink-400 mt-8 tracking-wide">
          Internal use only · Tanzifco Express
        </p>
      </div>
    </div>
  );
}
