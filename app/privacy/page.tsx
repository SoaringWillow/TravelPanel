import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — TravelPanel',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-indigo-600 text-sm font-medium hover:underline mb-8"
        >
          <ArrowLeft size={14} />
          Back to Settings
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Effective date: June 10, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">What TravelPanel is</h2>
            <p>
              TravelPanel is a travel inspiration clipper and AI trip planner. You share links from
              social media (Instagram, YouTube, Xiaohongshu, and others) and we extract locations,
              tips, and wisdom from the content to help you plan better trips.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Data stored on your device</h2>
            <p>
              By default, all of your data — saved clips, boards, and trip plans — is stored locally
              on your device in IndexedDB. We do not receive or store this data on our servers unless
              you enable cloud sync (see below).
            </p>
            <p className="mt-2">
              Onboarding preferences and session flags (e.g. whether you've seen the intro) are
              stored in localStorage and sessionStorage on your device only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Cloud sync (optional)</h2>
            <p>
              If you choose to enable cloud sync, your clips, boards, and trip plans are synced to
              Supabase — a hosted PostgreSQL service. This allows your data to be available across
              multiple devices. Your data is stored per-account and protected by Row Level Security
              (RLS) so only you can access it.
            </p>
            <p className="mt-2">
              We never share your cloud data with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">AI content extraction</h2>
            <p>
              When you save a clip, the URL and publicly accessible page content are sent to the
              Anthropic API (Claude) to extract locations, activities, and wisdom from the post.
              Anthropic does not use submitted API data to train its models. See{' '}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Anthropic's Privacy Policy
              </a>.
            </p>
            <p className="mt-2">
              For platforms that block automated access (Xiaohongshu, WeChat), if you optionally
              attach a screenshot, that image is also sent to Anthropic for extraction and is not
              stored anywhere beyond the duration of the API call.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Location data</h2>
            <p>
              If you enable Navigate mode, your GPS coordinates are used on-device to find saved
              clips within 1 km. Your location is never sent to our servers or any third party.
              Location access requires your explicit permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Analytics</h2>
            <p>
              We use PostHog for anonymous usage analytics. Events include actions like "clip saved"
              and "plan generated" — they contain no personal identifiers. No cross-app tracking is
              performed. PostHog analytics are only active when a valid key is configured.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Notifications and email</h2>
            <p>
              We use Resend to send transactional emails (e.g. magic-link sign-in). We do not send
              marketing emails. Your email address is only stored if you create an account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">No ads, no data selling</h2>
            <p>
              We do not serve advertisements. We do not sell, rent, or trade your data to any third
              party. Ever.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Data deletion</h2>
            <p>
              You can delete all locally stored data at any time from Settings → Clear all data.
              If you have a cloud sync account, contact us at{' '}
              <a href="mailto:jiangnan027@gmail.com" className="text-indigo-600 hover:underline">
                jiangnan027@gmail.com
              </a>{' '}
              to request complete account deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Children</h2>
            <p>
              TravelPanel is not directed at children under 13. We do not knowingly collect
              information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be noted with a
              new effective date. Continued use of the app after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact</h2>
            <p>
              Questions about privacy? Email us at{' '}
              <a href="mailto:jiangnan027@gmail.com" className="text-indigo-600 hover:underline">
                jiangnan027@gmail.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex gap-6 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-indigo-600 transition-colors font-medium text-gray-700">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link>
          <Link href="/settings" className="hover:text-indigo-600 transition-colors">Settings</Link>
        </div>
      </div>
    </div>
  );
}
