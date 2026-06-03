// ─── Platform detection (mirrors lib/parse-url.ts) ───────────────────────────

const PLATFORM_CONFIG = {
  instagram:    { label: 'Instagram',       color: '#e1306c',  matchers: ['instagram.com'] },
  youtube:      { label: 'YouTube',         color: '#ff0000',  matchers: ['youtube.com', 'youtu.be'] },
  xiaohongshu:  { label: '小红书',           color: '#fe2c55',  matchers: ['xiaohongshu.com', 'xhslink.com'] },
  douyin:       { label: 'Douyin / TikTok', color: '#010101',  matchers: ['douyin.com', 'tiktok.com'] },
  bilibili:     { label: 'Bilibili',        color: '#00a1d6',  matchers: ['bilibili.com'] },
  twitter:      { label: 'Twitter / X',     color: '#1da1f2',  matchers: ['twitter.com', 'x.com'] },
  pinterest:    { label: 'Pinterest',       color: '#bd081c',  matchers: ['pinterest.com', 'pin.it'] },
  wechat:       { label: 'WeChat',          color: '#07c160',  matchers: ['weixin.qq.com', 'mp.weixin.qq.com'] },
};

function detectPlatform(url) {
  if (!url) return null;
  for (const [platform, cfg] of Object.entries(PLATFORM_CONFIG)) {
    if (cfg.matchers.some((m) => url.includes(m))) return { platform, ...cfg };
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showView(id) {
  for (const el of document.querySelectorAll('.view')) el.classList.add('hidden');
  $(id).classList.remove('hidden');
}

function setAlert(id, msg, visible = true) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('hidden', !visible);
}

function clearAlert(id) { setAlert(id, '', false); }

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function trimUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname.slice(0, 40) : '');
  } catch {
    return url.slice(0, 50);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Load stored app URL
  const { appUrl } = await chrome.storage.sync.get('appUrl');

  if (!appUrl) {
    initSetupView();
    showView('setup-view');
    return;
  }

  await initMainView(appUrl);
});

// ─── Setup View ───────────────────────────────────────────────────────────────

function initSetupView() {
  const input = $('setup-url-input');
  const btn   = $('setup-save-btn');

  btn.addEventListener('click', async () => {
    clearAlert('setup-error');
    const val = input.value.trim().replace(/\/$/, '');

    if (!isValidUrl(val)) {
      setAlert('setup-error', 'Please enter a valid URL starting with https://');
      return;
    }

    await chrome.storage.sync.set({ appUrl: val });
    await initMainView(val);
    showView('main-view');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });
}

// ─── Main View ────────────────────────────────────────────────────────────────

async function initMainView(appUrl) {
  showView('main-view');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const url   = tab?.url   ?? '';
  const title = tab?.title ?? '';

  // Favicon
  const faviconEl = $('page-favicon');
  if (tab?.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
    faviconEl.style.display = 'block';
  } else {
    faviconEl.style.display = 'none';
  }

  // Title + URL
  $('page-title').textContent = title || 'Untitled page';
  $('page-url').textContent   = trimUrl(url);

  // Platform badge
  const platInfo = detectPlatform(url);
  if (platInfo) {
    const badge = $('platform-badge');
    badge.textContent           = platInfo.label;
    badge.style.backgroundColor = platInfo.color;
    $('platform-badge-wrap').classList.remove('hidden');
  }

  // Enable clip button only for valid URLs
  const clipBtn = $('clip-btn');
  const canClip = isValidUrl(url) && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');
  clipBtn.disabled = !canClip;

  if (!canClip) {
    setAlert('error-msg', 'This page cannot be clipped (internal browser page).');
  }

  clipBtn.addEventListener('click', () => {
    const shareUrl = `${appUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    chrome.tabs.create({ url: shareUrl });

    $('success-desc').textContent = `"${title.slice(0, 50)}${title.length > 50 ? '…' : ''}" — complete the clip in TravelPanel.`;
    showView('success-view');
  });

  // Settings button
  $('settings-btn').addEventListener('click', () => {
    initSettingsView(appUrl);
    showView('settings-view');
  });

  // Close (success view)
  $('close-btn').addEventListener('click', () => window.close());
}

// ─── Settings View ────────────────────────────────────────────────────────────

function initSettingsView(currentAppUrl) {
  const input   = $('settings-url-input');
  const saveBtn = $('settings-save-btn');
  const backBtn = $('back-btn');

  input.value = currentAppUrl || '';
  clearAlert('settings-success');
  clearAlert('settings-error');

  backBtn.addEventListener('click', () => {
    showView('main-view');
  });

  saveBtn.addEventListener('click', async () => {
    clearAlert('settings-success');
    clearAlert('settings-error');

    const val = input.value.trim().replace(/\/$/, '');
    if (!isValidUrl(val)) {
      setAlert('settings-error', 'Please enter a valid URL starting with https://');
      return;
    }

    await chrome.storage.sync.set({ appUrl: val });
    setAlert('settings-success', '✓ Settings saved!');
    setTimeout(() => clearAlert('settings-success'), 2000);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
}
