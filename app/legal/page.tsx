'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function LegalPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-header-safe pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-500 text-sm hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-lg font-bold text-gray-800">Privacy & Terms</h1>
        </div>
      </div>

      <div className="px-4 py-6 pb-12 max-w-2xl mx-auto space-y-8">

        {/* Privacy Policy */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Privacy Policy</h2>
          <p className="text-xs text-gray-400">Effective: June 2026</p>

          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <h3 className="font-semibold text-gray-800">What data is stored</h3>
            <p>
              TravelPanel stores all your clips, boards, and plans <strong>locally on your device</strong> using
              IndexedDB — a standard browser storage mechanism. Your data never leaves your device unless
              you explicitly use the cloud backup or sharing features.
            </p>

            <h3 className="font-semibold text-gray-800 pt-1">What is sent to external services</h3>
            <ul className="space-y-2 pl-4 list-disc text-gray-600">
              <li>
                <strong>Claude AI (Anthropic):</strong> When you clip a URL, the page URL and fetched
                page content are sent to Anthropic&apos;s Claude API to extract travel information
                (locations, tips, activities). No personal identifiers are included.
              </li>
              <li>
                <strong>Plan generation:</strong> When generating a trip plan, the location names
                and activity data from your saved clips — along with latitude/longitude of the primary
                destination — are sent to Claude for itinerary generation and to Open-Meteo for
                weather forecasts. Open-Meteo requires no account and collects no personal data.
              </li>
              <li>
                <strong>Analytics (PostHog):</strong> Anonymised usage events (e.g. clip saved,
                plan generated) are sent to PostHog for product improvement. No personal data or
                clip content is included.
              </li>
            </ul>

            <h3 className="font-semibold text-gray-800 pt-1">Location data</h3>
            <p>
              GPS location is only accessed on-device when you enable Trip Mode. Your coordinates
              are never sent to our servers. Latitude/longitude of a trip&apos;s <em>destination</em>
              (extracted from clip content) may be sent to Open-Meteo solely for weather forecasts.
            </p>

            <h3 className="font-semibold text-gray-800 pt-1">Clipboard</h3>
            <p>
              On iOS, the app may read your clipboard when brought to the foreground to detect
              travel links. Clipboard content is never transmitted off-device.
            </p>

            <h3 className="font-semibold text-gray-800 pt-1">Data deletion</h3>
            <p>
              You can delete all local data at any time from Settings → Download data, or by
              clearing your browser/app storage. We do not retain any data on our servers beyond
              what is required for in-flight API calls (which are not logged).
            </p>

            <h3 className="font-semibold text-gray-800 pt-1">Contact</h3>
            <p>
              Questions? Email <a href="mailto:jiangnan027@gmail.com" className="text-indigo-600 hover:underline">jiangnan027@gmail.com</a>
            </p>
          </div>
        </section>

        {/* Terms of Service */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Terms of Service</h2>
          <p className="text-xs text-gray-400">Effective: June 2026</p>

          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <h3 className="font-semibold text-gray-800">Use of the app</h3>
            <p>
              TravelPanel is provided for personal, non-commercial travel planning. You may use it to
              clip, organise, and plan travel content for yourself or people you travel with.
            </p>

            <h3 className="font-semibold text-gray-800 pt-1">Content you clip</h3>
            <p>
              You are responsible for ensuring you have the right to clip and analyse content
              from external URLs. TravelPanel extracts structured information for personal use only
              — do not use it to scrape content at scale or republish others&apos; work.
            </p>

            <h3 className="font-semibold text-gray-800 pt-1">AI-generated content</h3>
            <p>
              Trip plans and extracted information are generated by AI and may be inaccurate.
              Always verify critical travel details (opening hours, prices, safety conditions)
              from official sources before relying on them.
            </p>

            <h3 className="font-semibold text-gray-800 pt-1">No warranty</h3>
            <p>
              The app is provided &quot;as is&quot; without warranty of any kind. We are not liable for
              any loss arising from use of travel plans or information generated by the app.
            </p>

            <h3 className="font-semibold text-gray-800 pt-1">Changes</h3>
            <p>
              We may update these terms as the app evolves. Continued use constitutes acceptance.
            </p>
          </div>
        </section>

        <p className="text-center text-xs text-gray-400 pb-4">
          TravelPanel · Built with ❤️ for curious travellers
        </p>
      </div>
    </div>
  );
}
