const input = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const saveMsg = document.getElementById('saveMsg');

chrome.storage.sync.get({ travelpanelUrl: 'http://localhost:3000' }, ({ travelpanelUrl }) => {
  input.value = travelpanelUrl;
});

saveBtn.addEventListener('click', () => {
  const url = input.value.trim().replace(/\/$/, '') || 'http://localhost:3000';
  chrome.storage.sync.set({ travelpanelUrl: url }, () => {
    saveMsg.style.display = 'inline';
    setTimeout(() => { saveMsg.style.display = 'none'; }, 2500);
  });
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});
