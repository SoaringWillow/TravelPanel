import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Terms of Service — TravelPanel' };

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Terms of Service</h1>
        <p className="text-sm text-gray-400 mt-1">Last updated: June 2026</p>
      </header>

      <div className="px-5 py-6 space-y-6 max-w-prose pb-20 safe-bottom">

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Acceptance</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            By using TravelPanel you agree to these terms. If you do not agree, please stop using
            the app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Purpose of the app</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            TravelPanel is a personal travel planning tool. It is designed to help you save
            inspiration from social media and organise it into trip plans for your own use.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Acceptable use</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            You may not use TravelPanel to:
          </p>
          <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside mt-2 space-y-1">
            <li>Scrape or bulk-collect content in automated ways</li>
            <li>Infringe the intellectual property of content creators</li>
            <li>Process content that is illegal in your jurisdiction</li>
            <li>Attempt to reverse-engineer or exploit the AI extraction API</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Your content and IP</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            You own the clips, notes, and itineraries you create. We claim no rights over your
            personal travel data. The third-party content you clip (posts, articles, videos) remains
            the intellectual property of its original creators — TravelPanel's AI extraction is for
            personal organisational use only, not redistribution.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">AI accuracy disclaimer</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            AI-extracted locations, tips, and itineraries are generated automatically and may
            contain errors, outdated information, or inaccuracies. Always verify important details
            (addresses, opening hours, entry requirements) independently before travelling. We are
            not liable for decisions made based on AI-generated content.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Service availability</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            TravelPanel is provided "as is". We may modify, suspend, or discontinue the service at
            any time. We are not liable for data loss resulting from service changes — export your
            data regularly using Settings → Export all data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Limitation of liability</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            To the fullest extent permitted by law, TravelPanel and its creators are not liable for
            any indirect, incidental, or consequential damages arising from your use of the app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Changes to these terms</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We may update these terms. Continued use of the app after changes constitutes
            acceptance. Significant changes will be announced in the app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Contact</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Questions about these terms? Email{' '}
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
