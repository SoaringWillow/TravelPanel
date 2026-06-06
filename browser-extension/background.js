'use strict';

// Minimal service worker — required for MV3.
// Future: handle context menu clipping from right-click.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') + '?welcome=1' });
  }
});
