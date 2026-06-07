const input = document.getElementById('appUrl');
const saveBtn = document.getElementById('saveBtn');
const toast = document.getElementById('toast');
const safariBtn = document.getElementById('safariBtn');

chrome.storage.sync.get({ appUrl: '' }, data => {
  if (data.appUrl) input.value = data.appUrl;
});

function save() {
  let url = input.value.trim().replace(/\/$/, '');
  if (!url) return;
  if (!url.startsWith('http')) url = 'https://' + url;

  chrome.storage.sync.set({ appUrl: url }, () => {
    input.value = url;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  });
}

saveBtn.addEventListener('click', save);
input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });

safariBtn.addEventListener('click', () => {
  chrome.tabs.create({
    url: 'https://developer.apple.com/documentation/safariservices/safari-web-extensions/converting-a-web-extension-for-safari'
  });
});
