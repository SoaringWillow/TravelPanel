document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('travelPanelUrl');
  const saveBtn  = document.getElementById('saveBtn');
  const toast    = document.getElementById('toast');

  // Load saved settings
  chrome.storage.sync.get({ travelPanelUrl: 'https://travelpanel.vercel.app' }, (r) => {
    urlInput.value = r.travelPanelUrl;
  });

  saveBtn.addEventListener('click', () => {
    const travelPanelUrl = urlInput.value.trim().replace(/\/$/, '');
    if (!travelPanelUrl) return;

    chrome.storage.sync.set({ travelPanelUrl }, () => {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    });
  });
});
