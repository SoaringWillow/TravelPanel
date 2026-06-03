'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

chrome.storage.sync.get(['appUrl'], (result) => {
  document.getElementById('appUrl').value = result.appUrl || DEFAULT_APP_URL;
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const raw = document.getElementById('appUrl').value.trim().replace(/\/$/, '');
  let url = raw;

  try {
    new URL(url); // validates format
  } catch {
    url = DEFAULT_APP_URL;
    document.getElementById('appUrl').value = url;
  }

  chrome.storage.sync.set({ appUrl: url }, () => {
    const msg = document.getElementById('savedMsg');
    msg.classList.add('visible');
    setTimeout(() => msg.classList.remove('visible'), 2000);
  });
});
