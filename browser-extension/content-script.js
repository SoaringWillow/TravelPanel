// Runs on all HTTPS pages but immediately exits unless we detect TravelPanel.
// TravelPanel adds <meta name="application-name" content="TravelPanel"> to its layout.
(async () => {
  const isApp = document.querySelector('meta[name="application-name"][content="TravelPanel"]');
  if (!isApp) return;

  try {
    const { pendingClips = [] } = await chrome.storage.local.get({ pendingClips: [] });
    if (pendingClips.length === 0) return;

    // Clear before posting to prevent duplicate imports on reload
    await chrome.storage.local.set({ pendingClips: [] });

    window.postMessage(
      { source: 'travelpanel-clipper', type: 'PENDING_CLIPS', clips: pendingClips },
      '*'
    );
  } catch {
    // Non-fatal
  }
})();
