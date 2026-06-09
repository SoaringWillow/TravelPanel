'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Chrome, RefreshCw, LogOut, CheckCircle2, Cloud } from 'lucide-react';
import { cloudEnabled, signInWithEmail, signInWithGoogle, signOut, getSession, onAuthChange } from '@/lib/supabase';
import { syncNow } from '@/lib/cloudSync';
import NavBar from '@/components/NavBar';
import type { Session } from '@supabase/supabase-js';

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail]     = useState('');
  const [emailSent, setEmailSent]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncResult, setSyncResult] = useState('');

  useEffect(() => {
    // Get current session
    getSession().then(setSession);

    // Listen for auth state changes and auto-sync on sign-in
    let unsub = () => {};
    onAuthChange((s) => {
      setSession(s);
      if (s) {
        // Auto-sync on sign-in
        void handleSync();
      }
    }).then((fn) => { unsub = fn; });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEmailSignIn() {
    if (!email.trim()) return;
    setLoading(true);
    const sent = await signInWithEmail(email.trim());
    setLoading(false);
    if (sent) {
      setEmailSent(true);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    setSession(null);
  }

  async function handleSync() {
    setSyncStatus('syncing');
    const result = await syncNow();
    if (result) {
      setSyncStatus('synced');
      setSyncResult(`↑ ${result.pushed} pushed, ↓ ${result.pulled} pulled`);
      setTimeout(() => setSyncStatus('idle'), 4000);
    } else {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  }

  // ── Not configured ──────────────────────────────────────────────────────────

  if (!cloudEnabled) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 pb-4" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors -ml-1" aria-label="Go back">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Account & Sync</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Cloud size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">Cloud sync not configured</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Add <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
            to enable multi-device sync.
          </p>
        </div>
        <NavBar active="settings" />
      </div>
    );
  }

  // ── Signed in ───────────────────────────────────────────────────────────────

  if (session) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 pb-4" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors -ml-1" aria-label="Go back">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Account & Sync</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 space-y-4">
          {/* User card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold text-lg">
              {session.user.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{session.user.email}</p>
              <p className="text-xs text-green-600 font-medium">Signed in</p>
            </div>
          </div>

          {/* Sync card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Sync now</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {syncStatus === 'synced' ? syncResult : 'Push and pull all clips and boards'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncStatus === 'syncing'}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  syncStatus === 'synced'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : syncStatus === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                } disabled:opacity-50`}
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : syncStatus === 'synced' ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <RefreshCw size={15} />
                )}
                {syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'synced' ? 'Done' : 'Sync'}
              </button>
            </div>
          </div>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>

        <NavBar active="settings" />
      </div>
    );
  }

  // ── Signed out ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 pb-4" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors -ml-1" aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Account & Sync</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-24 space-y-5">
        {emailSent ? (
          <div className="flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={48} className="text-green-500" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Check your email</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              We sent a magic link to <strong>{email}</strong>. Tap it to sign in.
            </p>
            <button type="button" onClick={() => setEmailSent(false)} className="text-sm text-indigo-600 hover:underline mt-2">
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <Cloud size={40} className="text-indigo-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Sync your travels</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to back up your clips and access them on any device.</p>
            </div>

            {/* Email sign-in */}
            <div className="space-y-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSignIn()}
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={handleEmailSignIn}
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Mail size={16} />
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Google sign-in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Chrome size={16} />
              Continue with Google
            </button>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Your clips are stored locally. Signing in enables cloud backup only.
            </p>
          </>
        )}
      </div>

      <NavBar active="settings" />
    </div>
  );
}
