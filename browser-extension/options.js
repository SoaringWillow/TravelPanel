const DEFAULT_APP_URL = 'http://localhost:3000';

const appUrlInput      = document.getElementById('appUrl');
const openAfterClip    = document.getElementById('openAfterClip');
const closeAfterClip   = document.getElementById('closeAfterClip');
const saveBtn          = document.getElementById('saveBtn');
const saveStatus       = document.getElementById('saveStatus');

// Load saved settings
chrome.storage.sync.get(
  { appUrl: DEFAULT_APP_URL, openAfterClip: false, closeAfterClip: true },
  ({ appUrl, openAfterClip: oac, closeAfterClip: cac }) => {
    appUrlInput.value    = appUrl;
    openAfterClip.checked  = oac;
    closeAfterClip.checked = cac;
  }
);

// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    appUrlInput.value = btn.dataset.url;
  });
});

// Save
saveBtn.addEventListener('click', () => {
  const appUrl = appUrlInput.value.trim().replace(/\/$/, '') || DEFAULT_APP_URL;

  chrome.storage.sync.set(
    {
      appUrl,
      openAfterClip:  openAfterClip.checked,
      closeAfterClip: closeAfterClip.checked,
    },
    () => {
      saveStatus.classList.add('show');
      setTimeout(() => saveStatus.classList.remove('show'), 2000);
    }
  );
});
