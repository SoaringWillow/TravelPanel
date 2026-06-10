// Extracts rich page metadata (OG tags, canonical URL) for the popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'GET_PAGE_METADATA') return;

  function getMeta(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const val = el?.getAttribute('content') || el?.href;
      if (val) return val;
    }
    return null;
  }

  sendResponse({
    url: getMeta(['link[rel="canonical"]']) || location.href,
    title:
      getMeta(['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
      document.title ||
      '',
    description:
      getMeta([
        'meta[property="og:description"]',
        'meta[name="description"]',
        'meta[name="twitter:description"]',
      ]) || '',
    thumbnail:
      getMeta(['meta[property="og:image"]', 'meta[name="twitter:image"]']) || '',
  });

  return true;
});
