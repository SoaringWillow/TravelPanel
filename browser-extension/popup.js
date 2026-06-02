const PLATFORM_LABELS = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  xiaohongshu: 'Xiaohongshu',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
  other: 'Web',
};

const PLATFORM_COLORS = {
  instagram: '#E1306C',
  youtube: '#FF0000',
  xiaohongshu: '#FF2442',
  tiktok: '#000000',
  twitter: '#1DA1F2',
  other: '#6366f1',
};

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  return 'other';
}

function isSaveable(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

let currentTab = null;
let appUrl = '';

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const url = tab.url || '';
  const title = tab.title || 'Untitled page';
  const platform = detectPlatform(url);
  const saveable = isSaveable(url);

  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageUrl').textContent = url;

  const chip = document.getElementById('platformChip');
  chip.textContent = PLATFORM_LABELS[platform];
  chip.style.backgroundColor = saveable ? PLATFORM_COLORS[platform] : '#9ca3af';

  const { appUrl: stored } = await chrome.storage.sync.get('appUrl');
  appUrl = (stored || '').trim().replace(/\/$/, '');

  const saveBtn = document.getElementById('saveBtn');

  if (!appUrl) {
    document.getElementById('warningBanner').classList.add('visible');
    saveBtn.disabled = true;
  } else if (!saveable) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Cannot save this page';
  }

  saveBtn.addEventListener('click', handleSave);

  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('configureLink').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('openAppBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: appUrl, active: true });
    window.close();
  });
}

async function handleSave() {
  if (!currentTab || !appUrl) return;

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Saving…';

  const url = currentTab.url || '';
  const title = currentTab.title || '';
  const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  await chrome.tabs.create({ url: shareUrl, active: false });

  document.getElementById('mainView').style.display = 'none';
  document.getElementById('successView').classList.add('visible');

  setTimeout(() => window.close(), 2500);
}

init().catch(console.error);
