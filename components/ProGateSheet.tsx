'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Lock } from 'lucide-react';
import { recordWaitlistEmail } from '@/lib/pro';
import { track } from '@/lib/analytics';

interface ProGateSheetProps {
  feature: 'planGen' | 'visionExtract' | 'boardImport';
  onDismiss: () => void;
}

const FEATURE_COPY: Record<ProGateSheetProps['feature'], { title: string; limit: string }> = {
  planGen:       { title: 'Trip plan limit reached',    limit: '3 AI trip plans per month' },
  visionExtract: { title: 'Vision limit reached',       limit: '5 image-based clips per month' },
  boardImport:   { title: 'Board import limit reached', limit: '10 shared board imports per month' },
};

export default function ProGateSheet({ feature, onDismiss }: ProGateSheetProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'done'>('idle');
  const copy = FEATURE_COPY[feature];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('submitting');
    await recordWaitlistEmail(email.trim());
    track('pro_waitlist_signup', { feature });
    setState('done');
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 bg-black/50 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      />
      <motion.div
        key="sheet"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-5 pt-6 pb-10 safe-bottom"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
            <Lock size={26} className="text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">{copy.title}</h2>
          <p className="text-sm text-gray-500">
            The free tier includes <span className="font-medium text-gray-700">{copy.limit}</span>.
            TravelPanel Pro removes all limits — it's coming soon.
          </p>
        </div>

        {state === 'done' ? (
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-green-700">You're on the list!</p>
            <p className="text-xs text-green-600 mt-0.5">We'll email you when Pro launches.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2">
              <Sparkles size={14} className="text-indigo-500 flex-shrink-0" />
              <p className="text-xs text-indigo-700 font-medium">
                Join the waitlist — get early access and launch pricing
              </p>
            </div>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              required
            />
            <button
              type="submit"
              disabled={state === 'submitting' || !email.trim()}
              className="w-full bg-indigo-600 text-white font-semibold text-sm py-3.5 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50"
            >
              {state === 'submitting' ? 'Joining…' : 'Notify me when Pro launches'}
            </button>
          </form>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
