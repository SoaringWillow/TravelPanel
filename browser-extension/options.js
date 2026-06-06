const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

function el(id) { return document.getElementById(id); }

// Load saved settings
chrome.storage.sync.get(['appUrl'], (result) => {
  el('appUrl').value = result.appUrl || DEFAULT_APP_URL;
});

// Save settings
el('saveBtn').addEventListener('click', () => {
  const appUrl = el('appUrl').value.trim().replace(/\/$/, '');

  if (!appUrl) {
    el('appUrl').value = DEFAULT_APP_URL;
    return;
  }

  chrome.storage.sync.set({ appUrl }, () => {
    const feedback = el('feedback');
    feedback.classList.add('visible');
    setTimeout(() => feedback.classList.remove('visible'), 2500);
  });
});

// Save on Enter key
el('appUrl').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') el('saveBtn').click();
});
