'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Privacy Policy</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-11">Last updated: June 2026</p>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto prose prose-sm prose-gray">

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">What TravelPanel is</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            TravelPanel is a travel inspiration tool that lets you save URLs from social media (Instagram, YouTube, Xiaohongshu, etc.), extract locations and travel wisdom using AI, and plan trips based on your saved content.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Data stored on your device</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            All your clips, boards, and trip plans are stored locally on your device using IndexedDB (a browser database). This data never leaves your device unless you explicitly export or share it.
          </p>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-4">
            <li>Saved clip URLs, titles, and AI-extracted content</li>
            <li>Board names and organisation</li>
            <li>Generated trip plans</li>
            <li>App preferences and settings</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Data sent to third parties</h2>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Anthropic API (Claude AI)</p>
              <p className="text-sm text-gray-600">When you save a clip, TravelPanel sends the page URL and extracted text to Anthropic's Claude API to identify locations and extract travel wisdom. Anthropic's privacy policy governs this data. We do not send personal information — only the travel content you're clipping.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">PostHog Analytics (optional)</p>
              <p className="text-sm text-gray-600">If configured, we use PostHog to track anonymous usage events (e.g., "clip saved", "plan generated") to understand how the app is used. No personally identifiable information is collected. Events include only action names and aggregate counts.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">OpenFreeMap (Map tiles)</p>
              <p className="text-sm text-gray-600">The map is powered by OpenFreeMap. Your device fetches map tiles directly from their servers. No location data is sent by TravelPanel — standard browser tile requests are made when you view the map.</p>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Location (GPS)</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Location access is optional and only used when you tap "Near Me" to see saved spots close to you, or for the proactive resurfacing feature. Location data is processed entirely on your device and is never sent to our servers.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Data sharing and sale</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We do not sell your data. We do not share your data with advertisers. We do not monetise your personal information in any form.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Data deletion</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            All your data is on your device. Deleting the app removes all locally stored data. You can also export your data as JSON from Settings → Export all data before deleting.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Children</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            TravelPanel is not directed at children under 13. We do not knowingly collect information from children under 13.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Contact</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Questions about privacy? Email us at{' '}
            <a href="mailto:jiangnan027@gmail.com" className="text-indigo-600 hover:underline">
              jiangnan027@gmail.com
            </a>
          </p>
        </section>

      </div>
    </div>
  );
}
