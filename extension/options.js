document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['appUrl'], (result) => {
    if (result.appUrl) {
      document.getElementById('app-url').value = result.appUrl;
    }
  });

  document.getElementById('save-btn').addEventListener('click', () => {
    const raw = document.getElementById('app-url').value.trim();
    const url = raw.replace(/\/+$/, '');

    chrome.storage.sync.set({ appUrl: url }, () => {
      const msg = document.getElementById('saved-msg');
      msg.style.display = 'inline';
      setTimeout(() => { msg.style.display = 'none'; }, 2500);
    });
  });

  document.getElementById('app-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('save-btn').click();
  });
});
