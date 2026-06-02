chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel',
    title: 'Clip to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'clip-to-travelpanel') return;

  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || '';

  const { travelPanelUrl } = await chrome.storage.sync.get({ travelPanelUrl: 'https://travelpanel.vercel.app' });

  const shareUrl = `${travelPanelUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl });
});
