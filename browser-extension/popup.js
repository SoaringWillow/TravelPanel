const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

const PLATFORM_MAP = [
  { pattern: /xiaohongshu|xhslink|redbook|rednote/i, label: '📕 Xiaohongshu', cls: 'xhs' },
  { pattern: /youtube\.com|youtu\.be/i,               label: '▶ YouTube',      cls: 'yt'  },
  { pattern: /instagram\.com/i,                        label: '📸 Instagram',   cls: 'ig'  },
  { pattern: /douyin\.com|tiktok\.com/i,               label: '🎵 TikTok',      cls: 'yt'  },
  { pattern: /bilibili\.com/i,                         label: '📺 Bilibili',    cls: 'yt'  },
];

function detectPlatform(url) {
  for (const p of PLATFORM_MAP) {
    if (p.pattern.test(url)) return p;
  }
  return { label: '🌐 Web', cls: 'other' };
}

async function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve(result.appUrl || DEFAULT_APP_URL);
    });
  });
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const title = tab.title || 'Untitled page';
  const url   = tab.url  || '';

  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageUrl').textContent   = url;

  const platform = detectPlatform(url);
  const badge = document.getElementById('platformBadge');
  badge.textContent  = platform.label;
  badge.className    = `platform-badge ${platform.cls}`;

  document.getElementById('clipBtn').addEventListener('click', () => clip(url, title));
  document.getElementById('settingsLink').addEventListener('click', e => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

async function clip(url, title) {
  const btn     = document.getElementById('clipBtn');
  const btnIcon = document.getElementById('btnIcon');
  const btnText = document.getElementById('btnText');
  const status  = document.getElementById('statusMsg');

  btn.disabled = true;
  btnIcon.outerHTML = '<div class="spinner" id="btnIcon"></div>';
  btnText.textContent = 'Extracting…';
  status.className = 'status';
  status.textContent = '';

  const appUrl = await getAppUrl();

  try {
    const res = await fetch(`${appUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();

    // Open the share page in a new tab so the app saves it to IndexedDB
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(data.title || title)}`;
    chrome.tabs.create({ url: shareUrl });

    // Show success + locations inline
    showSuccess(data, appUrl, url, title);
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    document.getElementById('btnIcon').outerHTML = '<span id="btnIcon">📌</span>';
    btnText.textContent = 'Clip to TravelPanel';
  }
}

function showSuccess(data, appUrl, rawUrl, rawTitle) {
  const btn     = document.getElementById('clipBtn');
  const btnIcon = document.getElementById('btnIcon');
  const btnText = document.getElementById('btnText');

  btn.disabled = false;
  // Replace spinner node (if still there) with checkmark
  const iconEl = document.getElementById('btnIcon');
  if (iconEl) iconEl.outerHTML = '<span id="btnIcon">✓</span>';
  btnText.textContent = 'Clipped!';

  const status = document.getElementById('statusMsg');
  status.className = 'status success';

  const locCount  = data.locations?.length  || 0;
  const subCount  = data.substance?.length  || 0;
  status.textContent = `Saved${locCount ? ` · ${locCount} location${locCount > 1 ? 's' : ''}` : ''}${subCount ? ` · ${subCount} insight${subCount > 1 ? 's' : ''}` : ''}`;

  if (locCount > 0) {
    const resultDiv = document.getElementById('resultLocations');
    const chips     = document.getElementById('locationChips');
    resultDiv.style.display = 'block';
    chips.innerHTML = data.locations
      .slice(0, 5)
      .map(l => `<span class="location-chip">📍 ${l.name}</span>`)
      .join('');
    if (locCount > 5) {
      chips.innerHTML += `<span class="location-chip">+${locCount - 5} more</span>`;
    }
  }

  const openLink = document.getElementById('openAppLink');
  openLink.href = appUrl;
  openLink.addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
  });
}

function showError(msg) {
  const status = document.getElementById('statusMsg');
  status.className = 'status error';
  status.textContent = `Error: ${msg}. Check Settings to confirm your TravelPanel URL.`;
}

init();
