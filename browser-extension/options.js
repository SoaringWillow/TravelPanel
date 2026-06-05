const DEFAULT_APP_URL = 'http://localhost:3000';

const input = document.getElementById('app-url-input');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const savedMsg = document.getElementById('saved-msg');

// Load current setting
chrome.storage.local.get('appUrl', ({ appUrl }) => {
  input.value = appUrl || DEFAULT_APP_URL;
});

function save(url) {
  const trimmed = url.trim().replace(/\/$/, ''); // strip trailing slash
  if (!trimmed) return;

  chrome.storage.local.set({ appUrl: trimmed }, () => {
    input.value = trimmed;
    savedMsg.classList.add('visible');
    setTimeout(() => savedMsg.classList.remove('visible'), 2000);
  });
}

saveBtn.addEventListener('click', () => save(input.value));

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') save(input.value);
});

resetBtn.addEventListener('click', () => {
  input.value = DEFAULT_APP_URL;
  save(DEFAULT_APP_URL);
});

// Preset buttons
document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const url = btn.dataset.url;
    input.value = url;
    save(url);
  });
});
