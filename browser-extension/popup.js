const DEFAULT_TRAVELPANEL_URL = 'https://travel-panel.vercel.app';

const PLATFORM_PATTERNS = [
  { key: 'instagram', pattern: /instagram\.com/, label: '📸 Instagram', cls: 'instagram' },
  { key: 'youtube',   pattern: /youtube\.com|youtu\.be/, label: '▶ YouTube', cls: 'youtube' },
  { key: 'xiaohongshu', pattern: /xiaohongshu\.com|xhslink\.com|xhs\.link/, label: '🌸 小红书', cls: 'xiaohongshu' },
  { key: 'tiktok',    pattern: /tiktok\.com|douyin\.com/, label: '🎵 TikTok', cls: 'tiktok' },
  { key: 'bilibili',  pattern: /bilibili\.com/, label: '📺 Bilibili', cls: '' },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) return p;
  }
  return null;
}

function showStatus(type, msg) {
  const el = document.getElementById('status-msg');
  el.className = `status visible ${type}`;
  el.innerHTML = type === 'success'
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ${msg}`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${msg}`;
}

async function init() {
  const { travelPanelUrl = DEFAULT_TRAVELPANEL_URL } = await chrome.storage.sync.get('travelPanelUrl');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const title = tab?.title || '';

  // Show URL
  document.getElementById('url-display').textContent = url || 'No URL found';

  // Pre-fill title (strip common suffixes)
  const cleanTitle = title
    .replace(/\s*[|\-–—]\s*(YouTube|Instagram|TikTok|小红书|Bilibili).*$/i, '')
    .trim();
  document.getElementById('title-input').value = cleanTitle;

  // Platform chip
  const platform = detectPlatform(url);
  if (platform) {
    const chip = document.getElementById('platform-chip');
    chip.textContent = platform.label;
    chip.className = `platform-chip ${platform.cls}`;
    chip.style.display = 'inline-flex';
  }

  // Clip button
  const clipBtn = document.getElementById('clip-btn');

  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    clipBtn.disabled = true;
    showStatus('error', 'Cannot clip browser or extension pages.');
    return;
  }

  clipBtn.addEventListener('click', async () => {
    const titleVal = document.getElementById('title-input').value.trim();
    const notesVal = document.getElementById('notes-input').value.trim();

    clipBtn.disabled = true;
    clipBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.7s linear infinite"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      Opening TravelPanel…
    `;

    const shareUrl = new URL('/share', travelPanelUrl);
    shareUrl.searchParams.set('url', url);
    if (titleVal) shareUrl.searchParams.set('title', titleVal);
    if (notesVal) shareUrl.searchParams.set('notes', notesVal);

    try {
      await chrome.tabs.create({ url: shareUrl.toString() });
      window.close();
    } catch (err) {
      clipBtn.disabled = false;
      clipBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        Save to TravelPanel
      `;
      showStatus('error', 'Could not open TravelPanel. Check your URL in Settings.');
    }
  });

  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  document.getElementById('open-options').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

// CSS animation for spinner (injected into head)
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

init().catch(console.error);
