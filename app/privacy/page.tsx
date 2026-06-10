export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-gray-700">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: June 10, 2026</p>

      <section className="space-y-8">
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">What TravelPanel is</h2>
          <p className="text-sm leading-relaxed">
            TravelPanel is a travel planning app that lets you save travel inspiration from social media
            and generate AI-powered trip itineraries. It runs as a web app and native iOS app (via Capacitor).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Data we process</h2>
          <ul className="text-sm leading-relaxed space-y-2">
            <li>
              <strong>URLs you share to the app</strong> — When you share a URL via the iOS Share Sheet or
              paste it into the app, the URL is sent to Anthropic&apos;s Claude API to extract travel
              information (locations, tips, descriptions). No personally identifiable information is
              attached to these requests.
            </li>
            <li>
              <strong>Location data (GPS)</strong> — The app requests GPS access only when you tap
              &ldquo;Start Trip&rdquo; to enter navigation mode. Location data is used solely to show your
              position on the map and calculate walking distance to the next stop. It is never stored,
              transmitted, or shared.
            </li>
            <li>
              <strong>Your saved clips and boards</strong> — All saved clips, boards, and trip plans are
              stored locally on your device using IndexedDB. This data never leaves your device unless you
              explicitly use the &ldquo;Download all data&rdquo; export feature.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Data we do NOT collect</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>We do not require account registration or collect your name or email</li>
            <li>We do not track you across other websites or apps</li>
            <li>We do not sell or share your data with advertising networks</li>
            <li>We do not store your clips or plans on our servers</li>
            <li>We do not access your contacts, photos, or any other apps&apos; data</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Third-party services</h2>
          <ul className="text-sm leading-relaxed space-y-2">
            <li>
              <strong>Anthropic Claude API</strong> — URL content is sent to Anthropic to extract travel
              information. Anthropic&apos;s API is subject to{' '}
              <a href="https://www.anthropic.com/privacy" className="text-indigo-600 hover:underline">
                Anthropic&apos;s Privacy Policy
              </a>.
            </li>
            <li>
              <strong>OpenFreeMap</strong> — Map tiles are served by OpenFreeMap. No personal data is
              sent beyond standard HTTP request metadata (IP address). See{' '}
              <a href="https://openfreemap.org" className="text-indigo-600 hover:underline">
                openfreemap.org
              </a>.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Data retention</h2>
          <p className="text-sm leading-relaxed">
            All data is stored locally on your device and persists until you delete the app or clear
            app data. You can delete individual clips and boards within the app, or download and then
            delete all data from Settings.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Children&apos;s privacy</h2>
          <p className="text-sm leading-relaxed">
            TravelPanel is rated 4+ and does not knowingly collect data from children.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Changes to this policy</h2>
          <p className="text-sm leading-relaxed">
            We may update this policy as the app evolves. The &ldquo;Last updated&rdquo; date at the top
            will reflect changes. Continued use of the app constitutes acceptance of the updated policy.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Contact</h2>
          <p className="text-sm leading-relaxed">
            Questions about this policy?{' '}
            <a href="mailto:support@travelpanel.app" className="text-indigo-600 hover:underline">
              support@travelpanel.app
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
