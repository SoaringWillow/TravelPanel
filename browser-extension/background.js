// Background service worker — context menu + cross-tab coordination

const DEFAULT_TP_URL = 'https://travelpanel.vercel.app';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel ✈',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel ✈',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url   = info.linkUrl || tab?.url || '';
  const title = tab?.title || '';

  const { travelPanelUrl = '' } = await chrome.storage.sync.get('travelPanelUrl');
  const base = travelPanelUrl.trim() || DEFAULT_TP_URL;
  openShareWindow(base, url, title);
});

async function openShareWindow(base, url, title) {
  const shareUrl = `${base}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  try {
    await chrome.windows.create({ url: shareUrl, type: 'popup', width: 440, height: 640, focused: true });
  } catch {
    await chrome.tabs.create({ url: shareUrl });
  }
}
