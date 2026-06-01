// Extracts OG metadata from the current page for the popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'GET_PAGE_META') return;

  const getMeta = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const val = el?.getAttribute('content') || el?.textContent;
      if (val?.trim()) return val.trim();
    }
    return '';
  };

  sendResponse({
    title: getMeta([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'title',
    ]) || document.title,
    description: getMeta([
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]',
    ]),
    image: getMeta([
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[property="og:image:secure_url"]',
    ]),
    url: window.location.href,
    siteName: getMeta(['meta[property="og:site_name"]']),
  });

  return true; // keep channel open for async response
});
