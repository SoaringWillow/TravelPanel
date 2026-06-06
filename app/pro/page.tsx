'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { PRO_FEATURES, PRO_PRICE } from '@/lib/pro';

const FAQ = [
  {
    q: 'How does the free tier work?',
    a: 'You can save unlimited clips and create unlimited boards. Free users get 5 AI trip plan generations per day and 10 enrichments per hour.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'Payments are processed through the Apple App Store. All major cards and Apple Pay are accepted.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel in iPhone Settings → Apple ID → Subscriptions at any time. You keep Pro until the end of the billing period.',
  },
  {
    q: 'Is my data safe?',
    a: 'Your clips are stored on-device by default. Cloud sync (included in Pro) is encrypted in transit and at rest.',
  },
  {
    q: 'Do unused plan generations roll over?',
    a: 'No — the daily limit resets at midnight local time. Pro removes the limit entirely.',
  },
];

export default function ProPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 px-4 pt-12 pb-10 text-white relative">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-white/80 text-sm mb-6 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="text-center">
          <div className="text-4xl mb-3">✨</div>
          <h1 className="text-2xl font-bold mb-2">TravelPanel Pro</h1>
          <p className="text-white/75 text-sm leading-relaxed max-w-xs mx-auto">
            Unlimited AI planning, cloud sync, and everything you need for serious travel curation.
          </p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 max-w-lg mx-auto">
        {/* Price card */}
        <div className="bg-white rounded-3xl shadow-md p-6 text-center">
          <p className="text-4xl font-bold text-gray-900">{PRO_PRICE}</p>
          <p className="text-gray-500 text-sm mt-1">Billed monthly · Cancel anytime</p>
          <button
            type="button"
            className="mt-5 w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 text-base"
          >
            Start Pro — {PRO_PRICE}
          </button>
          <p className="text-xs text-gray-400 mt-2">Payment through Apple App Store</p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-900 text-base">Everything in Pro</h2>
          {PRO_FEATURES.map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                <Check size={14} className="text-indigo-600" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{f.icon} {f.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-5">
          <h2 className="font-bold text-gray-900 text-base">Frequently Asked Questions</h2>
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <p className="text-sm font-semibold text-gray-800 mb-1">{q}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
