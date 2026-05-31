'use strict';

// Service worker for TravelPanel Clipper (MV3 requirement).
// No active logic needed — the popup handles everything.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});
