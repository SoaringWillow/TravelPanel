import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={15} />
          Back to Settings
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: June 2026</p>

        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">What TravelPanel collects</h2>
            <p>
              TravelPanel stores your saved clips (URLs, extracted text, locations, and tips) locally on your device using IndexedDB. This data never leaves your device unless you explicitly export it or enable cloud sync (coming soon).
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">What we send to third parties</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Anthropic API</strong> — When you save a clip, we send the URL (and optionally a screenshot) to Anthropic&apos;s Claude API to extract locations and tips. We do not send personal information or account data. Anthropic&apos;s privacy policy applies.
              </li>
              <li>
                <strong>PostHog</strong> — We use PostHog for anonymous usage analytics (e.g., "clip saved", "plan generated"). No personally identifiable information is attached to these events. Analytics can be opted out via the settings page.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Location data</h2>
            <p>
              If you enable On-Trip GPS mode, your device location is used to show nearby saved clips. Location data is processed entirely on-device and is never transmitted to our servers or any third party.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Data you can delete</h2>
            <p>
              All your data is stored on your device. You can export a full backup or delete individual clips at any time. Uninstalling the app removes all locally stored data.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Children</h2>
            <p>
              TravelPanel is not directed at children under 13. We do not knowingly collect data from children.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Contact</h2>
            <p>
              Questions? Email us at{' '}
              <a href="mailto:jiangnan027@gmail.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                jiangnan027@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
