const NON_CLIPPABLE = ['chrome://', 'chrome-extension://', 'about:', 'edge://', 'moz-extension://', 'opera://'];

document.addEventListener('DOMContentLoaded', async () => {
  const pagePreview  = document.getElementById('page-preview');
  const titleEl      = document.getElementById('page-title');
  const domainEl     = document.getElementById('page-domain');
  const faviconEl    = document.getElementById('favicon');
  const clipBtn      = document.getElementById('clip-btn');
  const clipBtnText  = document.getElementById('clip-btn-text');
  const settingsBtn  = document.getElementById('settings-btn');
  const errorState   = document.getElementById('error-state');
  const setupPrompt  = document.getElementById('setup-prompt');
  const footerLink   = document.getElementById('footer-link');

  let tabUrl   = '';
  let tabTitle = '';

  // ── Load tab info ──
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabUrl   = tab.url   || '';
    tabTitle = tab.title || 'Untitled';

    const isNonClippable = NON_CLIPPABLE.some(prefix => tabUrl.startsWith(prefix));
    if (!tabUrl || isNonClippable) {
      showError('Navigate to a travel inspiration page and click the extension icon to clip it.');
      return;
    }

    const { hostname } = new URL(tabUrl);
    titleEl.textContent  = tabTitle;
    domainEl.textContent = hostname;
    faviconEl.src        = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    faviconEl.onerror    = () => { faviconEl.style.display = 'none'; };
    pagePreview.style.display = 'flex';
  } catch {
    showError('Could not read the current tab.');
    return;
  }

  // ── Check settings ──
  const { travelpanelUrl = '' } = await chrome.storage.sync.get('travelpanelUrl');

  if (!travelpanelUrl) {
    setupPrompt.style.display = 'flex';
    clipBtnText.textContent   = 'Open Settings';
    clipBtn.addEventListener('click', openSettings, { once: true });

    // Update footer link
    footerLink.textContent = 'Configure →';
    footerLink.addEventListener('click', openSettings);
    return;
  }

  // Update footer to show configured host
  try {
    footerLink.textContent = new URL(travelpanelUrl).hostname;
  } catch { /* ignore */ }

  // ── Clip action ──
  clipBtn.addEventListener('click', async () => {
    const { travelpanelUrl: url = '' } = await chrome.storage.sync.get('travelpanelUrl');
    if (!url) { openSettings(); return; }

    clipBtnText.textContent = 'Opening';
    clipBtnText.classList.add('loading-dots');
    clipBtn.disabled = true;

    const shareUrl = new URL(`${url.replace(/\/$/, '')}/share`);
    shareUrl.searchParams.set('url', tabUrl);
    shareUrl.searchParams.set('title', tabTitle);
    shareUrl.searchParams.set('source', 'browser-extension');

    await chrome.tabs.create({ url: shareUrl.toString() });
    window.close();
  });

  function openSettings() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  function showError(msg) {
    errorState.textContent = msg;
    errorState.style.display = 'block';
    clipBtn.disabled = true;
    clipBtn.style.background = '#e5e7eb';
    clipBtn.style.color = '#9ca3af';
    clipBtnText.textContent = 'Cannot clip this page';
  }
});
