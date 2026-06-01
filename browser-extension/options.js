const input      = document.getElementById('app-url');
const saveBtn    = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');

// Load existing value
chrome.storage.sync.get('appBaseUrl', ({ appBaseUrl }) => {
  if (appBaseUrl) input.value = appBaseUrl;
});

// Save on button click
saveBtn.addEventListener('click', save);

// Save on Enter
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') save();
});

function save() {
  const raw = input.value.trim().replace(/\/$/, '');
  if (!raw) return;

  // Basic URL validation
  try {
    new URL(raw);
  } catch {
    input.style.borderColor = '#EF4444';
    input.focus();
    return;
  }

  input.style.borderColor = '';
  chrome.storage.sync.set({ appBaseUrl: raw }, () => {
    saveStatus.classList.add('visible');
    setTimeout(() => saveStatus.classList.remove('visible'), 2500);
  });
}
