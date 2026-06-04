function getAppUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['appUrl'], (result) => {
      resolve(result.appUrl || '');
    });
  });
}

async function saveCurrentTab(tab) {
  const appUrl = await getAppUrl();
  if (!appUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }
  const url = tab.url || '';
  const title = tab.title || '';
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl, active: true });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }

  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save to TravelPanel',
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

  const url = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = info.linkUrl ? '' : (tab?.title || '');
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  chrome.tabs.create({ url: shareUrl, active: true });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-to-travelpanel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await saveCurrentTab(tab);
});
