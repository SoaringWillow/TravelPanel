const input = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');

// Load saved URL
chrome.storage.sync.get({ appUrl: '' }, (data) => {
  input.value = data.appUrl || '';
});

saveBtn.addEventListener('click', () => {
  const raw = input.value.trim();
  const appUrl = raw.replace(/\/$/, '');

  if (appUrl && !/^https?:\/\/.+/.test(appUrl)) {
    saveStatus.textContent = 'Enter a valid URL starting with http:// or https://';
    saveStatus.style.color = '#EF4444';
    return;
  }

  chrome.storage.sync.set({ appUrl }, () => {
    saveStatus.style.color = '#10B981';
    saveStatus.textContent = 'Saved!';
    setTimeout(() => {
      saveStatus.textContent = '';
    }, 2500);
  });
});

// Save on Enter
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
