import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — TravelPanel',
  description: 'How TravelPanel handles your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: June 8, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Overview</h2>
            <p>
              TravelPanel (&quot;we&quot;, &quot;our&quot;) is a travel inspiration app that helps you save,
              organize, and plan around travel content from social media. We are committed to
              being transparent about what data we collect and how it is used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Data stored on your device</h2>
            <p>
              By default, all your data — saved clips, boards, trip plans, visit logs — is
              stored locally on your device using IndexedDB. We do not transmit or store this
              data on our servers unless you explicitly enable cloud sync (see below).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Data sent to Anthropic&apos;s API</h2>
            <p>
              When you save a URL or share a post, TravelPanel sends the URL and/or page
              content to Anthropic&apos;s Claude API for extraction (locations, tips, substance).
              This content is processed by Anthropic to generate structured data. We do not
              send any personally identifiable information to this API. Anthropic&apos;s data
              handling is governed by their{' '}
              <a href="https://www.anthropic.com/privacy" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Optional cloud sync (Supabase)</h2>
            <p>
              If you sign in to TravelPanel, your clips and boards are synced to a secure
              Supabase database. Your data is protected by row-level security and is only
              accessible to your account. You can export or delete your data at any time from
              the Settings page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Analytics (PostHog)</h2>
            <p>
              We use PostHog for anonymous product analytics (e.g., how many clips are saved
              per session). No personally identifiable information is included in these events.
              Analytics are only collected when a PostHog key is configured. You can opt out
              by disabling analytics in your device settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Location data</h2>
            <p>
              TravelPanel uses your device&apos;s GPS location only when you enable &quot;On-Trip
              Mode&quot;. Location data is processed entirely on-device and is never transmitted
              to our servers. Location history is stored locally in your visit log and can be
              deleted from the Timeline page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Data sharing</h2>
            <p>
              We do not sell, rent, or share your personal data with third parties for
              advertising or any other commercial purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Data deletion</h2>
            <p>
              You can delete all local data by clearing app data in your device settings, or
              by using &quot;Export and clear&quot; in Settings. If you have cloud sync enabled, you
              can request account deletion by contacting us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
            <p>
              For privacy questions or data deletion requests, contact:{' '}
              <a href="mailto:jiangnan027@gmail.com" className="text-indigo-600 hover:underline">
                jiangnan027@gmail.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
