'use strict';

// Service worker — kept minimal.
// The extension uses no background messaging currently;
// all logic lives in popup.js.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});
