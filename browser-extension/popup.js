const PLATFORM_META = {
  instagram:     { label: 'Instagram',     bg: '#e1306c22', color: '#e1306c' },
  youtube:       { label: 'YouTube',       bg: '#ff000022', color: '#ff0000' },
  xiaohongshu:   { label: 'Xiaohongshu',  bg: '#ff2e4d22', color: '#ff2e4d' },
  tiktok:        { label: 'TikTok',        bg: '#69c9d022', color: '#69c9d0' },
  twitter:       { label: 'X / Twitter',   bg: '#1d9bf022', color: '#1d9bf0' },
  pinterest:     { label: 'Pinterest',     bg: '#e6000022', color: '#e60000' },
};

function detectPlatform(url) {
  if (/instagram\.com/i.test(url))                       return 'instagram';
  if (/youtube\.com|youtu\.be/i.test(url))               return 'youtube';
  if (/xiaohongshu\.com|xhslink\.com/i.test(url))        return 'xiaohongshu';
  if (/tiktok\.com/i.test(url))                          return 'tiktok';
  if (/twitter\.com|x\.com/i.test(url))                  return 'twitter';
  if (/pinterest\.com/i.test(url))                       return 'pinterest';
  return null;
}

function isClippable(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

async function getTravelPanelUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ travelPanelUrl: 'https://travelpanel.vercel.app' }, (r) => {
      resolve(r.travelPanelUrl.replace(/\/$/, ''));
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const mainContent   = document.getElementById('mainContent');
  const noUrlScreen   = document.getElementById('noUrlScreen');
  const successScreen = document.getElementById('successScreen');
  const errorMsg      = document.getElementById('errorMsg');
  const clipBtn       = document.getElementById('clipBtn');
  const settingsBtn   = document.getElementById('settingsBtn');
  const openAppBtn    = document.getElementById('openAppBtn');

  const travelPanelUrl = await getTravelPanelUrl();

  // Open settings
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Open app home
  openAppBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: travelPanelUrl });
  });

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url || '';
  const title = tab?.title || '';

  if (!isClippable(url)) {
    mainContent.style.display = 'none';
    noUrlScreen.classList.add('show');
    return;
  }

  // Populate page card
  document.getElementById('pageTitle').textContent = title || url;

  let domain = '';
  try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch {}
  document.getElementById('pageDomain').textContent = domain;

  // Favicon
  if (domain) {
    const favicon = document.getElementById('faviconImg');
    const placeholder = document.getElementById('faviconPlaceholder');
    favicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    favicon.onload = () => { favicon.style.display = ''; placeholder.style.display = 'none'; };
    favicon.onerror = () => { favicon.style.display = 'none'; placeholder.style.display = ''; };
  }

  // Platform badge
  const platform = detectPlatform(url);
  if (platform && PLATFORM_META[platform]) {
    const meta  = PLATFORM_META[platform];
    const badge = document.getElementById('platformBadge');
    badge.textContent = meta.label;
    badge.style.display = 'inline-flex';
    badge.style.background = meta.bg;
    badge.style.color = meta.color;
  }

  // Clip action — opens TravelPanel share page
  clipBtn.addEventListener('click', async () => {
    clipBtn.disabled = true;
    clipBtn.textContent = 'Opening TravelPanel…';
    errorMsg.classList.remove('show');

    try {
      const shareUrl = `${travelPanelUrl}/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
      await chrome.tabs.create({ url: shareUrl });

      // Show success
      mainContent.style.display = 'none';
      successScreen.classList.add('show');
      document.getElementById('successSubtitle').textContent =
        'TravelPanel is extracting locations and tips from this page…';

      setTimeout(() => window.close(), 2000);
    } catch (err) {
      clipBtn.disabled = false;
      clipBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        Clip to TravelPanel`;
      errorMsg.textContent = 'Could not open TravelPanel. Check your settings.';
      errorMsg.classList.add('show');
    }
  });
});
