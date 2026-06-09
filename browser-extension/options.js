'use strict';

function init() {
  chrome.storage.sync.get(['appUrl'], ({ appUrl }) => {
    if (appUrl) {
      document.getElementById('appUrl').value = appUrl;
    }
  });

  document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const rawUrl = document.getElementById('appUrl').value.trim();
    const appUrl = rawUrl.replace(/\/$/, '');

    chrome.storage.sync.set({ appUrl }, () => {
      const toast = document.getElementById('toast');
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; }, 2000);
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
