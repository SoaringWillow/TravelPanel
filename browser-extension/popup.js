async function getTravelPanelUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['travelPanelUrl'], (result) => {
      resolve((result.travelPanelUrl || '').replace(/\/$/, ''));
    });
  });
}

function showState(state) {
  ['setupState', 'readyState', 'loadingState', 'successState'].forEach((id) => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(state).style.display = 'block';
}

function truncateUrl(url, maxLen = 55) {
  if (url.length <= maxLen) return url;
  try {
    const u = new URL(url);
    const path = u.pathname.length > 1 ? u.pathname.slice(0, 22) + '…' : '';
    return u.hostname + path;
  } catch {
    return url.slice(0, maxLen) + '…';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const tpUrl = await getTravelPanelUrl();

  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  if (!tpUrl) {
    showState('setupState');
    document.getElementById('goSetupBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageTitle = tab.title || 'Untitled page';
  const pageUrl = tab.url || '';

  const nonClippable =
    !pageUrl ||
    pageUrl.startsWith('chrome://') ||
    pageUrl.startsWith('chrome-extension://') ||
    pageUrl.startsWith('about:') ||
    pageUrl.startsWith('edge://') ||
    pageUrl.startsWith('moz-extension://');

  if (nonClippable) {
    document.getElementById('pageTitle').textContent = 'Cannot clip this page';
    document.getElementById('pageUrl').textContent = 'Navigate to a travel page to clip';
    document.getElementById('clipBtn').disabled = true;
    showState('readyState');
    return;
  }

  document.getElementById('pageTitle').textContent = pageTitle;
  document.getElementById('pageUrl').textContent = truncateUrl(pageUrl);
  showState('readyState');

  document.getElementById('clipBtn').addEventListener('click', () => {
    document.getElementById('loadingTitle').textContent = pageTitle;
    document.getElementById('loadingUrl').textContent = truncateUrl(pageUrl);
    showState('loadingState');

    const shareUrl =
      `${tpUrl}/share?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`;

    chrome.tabs.create({ url: shareUrl }, () => {
      document.getElementById('successSub').textContent =
        'TravelPanel is extracting locations and wisdom from this page.';
      showState('successState');
      setTimeout(() => window.close(), 2000);
    });
  });

  document.getElementById('clipAnotherBtn').addEventListener('click', () => {
    showState('readyState');
  });
});
