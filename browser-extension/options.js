const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  const input  = document.getElementById('appUrl');
  const btn    = document.getElementById('saveBtn');
  const status = document.getElementById('saveStatus');

  chrome.storage.sync.get(['appUrl'], result => {
    input.value = result.appUrl || DEFAULT_APP_URL;
  });

  btn.addEventListener('click', () => {
    let val = input.value.trim().replace(/\/$/, '');
    if (!val.startsWith('http')) val = 'https://' + val;

    chrome.storage.sync.set({ appUrl: val }, () => {
      status.style.display = 'inline';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
    });
  });
});
