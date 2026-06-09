const DEFAULT_TP_URL = 'http://localhost:3000';

// Platforms that TravelPanel's parse-url.ts recognises
const PLATFORMS = [
  {
    id: 'xiaohongshu',
    label: '小红书',
    emoji: '📕',
    badgeClass: 'badge-xhs',
    patterns: ['xiaohongshu.com', 'xhslink.com', 'xhs.link'],
  },
  {
    id: 'douyin',
    label: 'Douyin / TikTok',
    emoji: '🎵',
    badgeClass: 'badge-tiktok',
    patterns: ['douyin.com', 'iesdouyin.com', 'tiktok.com'],
  },
  {
    id: 'bilibili',
    label: 'Bilibili',
    emoji: '📺',
    badgeClass: 'badge-tiktok',
    patterns: ['bilibili.com', 'b23.tv'],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    emoji: '▶️',
    badgeClass: 'badge-yt',
    patterns: ['youtube.com', 'youtu.be'],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    emoji: '📸',
    badgeClass: 'badge-ig',
    patterns: ['instagram.com'],
  },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.patterns.some((pat) => url.includes(pat))) return p;
  }
  return { id: 'other', label: 'Web page', emoji: '🌐', badgeClass: 'badge-web' };
}

/** Open TravelPanel with the ?import= deep link. */
function clipUrl(tpBase, url) {
  const target = `${tpBase.replace(/\/$/, '')}/?import=${encodeURIComponent(url)}`;
  chrome.tabs.create({ url: target });
}

async function init() {
  // ── Load stored TravelPanel base URL ─────────────────────────────────────
  const stored = await chrome.storage.sync.get({ travelPanelUrl: DEFAULT_TP_URL });
  let tpUrl = stored.travelPanelUrl;

  // Populate settings input
  const urlInput = document.getElementById('urlInput');
  urlInput.value = tpUrl;

  // ── Get active tab ────────────────────────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const isClippable =
    tab &&
    tab.url &&
    !tab.url.startsWith('chrome://') &&
    !tab.url.startsWith('chrome-extension://') &&
    !tab.url.startsWith('about:') &&
    !tab.url.startsWith('edge://') &&
    !tab.url.startsWith('moz-extension://');

  if (!isClippable) {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('noUrl').style.display = 'block';
  } else {
    const { url, title } = tab;
    const platform = detectPlatform(url);

    // Platform badge
    const badge = document.getElementById('platformBadge');
    badge.innerHTML = `<span class="platform-badge ${platform.badgeClass}">${platform.emoji} ${platform.label}</span>`;

    // Title + URL
    document.getElementById('pageTitle').textContent = title || url;
    document.getElementById('pageUrl').textContent = url;

    // ── Clip button ─────────────────────────────────────────────────────────
    const clipBtn  = document.getElementById('clipBtn');
    const clipIcon = document.getElementById('clipIcon');
    const clipText = document.getElementById('clipText');

    clipBtn.addEventListener('click', async () => {
      clipBtn.disabled = true;
      clipIcon.textContent = '⏳';
      clipText.textContent = 'Opening TravelPanel…';

      clipUrl(tpUrl, url);

      clipIcon.textContent = '✅';
      clipText.textContent = 'Opened!';
      clipBtn.classList.add('success');
      setTimeout(() => window.close(), 900);
    });
  }

  // ── Settings panel ────────────────────────────────────────────────────────
  const settingsPanel  = document.getElementById('settingsPanel');
  const settingsToggle = document.getElementById('settingsToggle');
  const saveBtn        = document.getElementById('saveBtn');

  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
  });

  saveBtn.addEventListener('click', async () => {
    const newUrl = urlInput.value.trim().replace(/\/$/, '');
    if (!newUrl) return;
    tpUrl = newUrl;
    await chrome.storage.sync.set({ travelPanelUrl: newUrl });
    saveBtn.textContent = 'Saved ✓';
    setTimeout(() => {
      saveBtn.textContent = 'Save';
      settingsPanel.classList.remove('open');
    }, 900);
  });

  // Allow Enter to save settings
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
}

init();
