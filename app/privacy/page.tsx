'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import NavBar from '@/components/NavBar';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 safe-top pb-4 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Privacy Policy</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-28 space-y-6 max-w-2xl mx-auto w-full">
        <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: June 2026</p>

        <Section title="What TravelPanel does">
          <p>
            TravelPanel helps you save travel inspiration from social apps, extract locations and tips
            using AI, and plan trips. Your clips and boards are stored locally on your device using
            IndexedDB — they are <strong>never uploaded to our servers</strong> unless you explicitly
            enable cloud sync by providing your own Supabase keys.
          </p>
        </Section>

        <Section title="Data stored on your device">
          <ul className="list-disc pl-4 space-y-1">
            <li>URLs and titles of clips you save</li>
            <li>AI-extracted locations, activities, and tips from those clips</li>
            <li>Boards you create and their contents</li>
            <li>Trip plans you generate</li>
            <li>App preferences (theme, dismissed cards)</li>
          </ul>
          <p className="mt-2">All of this stays on your device. Clearing app data in iOS Settings removes it permanently.</p>
        </Section>

        <Section title="APIs we call">
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Anthropic Claude (required for AI features)</p>
          <p>
            When you clip a URL, the page content and/or screenshot is sent to Anthropic&apos;s API to
            extract locations and tips. Anthropic&apos;s privacy policy applies:{' '}
            <span className="text-indigo-600 dark:text-indigo-400 underline">anthropic.com/privacy</span>.
            Your API key is stored only in your environment — we never see it.
          </p>

          <p className="font-medium text-gray-700 dark:text-gray-300 mt-4 mb-1">PostHog (analytics — optional)</p>
          <p>
            If a PostHog project key is configured, anonymous usage events (e.g. &quot;clip saved&quot;,
            &quot;plan generated&quot;) are sent to PostHog. No personal information or clip content is
            included. If no key is provided, PostHog is completely inactive.
          </p>

          <p className="font-medium text-gray-700 dark:text-gray-300 mt-4 mb-1">Supabase (cloud sync — optional)</p>
          <p>
            Cloud backup is dormant by default. If you supply your own Supabase credentials, your
            data syncs to your Supabase project — a database you control.
          </p>
        </Section>

        <Section title="Data we do not collect">
          <ul className="list-disc pl-4 space-y-1">
            <li>We do not sell or share your data with third parties</li>
            <li>We do not collect names, emails, or account information</li>
            <li>We do not track your location (GPS is used on-device only for the trip mode feature)</li>
            <li>We do not serve advertising</li>
          </ul>
        </Section>

        <Section title="Children">
          <p>TravelPanel is not directed at children under 13 and we do not knowingly collect data from them.</p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy? Email us at{' '}
            <span className="text-indigo-600 dark:text-indigo-400">jiangnan027@gmail.com</span>.
          </p>
        </Section>
      </div>

      <NavBar active="boards" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}
