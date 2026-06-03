'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { TripPlan, SavedItem } from '@/lib/types';
import { hapticImpact, hapticNotification } from '@/hooks/useHaptic';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface PlanChatProps {
  plan: TripPlan;
  boardItems: SavedItem[];
  onPlanUpdate: (updated: TripPlan) => void;
}

const SUGGESTIONS = [
  'Move the beach day to Day 1',
  'Add a coffee break in the morning',
  'What should I pack for this trip?',
  'Make Day 2 more relaxed',
];

export default function PlanChat({ plan, boardItems, onPlanUpdate }: PlanChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);
    hapticImpact('light');

    try {
      const res = await fetch('/api/plan-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, plan, boardItems }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply ?? 'Done!' }]);

      if (data.updatedPlan) {
        onPlanUpdate(data.updatedPlan as TripPlan);
        hapticNotification('success');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' },
      ]);
      hapticNotification('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 border-b border-indigo-100 dark:border-indigo-900/50">
        <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          Ask AI to modify your plan
        </span>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="px-4 py-3 space-y-3 max-h-60 overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-3 py-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Suggestion chips — shown only when no conversation yet */}
      {messages.length === 0 && (
        <div className="px-4 pt-3 pb-1 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              disabled={loading}
              className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-white/10">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(input); }}
          placeholder="e.g. Move beach day to Day 1…"
          disabled={loading}
          className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-indigo-700 active:scale-95 transition-all flex-shrink-0"
          aria-label="Send"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
