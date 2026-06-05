// TravelPanel Clipper — background service worker
// Handles API extraction calls (no CORS restrictions in service worker context)

const EXTRACT_CACHE = new Map(); // url → { result, timestamp }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'extract') {
    handleExtract(message.url, message.travelPanelUrl)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true; // keep channel open for async response
  }
});

async function handleExtract(url, travelPanelUrl) {
  // Return cached result if fresh
  const cached = EXTRACT_CACHE.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ok: true, data: cached.result };
  }

  const apiUrl = `${travelPanelUrl.replace(/\/$/, '')}/api/import`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  EXTRACT_CACHE.set(url, { result: data, timestamp: Date.now() });
  return { ok: true, data };
}
