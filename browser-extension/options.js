const urlInput = document.getElementById('tp-url');
const saveBtn = document.getElementById('btn-save');
const clearBtn = document.getElementById('btn-clear-boards');
const toast = document.getElementById('toast');

function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2800);
}

// Load saved URL on open
chrome.storage.sync.get('travelPanelUrl', (result) => {
  if (result.travelPanelUrl) {
    urlInput.value = result.travelPanelUrl;
  }
});

saveBtn.addEventListener('click', () => {
  let url = urlInput.value.trim();

  if (!url) {
    showToast('Please enter your TravelPanel URL.', 'error');
    return;
  }

  // Normalize: strip trailing slash
  url = url.replace(/\/$/, '');

  // Basic validation
  try {
    new URL(url);
  } catch {
    showToast('That doesn\'t look like a valid URL.', 'error');
    return;
  }

  chrome.storage.sync.set({ travelPanelUrl: url }, () => {
    urlInput.value = url;
    showToast('✅ Settings saved!');
  });
});

clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove('recentBoards', () => {
    showToast('Recent boards cleared.');
  });
});

// Save on Enter
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
