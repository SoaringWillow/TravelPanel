const urlInput = document.getElementById('app-url');
const saveBtn = document.getElementById('save-btn');
const toast = document.getElementById('toast');

// Load saved settings
chrome.storage.sync.get(['travelPanelUrl'], ({ travelPanelUrl }) => {
  if (travelPanelUrl) urlInput.value = travelPanelUrl;
});

saveBtn.addEventListener('click', () => {
  let url = urlInput.value.trim().replace(/\/$/, '');
  if (!url) {
    urlInput.focus();
    return;
  }
  if (!url.startsWith('http')) url = 'https://' + url;

  chrome.storage.sync.set({ travelPanelUrl: url }, () => {
    urlInput.value = url;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
  });
});

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
