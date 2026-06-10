// popup.js — TravelPanel Clipper popup logic

const PLATFORMS = [
  { domains: ['instagram.com'], label: 'Instagram', emoji: '📸', color: '#E1306C' },
  { domains: ['youtube.com', 'youtu.be'], label: 'YouTube', emoji: '▶️', color: '#FF0000' },
  { domains: ['xiaohongshu.com', 'xhs.link', 'xhslink.com'], label: 'Xiaohongshu', emoji: '📕', color: '#FF2442' },
  { domains: ['tiktok.com', 'vm.tiktok.com'], label: 'TikTok', emoji: '🎵', color: '#010101' },
  { domains: ['pinterest.com', 'pin.it'], label: 'Pinterest', emoji: '📌', color: '#E60023' },
  { domains: ['tripadvisor.com'], label: 'TripAdvisor', emoji: '🦉', color: '#00AF87' },
  { domains: ['maps.google.com', 'goo.gl'], label: 'Google Maps', emoji: '🗺️', color: '#4285F4' },
  { domains: ['maps.apple.com'], label: 'Apple Maps', emoji: '🗺️', color: '#1C1C1E' },
  { domains: ['airbnb.com'], label: 'Airbnb', emoji: '🏠', color: '#FF5A5F' },
  { domains: ['booking.com'], label: 'Booking.com', emoji: '🛏️', color: '#003580' },
  { domains: ['douyin.com', 'iesdouyin.com'], label: 'Douyin', emoji: '🎵', color: '#010101' },
  { domains: ['bilibili.com', 'b23.tv'], label: 'Bilibili', emoji: '📺', color: '#00A1D6' },
  { domains: ['wechat.com', 'weixin.qq.com'], label: 'WeChat', emoji: '💬', color: '#07C160' },
];

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return PLATFORMS.find(p =>
      p.domains.some(d => hostname === d || hostname.endsWith('.' + d))
    ) || null;
  } catch {
    return null;
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getAppUrl() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['appUrl'], result => {
      resolve((result.appUrl || '').trim().replace(/\/$/, ''));
    });
  });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
  window.close();
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const { url = '', title = 'Untitled', favIconUrl } = tab;

  // ── Favicon ──────────────────────────────────────────────────────────────
  if (favIconUrl) {
    const wrap = document.getElementById('faviconWrap');
    wrap.innerHTML = `<img src="${favIconUrl}" alt="" onerror="this.parentNode.innerHTML='<span class=\\'favicon-emoji\\'>🌐</span>'">`;
  }

  // ── Page title & domain ───────────────────────────────────────────────────
  document.getElementById('pageTitle').textContent = title || 'Untitled';
  document.getElementById('pageDomain').textContent = getDomain(url);

  // ── Platform chip ─────────────────────────────────────────────────────────
  const platform = detectPlatform(url);
  if (platform) {
    const wrap = document.getElementById('platformWrap');
    const chip = document.getElementById('platformChip');
    chip.textContent = `${platform.emoji} ${platform.label}`;
    chip.style.color = platform.color;
    chip.style.borderColor = platform.color + '50';
    chip.style.background = platform.color + '12';
    wrap.style.display = 'block';
  }

  // ── App URL check ─────────────────────────────────────────────────────────
  const appUrl = await getAppUrl();

  if (!appUrl) {
    document.getElementById('configBanner').style.display = 'flex';
    document.getElementById('saveBtn').disabled = true;
  } else {
    document.getElementById('saveBtn').disabled = false;
  }

  // ── Save handler ──────────────────────────────────────────────────────────
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const currentAppUrl = await getAppUrl();
    if (!currentAppUrl) {
      openOptions();
      return;
    }

    const shareUrl =
      `${currentAppUrl}/share` +
      `?url=${encodeURIComponent(url)}` +
      `&title=${encodeURIComponent(title)}`;

    // Open TravelPanel in a new tab
    chrome.tabs.create({ url: shareUrl });

    // Show success animation, then auto-close
    document.getElementById('actionsSection').style.display = 'none';
    document.getElementById('platformWrap').style.display = 'none';
    document.getElementById('configBanner').style.display = 'none';
    const successEl = document.getElementById('successSection');
    successEl.style.display = 'flex';

    setTimeout(() => window.close(), 1600);
  });

  // ── Settings / config buttons ─────────────────────────────────────────────
  document.getElementById('settingsBtn').addEventListener('click', openOptions);
  document.getElementById('footerConfigLink').addEventListener('click', openOptions);
  const configSetup = document.getElementById('configSetupBtn');
  if (configSetup) configSetup.addEventListener('click', openOptions);
}

init();
