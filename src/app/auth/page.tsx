'use client'
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseclient";

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const m = params.get('mode');
    if (m === 'signin' || m === 'signup') setMode(m);
    const code = params.get('code');
    const type = params.get('type');
    // Handle confirmation/magic-link callbacks by exchanging code for a session
    async function handleExchange() {
      if (!code) return;
      try {
        setLoading(true);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        // Clean the URL and move to sign-in (or redirect if you prefer)
        window.history.replaceState({}, '', '/auth?mode=signin');
        setMessage(type === 'signup' ? 'Email confirmed. You can now sign in.' : 'You are signed in.');
        setMode('signin');
      } catch (e: unknown) {
        // If exchange fails, keep them on sign-in with an info message
        const errorMessage = e instanceof Error ? e.message : 'Could not verify email link. Try signing in.'
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    handleExchange();
  }, [params]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to sign up');
        setMessage('Check your email to confirm your account.');
        setMode('signin');
      } else {
        const res = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to sign in');
        // Set the session on the client so client components can use supabase
        if (json.session) {
          await supabase.auth.setSession({ access_token: json.session.access_token, refresh_token: json.session.refresh_token });
        }
        router.push('/home');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-8 sm:p-20">
        <div className="w-full max-w-sm rounded-xl bg-neutral-900 p-6 text-white shadow-lg">
          <p className="text-center text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-8 sm:p-20">
      <div className="w-full max-w-sm rounded-xl bg-neutral-900 p-6 text-white shadow-lg">
        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === 'signin' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === 'signup' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="mb-1 block text-sm text-neutral-300">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full rounded-md border border-transparent bg-neutral-800 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-600"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-neutral-300">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full rounded-md border border-transparent bg-neutral-800 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-600"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-neutral-300">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full rounded-md border border-transparent bg-neutral-800 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-600"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-400">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-400">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" className="underline" onClick={() => setMode('signup')}>Sign up</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="underline" onClick={() => setMode('signin')}>Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
