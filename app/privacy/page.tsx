'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Privacy Policy</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-11">Last updated: June 2026</p>
      </div>

      <div className="px-5 py-6 pb-16 max-w-lg mx-auto space-y-6 text-sm text-gray-700 leading-relaxed">

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">1. Data You Provide</h2>
          <p>
            TravelPanel saves URLs, extracted location data, and your personal notes entirely
            <strong> on your device</strong> using browser storage (IndexedDB). We do not
            have a database of your clips unless you choose to enable optional cloud sync
            (a future feature).
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">2. AI Processing</h2>
          <p>
            When you clip a URL, its content is sent to <strong>Anthropic</strong> (the makers
            of Claude AI) to extract location data, tips, and insights. Anthropic&apos;s API
            is used solely for processing your request; Anthropic does <strong>not</strong> use
            your data to train AI models under their standard API terms.
          </p>
          <p className="mt-2">
            For full details, see{' '}
            <a
              href="https://www.anthropic.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline"
            >
              Anthropic&apos;s Privacy Policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">3. Analytics</h2>
          <p>
            We use <strong>PostHog</strong> for optional, anonymous product analytics to understand
            which features are most useful. Analytics tracks events like "clip saved" or
            "plan generated" — never the content of your clips or personal information.
            No analytics data is sold or shared with advertisers.
          </p>
          <p className="mt-2">You can disable analytics at any time in Settings.</p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">4. Data Storage &amp; Security</h2>
          <p>
            All your clips, boards, and trip plans are stored locally in your browser&apos;s
            IndexedDB. This data stays on your device and is not transmitted to our servers
            unless you explicitly use the Export feature or enable cloud sync.
          </p>
          <p className="mt-2">
            If you clear your browser/app storage, your data will be deleted. We recommend
            using the <strong>Export Data</strong> feature in Settings to keep a backup.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">5. Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Anthropic Claude API</strong> — AI content extraction</li>
            <li><strong>PostHog</strong> — Anonymous product analytics (opt-in)</li>
            <li><strong>OpenFreeMap / MapLibre</strong> — Map tiles (no account required)</li>
            <li><strong>Vercel</strong> — App hosting (processes HTTPS requests)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">6. Children&apos;s Privacy</h2>
          <p>
            TravelPanel is not directed at children under 13. We do not knowingly collect
            personal information from children. If you believe a child has provided us with
            personal data, please contact us so we can delete it.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">7. Advertising</h2>
          <p>
            TravelPanel does not display advertisements and does not share your data with
            advertising networks.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated via an in-app notice. Your continued use of the app after any
            changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">9. Contact</h2>
          <p>
            Questions or concerns? Email us at{' '}
            <a href="mailto:jiangnan027@gmail.com" className="text-indigo-600 underline">
              jiangnan027@gmail.com
            </a>
            .
          </p>
        </section>

      </div>
    </div>
  );
}
