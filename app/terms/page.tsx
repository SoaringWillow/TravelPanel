'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
          <h1 className="text-lg font-bold text-gray-900">Terms of Use</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-11">Last updated: June 2026</p>
      </div>

      <div className="px-5 py-6 pb-16 max-w-lg mx-auto space-y-6 text-sm text-gray-700 leading-relaxed">

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">1. Acceptance</h2>
          <p>
            By downloading or using TravelPanel, you agree to these Terms of Use. If you
            do not agree, please do not use the app.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">2. Your Content</h2>
          <p>
            You own the clips, notes, and boards you create in TravelPanel. We do not
            claim ownership of your content. You are responsible for ensuring that URLs
            you clip are from sources you have the right to access.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">3. Permitted Use</h2>
          <p>You may use TravelPanel for personal, non-commercial travel planning. You agree not to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Use the app to scrape or bulk-download content from third-party platforms</li>
            <li>Reverse-engineer or attempt to extract our AI prompts or algorithms</li>
            <li>Use the service in any way that violates applicable laws</li>
            <li>Attempt to circumvent usage limits or rate limits</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">4. AI-Generated Content</h2>
          <p>
            TravelPanel uses Claude AI to extract and summarize travel information. AI
            outputs may contain errors, outdated information, or inaccuracies. We do not
            warrant the accuracy of AI-generated trip plans, location data, or tips.
            Always verify critical travel information (visa requirements, safety conditions,
            opening hours) through official sources.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">5. Usage Limits</h2>
          <p>
            The free tier includes limited plan generations per day and enrichment requests
            per hour. These limits exist to ensure fair use and manage AI API costs.
            We reserve the right to adjust limits at any time.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">6. No Warranty</h2>
          <p>
            TravelPanel is provided &quot;as is&quot; without warranties of any kind. We do not
            guarantee uninterrupted service, data preservation, or that the app will be
            free of errors. Use the app&apos;s Export feature to maintain your own backups.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, TravelPanel and its creators
            shall not be liable for any indirect, incidental, special, or consequential
            damages arising from your use of the app, including but not limited to loss
            of data or trip planning decisions made in reliance on AI output.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">8. Age Requirement</h2>
          <p>
            You must be at least 13 years old to use TravelPanel. By using the app, you
            confirm you meet this age requirement. Users in the EU must be at least 16,
            or have parental consent.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">9. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of TravelPanel after
            changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">10. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which the developer
            is based, without regard to conflict of law principles.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 text-base mb-2">11. Contact</h2>
          <p>
            Questions about these Terms? Email{' '}
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
