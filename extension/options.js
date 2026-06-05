'use strict';

const urlInput = document.getElementById('urlInput');
const saveBtn  = document.getElementById('saveBtn');
const urlError = document.getElementById('urlError');
const toast    = document.getElementById('toast');

// Load saved URL on open
chrome.storage.sync.get({ travelPanelUrl: '' }, ({ travelPanelUrl }) => {
  urlInput.value = travelPanelUrl;
});

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeUrl(str) {
  // Strip trailing slash
  return str.trim().replace(/\/+$/, '');
}

saveBtn.addEventListener('click', () => {
  const raw = urlInput.value.trim();

  if (!isValidUrl(raw)) {
    urlInput.classList.add('error');
    urlError.style.display = 'block';
    toast.classList.remove('show');
    urlInput.focus();
    return;
  }

  urlInput.classList.remove('error');
  urlError.style.display = 'none';
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  chrome.storage.sync.set({ travelPanelUrl: normalizeUrl(raw) }, () => {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
    toast.classList.add('show');

    setTimeout(() => toast.classList.remove('show'), 4000);
  });
});

// Clear error on input
urlInput.addEventListener('input', () => {
  urlInput.classList.remove('error');
  urlError.style.display = 'none';
});

// Save on Enter
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
