const input   = document.getElementById('app-url');
const saveBtn = document.getElementById('save-btn');
const toast   = document.getElementById('toast');

// Load saved value
chrome.storage.sync.get({ appUrl: '' }, ({ appUrl }) => {
  input.value = appUrl;
});

saveBtn.addEventListener('click', () => {
  const value = input.value.trim().replace(/\/$/, '');
  chrome.storage.sync.set({ appUrl: value }, () => {
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
  });
});

// Save on Enter
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
