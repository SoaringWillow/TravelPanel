'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 header-safe pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Privacy Policy</h1>
        </div>
      </div>

      <div className="px-5 py-6 pb-24 max-w-2xl mx-auto space-y-6 text-gray-700">
        <p className="text-xs text-gray-400">Last updated: June 2026</p>

        <Section title="What TravelPanel does">
          <p>
            TravelPanel helps you save travel inspiration from social media and plan trips
            from your saved clips. The app works primarily on your device, without requiring
            an account.
          </p>
        </Section>

        <Section title="Data stored on your device">
          <p>
            All your clips, boards, and trip plans are stored locally on your device using
            your browser&apos;s IndexedDB storage. TravelPanel does not operate servers that
            store your personal data. Your data stays on your device unless you explicitly
            export or share it.
          </p>
        </Section>

        <Section title="AI processing (Anthropic Claude)">
          <p>
            When you save a URL, TravelPanel sends the URL and page content to
            Anthropic&apos;s Claude API to extract location information, tips, and travel
            wisdom. If you use the iOS Share Extension with a screenshot, the image may
            also be sent. This processing happens under{' '}
            <a
              href="https://www.anthropic.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline"
            >
              Anthropic&apos;s Privacy Policy
            </a>
            . TravelPanel does not store the content sent to Anthropic beyond what is
            returned to your device.
          </p>
        </Section>

        <Section title="Analytics">
          <p>
            If analytics are configured, TravelPanel may send anonymized usage events
            (such as the number of clips saved or plans generated) to PostHog, a product
            analytics service. No personally identifiable information is included in these
            events. Analytics can be disabled by removing the PostHog key from the
            app configuration.
          </p>
        </Section>

        <Section title="No advertising">
          <p>
            TravelPanel does not use advertising SDKs, does not sell your data to
            third parties, and does not serve targeted advertisements.
          </p>
        </Section>

        <Section title="Data export and deletion">
          <p>
            You can export all your data at any time from Settings → Download backup.
            To delete all your data, clear the app&apos;s storage from your device settings
            or browser storage settings. Since data is stored locally, uninstalling the
            app removes all data.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For privacy questions or data concerns, contact:{' '}
            <a
              href="mailto:jiangnan027@gmail.com"
              className="text-indigo-600 underline"
            >
              jiangnan027@gmail.com
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-bold text-gray-900 text-base mb-2">{title}</h2>
      <div className="text-sm leading-relaxed text-gray-600">{children}</div>
    </div>
  );
}
