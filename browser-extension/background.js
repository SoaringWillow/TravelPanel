function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ appUrl: '' }, ({ appUrl }) => resolve(appUrl));
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const appUrl = await getAppUrl();

  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const url = info.linkUrl ?? info.pageUrl ?? tab?.url ?? '';
  const title = tab?.title ?? '';

  if (!url) return;

  const shareUrl =
    `${appUrl}/share` +
    `?url=${encodeURIComponent(url)}` +
    `&title=${encodeURIComponent(title)}` +
    `&source=extension`;

  chrome.tabs.create({ url: shareUrl });
});
