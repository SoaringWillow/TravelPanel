const PLATFORMS = {
  instagram: { pattern: /instagram\.com/, label: 'Instagram' },
  youtube:   { pattern: /youtube\.com|youtu\.be/, label: 'YouTube' },
  tiktok:    { pattern: /tiktok\.com/, label: 'TikTok' },
  xiaohongshu: { pattern: /xiaohongshu\.com|xhslink\.com|xhs\.link/, label: '小红书' },
  douyin:    { pattern: /douyin\.com|iesdouyin\.com/, label: 'Douyin' },
  bilibili:  { pattern: /bilibili\.com|b23\.tv/, label: 'Bilibili' },
};

function detectPlatform(url) {
  for (const [key, { pattern, label }] of Object.entries(PLATFORMS)) {
    if (pattern.test(url)) return { key, label };
  }
  return null;
}

function truncateUrl(url, maxLen = 44) {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > maxLen ? display.slice(0, maxLen) + '…' : display;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + '…' : url;
  }
}

function setClipState(btn, textEl, state) {
  btn.disabled = state !== 'idle';
  btn.className = 'clip-btn' + (state === 'success' ? ' success' : state === 'loading' ? ' loading' : '');

  if (state === 'loading') {
    textEl.textContent = 'Opening TravelPanel…';
    btn.querySelector('svg')?.remove();
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    btn.insertBefore(spinner, textEl);
  } else if (state === 'success') {
    const existingSpinner = btn.querySelector('.spinner');
    if (existingSpinner) existingSpinner.remove();
    textEl.textContent = 'Opened! Switch to TravelPanel';
    if (!btn.querySelector('svg')) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '16'); svg.setAttribute('height', '16');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2.5');
      const check = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      check.setAttribute('points', '20 6 9 17 4 12');
      svg.appendChild(check);
      btn.insertBefore(svg, textEl);
    }
  } else {
    const existingSpinner = btn.querySelector('.spinner');
    if (existingSpinner) existingSpinner.remove();
    textEl.textContent = 'Clip to TravelPanel';
    if (!btn.querySelector('svg')) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '16'); svg.setAttribute('height', '16');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2.5');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      poly.setAttribute('points', '17 8 12 3 7 8');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '12'); line.setAttribute('y1', '3');
      line.setAttribute('x2', '12'); line.setAttribute('y2', '15');
      svg.append(path, poly, line);
      btn.insertBefore(svg, textEl);
    }
  }
}

function showStatus(el, message, type = 'info') {
  el.textContent = message;
  el.className = `status ${type}`;
  el.style.display = 'block';
}

async function init() {
  const clipBtn    = document.getElementById('clipBtn');
  const clipBtnText = document.getElementById('clipBtnText');
  const urlInput   = document.getElementById('urlInput');
  const pageTitle  = document.getElementById('pageTitle');
  const pageUrl    = document.getElementById('pageUrl');
  const pageFavicon = document.getElementById('pageFavicon');
  const platformRow = document.getElementById('platformRow');
  const platformBadge = document.getElementById('platformBadge');
  const statusEl   = document.getElementById('status');
  const settingsBtn = document.getElementById('settingsBtn');

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Get current tab info
  let currentUrl = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab.url || '';
    const title = tab.title || '';

    pageTitle.textContent = title || new URL(currentUrl).hostname;
    pageUrl.textContent = truncateUrl(currentUrl);

    // Set favicon
    const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(currentUrl)}`;
    const img = document.createElement('img');
    img.src = faviconUrl;
    img.width = 18;
    img.height = 18;
    img.alt = '';
    img.onerror = () => { /* keep default SVG */ };
    img.onload = () => { pageFavicon.innerHTML = ''; pageFavicon.appendChild(img); };

    urlInput.value = currentUrl;

    // Platform detection
    const platform = detectPlatform(currentUrl);
    if (platform) {
      platformBadge.textContent = platform.label;
      platformBadge.className = `platform-badge ${platform.key}`;
      platformRow.style.display = 'flex';
    }
  } catch (err) {
    pageTitle.textContent = 'No page detected';
    pageUrl.textContent = 'Navigate to a travel post to clip it';
  }

  // Update platform badge on URL input change
  urlInput.addEventListener('input', () => {
    const val = urlInput.value.trim();
    const platform = detectPlatform(val);
    if (platform) {
      platformBadge.textContent = platform.label;
      platformBadge.className = `platform-badge ${platform.key}`;
      platformRow.style.display = 'flex';
    } else {
      platformRow.style.display = 'none';
    }
    statusEl.style.display = 'none';
  });

  // Clip button handler
  clipBtn.addEventListener('click', async () => {
    const url = (urlInput.value || currentUrl).trim();

    if (!url) {
      showStatus(statusEl, 'No URL to clip — navigate to a page first.', 'error');
      return;
    }

    try { new URL(url); } catch {
      showStatus(statusEl, 'That doesn\'t look like a valid URL.', 'error');
      return;
    }

    setClipState(clipBtn, clipBtnText, 'loading');
    statusEl.style.display = 'none';

    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_APP', url });
      setClipState(clipBtn, clipBtnText, 'success');
      showStatus(statusEl, 'TravelPanel is processing your clip — spots & wisdom are being extracted.', 'info');
    } catch (err) {
      setClipState(clipBtn, clipBtnText, 'idle');
      showStatus(statusEl, 'Could not open TravelPanel. Check your app URL in settings.', 'error');
    }
  });
}

init();
