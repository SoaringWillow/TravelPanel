// Service worker — context menu + messaging

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-travelpanel',
    title: 'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;

  const url = info.linkUrl ?? info.pageUrl ?? tab?.url ?? '';
  const title = tab?.title ?? '';

  await openSharePage(url, title);
});

async function openSharePage(url, title) {
  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const shareUrl = `${appUrl.replace(/\/$/, '')}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  // Focus existing TravelPanel tab if open, otherwise open new one
  const tabs = await chrome.tabs.query({ url: `${appUrl.replace(/\/$/, '')}/*` });
  if (tabs.length > 0 && tabs[0].id != null) {
    await chrome.tabs.update(tabs[0].id, { url: shareUrl, active: true });
    const win = tabs[0].windowId;
    if (win != null) await chrome.windows.update(win, { focused: true });
  } else {
    await chrome.tabs.create({ url: shareUrl });
  }
}
