import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 px-5 pt-status pb-16">
      <div className="max-w-prose mx-auto">
        {/* Back */}
        <div className="pt-6 pb-4">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-sm font-medium"
          >
            <ArrowLeft size={15} />
            Settings
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Privacy Policy</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">Last updated: June 2026</p>

        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-2">Overview</h2>
            <p>
              TravelPanel is a travel inspiration clipper and trip planner. Your privacy matters to us.
              This policy explains what data we collect, how it is used, and your rights.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-2">Data stored on your device</h2>
            <p>
              All clips, boards, and trip plans are stored locally in your browser&apos;s IndexedDB.
              No account is required. This data never leaves your device unless you choose to export it.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-2">AI processing</h2>
            <p>
              When you save a clip, the URL (and optionally a preview image) is sent to Anthropic&apos;s
              Claude API to extract locations, tips, and wisdom from the post. This request is processed
              by Anthropic and subject to their{' '}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 underline"
              >
                privacy policy
              </a>
              . We do not store the raw URL or content beyond what is needed to fulfill the request.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-2">Analytics</h2>
            <p>
              We use PostHog for anonymous product analytics (e.g. how often the plan feature is used).
              No personally identifiable information is collected. You can opt out by disabling analytics
              in your device settings.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-2">Data sharing</h2>
            <p>
              We do not sell, rent, or share your personal data with third parties for marketing.
              The only data transmitted is the URL sent to the Anthropic API during clip enrichment.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-2">Your rights</h2>
            <p>
              You can delete all local data at any time via Settings → Danger Zone → Clear all local data.
              You can also export a full copy of your data as a JSON file.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-2">Contact</h2>
            <p>
              Questions about this policy? Email{' '}
              <a
                href="mailto:jiangnan027@gmail.com"
                className="text-indigo-600 dark:text-indigo-400 underline"
              >
                jiangnan027@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
