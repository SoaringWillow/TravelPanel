import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Privacy Policy — TravelPanel' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 safe-top">
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-indigo-600 text-sm font-medium mb-3"
        >
          <ArrowLeft size={16} />
          Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mt-1">Last updated: June 2026</p>
      </header>

      <div className="px-5 py-6 space-y-6 max-w-prose pb-20 safe-bottom">

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">What TravelPanel is</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            TravelPanel is a travel inspiration clipper and trip planner. You share URLs from social
            apps (WeChat, Xiaohongshu, Douyin, Bilibili, and others) and the app uses AI to extract
            locations and travel wisdom from those posts, then helps you plan trips around your saved
            clips.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Data stored on your device</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            All your clips, boards, and itineraries are stored locally in your browser's IndexedDB.
            No account is required. Your data stays on your device unless you explicitly export it or
            enable cloud sync (currently in development). Clearing your browser data or uninstalling
            the app permanently deletes your clips.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Data sent to Anthropic AI</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            When you clip a URL, the page content (text and, for supported platforms, an image) is
            sent to Anthropic's Claude API to extract locations, activities, and travel wisdom. This
            is processed transiently — Anthropic does not retain your data for training purposes
            under their standard API terms. We do not store the raw page content ourselves; only the
            structured extraction result is saved to your device.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Analytics</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            If the app is configured with a PostHog analytics key, anonymised usage events are
            recorded (e.g. "clip saved", "plan generated"). No personal identifiers are attached
            to these events. Analytics are used solely to improve the product. If PostHog is not
            configured (which you can verify in Settings → Configuration), no analytics data is
            sent.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">We do not sell your data</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We do not sell, rent, or share your personal data with advertisers or data brokers.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Deleting your data</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            You can permanently delete all clips, boards, and itineraries from your device at any
            time via Settings → Danger Zone → "Clear all data". This deletes the IndexedDB database
            on your device immediately and cannot be undone.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Children's privacy</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            TravelPanel is not directed at children under 13. We do not knowingly collect data from
            children.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Contact</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Questions about this policy? Email us at{' '}
            <a href="mailto:jiangnan027@gmail.com" className="text-indigo-600 underline">
              jiangnan027@gmail.com
            </a>
            {' '}or open an issue at{' '}
            <a
              href="https://github.com/SoaringWillow/TravelPanel/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline"
            >
              GitHub Issues
            </a>
            .
          </p>
        </section>

      </div>
    </div>
  );
}
