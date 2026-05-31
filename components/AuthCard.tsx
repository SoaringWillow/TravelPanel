'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, LogIn, LogOut, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  cloudEnabled,
  signInWithEmail,
  signOut,
  getSession,
  onAuthChange,
} from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type SignInState = 'idle' | 'loading' | 'sent' | 'error';

export default function AuthCard() {
  const [session, setSession]       = useState<Session | null>(null);
  const [email, setEmail]           = useState('');
  const [signInState, setSignInState] = useState<SignInState>('idle');
  const [ready, setReady]           = useState(false);

  useEffect(() => {
    if (!cloudEnabled) { setReady(true); return; }

    getSession().then((s) => {
      setSession(s);
      setReady(true);
    });

    let unsub: (() => void) | null = null;
    onAuthChange((s) => setSession(s)).then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, []);

  async function handleSignIn() {
    if (!email.trim()) return;
    setSignInState('loading');
    const ok = await signInWithEmail(email.trim());
    setSignInState(ok ? 'sent' : 'error');
    if (!ok) setTimeout(() => setSignInState('idle'), 3000);
  }

  async function handleSignOut() {
    await signOut();
    setSession(null);
  }

  // ── Teaser (no keys) ─────────────────────────────────────────────────────
  if (!cloudEnabled) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
          <Cloud size={18} className="text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500">Sign in to sync ☁️</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            Sign in to back up your clips and access them on any device.
            Cloud sync is coming soon.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) return null;

  // ── Signed in ────────────────────────────────────────────────────────────
  if (session) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Cloud size={18} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Cloud Sync</p>
            <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
          </div>
          <div className="flex-shrink-0 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            Active
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    );
  }

  // ── Sign-in form ─────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Cloud size={18} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Cloud Sync</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Sign in to back up your clips and access them on any device.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {signInState === 'sent' ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 rounded-xl p-3 flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              Magic link sent! Check your email to sign in.
            </p>
          </motion.div>
        ) : (
          <motion.div key="form" className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={signInState === 'loading' || !email.trim()}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {signInState === 'loading' ? (
                  <span className="animate-spin text-sm">⏳</span>
                ) : (
                  <LogIn size={14} />
                )}
                Sign in
              </button>
            </div>
            {signInState === 'error' && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} />
                Sign-in failed. Please try again.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
