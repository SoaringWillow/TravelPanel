// TravelPanel Clipper — Popup Logic

const PLATFORM_LABELS = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  other: 'Web',
};

const PLATFORM_COLORS = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  bilibili: '#00AEEC',
  other: '#6366F1',
};

// ─── Platform detection (mirrors lib/parse-url.ts) ────────────────────────────

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return result.settings || { apiUrl: '', rateLimitCount: 0, rateLimitReset: 0 };
}

async function getBoards() {
  const result = await chrome.storage.local.get('boards');
  return result.boards || {};
}

async function getItem(itemId) {
  const result = await chrome.storage.local.get('items');
  const items = result.items || {};
  return items[itemId] || null;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await getSettings();

  // Wire up settings button always
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  if (!settings.apiUrl) {
    show('unconfigured-state');
    document.getElementById('go-settings-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  await initSaveForm(settings);
});

async function initSaveForm(settings) {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url || '';
  const title = tab.title || url;

  // Detect platform
  const platform = detectPlatform(url);

  // Populate URL card
  document.getElementById('page-title').textContent =
    title.length > 70 ? title.slice(0, 70) + '…' : title;
  document.getElementById('page-host').textContent = getHostname(url);

  const badge = document.getElementById('platform-badge');
  badge.textContent = PLATFORM_LABELS[platform];
  badge.style.backgroundColor = PLATFORM_COLORS[platform];

  // Load boards into selector
  const boards = await getBoards();
  const boardSelect = document.getElementById('board-select');
  Object.values(boards)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach(board => {
      const opt = document.createElement('option');
      opt.value = board.id;
      opt.textContent = `${board.emoji || '📌'} ${board.name}`;
      boardSelect.appendChild(opt);
    });

  // Check rate limit
  const now = Date.now();
  if (settings.rateLimitCount >= 30 && now < (settings.rateLimitReset || 0)) {
    const resetDate = new Date(settings.rateLimitReset);
    showStatus(`Daily limit reached (30 clips/day). Resets at ${resetDate.toLocaleTimeString()}.`, 'warning');
    document.getElementById('save-btn').disabled = true;
    document.getElementById('save-btn').textContent = 'Daily limit reached';
  }

  show('save-form');

  // Save button
  document.getElementById('save-btn').addEventListener('click', async () => {
    await handleSave(url, title, settings);
  });

  // Enter key in textarea submits (Shift+Enter for newline)
  document.getElementById('notes-input').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSave(url, title, settings);
    }
  });
}

// ─── Save handler ─────────────────────────────────────────────────────────────

async function handleSave(url, title, settings) {
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn.disabled) return;

  const boardId = document.getElementById('board-select').value || null;
  const notes = document.getElementById('notes-input').value.trim();

  // Block-ish URLs that aren't real pages
  if (!url || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) {
    showStatus('Cannot clip browser internal pages. Navigate to a travel website first.', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.classList.add('loading');

  try {
    // Send message to background to create item + enrich
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_CLIP',
      url,
      title,
      boardId,
      notes,
      apiUrl: settings.apiUrl,
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to save');
    }

    // Show success state
    hide('save-form');
    show('success-state');

    // Wire up open app button
    document.getElementById('open-app-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: settings.apiUrl });
    });

    // Save another button
    document.getElementById('save-another-btn').addEventListener('click', () => {
      hide('success-state');
      // Reset form
      document.getElementById('notes-input').value = '';
      saveBtn.disabled = false;
      saveBtn.classList.remove('loading');
      saveBtn.textContent = 'Save to TravelPanel';
      show('save-form');
    });

    // Poll for enrichment completion
    pollEnrichmentStatus(response.itemId, settings.apiUrl);

  } catch (err) {
    saveBtn.disabled = false;
    saveBtn.classList.remove('loading');
    showStatus(err.message || 'Something went wrong. Check your settings.', 'error');
  }
}

// ─── Enrichment polling ───────────────────────────────────────────────────────

async function pollEnrichmentStatus(itemId, apiUrl) {
  const maxAttempts = 12; // 12 × 5s = 60s timeout
  let attempts = 0;

  const poll = async () => {
    attempts++;
    const item = await getItem(itemId);

    if (!item) return;

    if (item.enrichmentStatus === 'done') {
      updateSuccessStats(item);
      return;
    }

    if (item.enrichmentStatus === 'failed') {
      document.getElementById('success-sub').textContent =
        'Saved — extraction failed. It will retry automatically.';
      return;
    }

    if (attempts < maxAttempts) {
      setTimeout(poll, 5000);
    }
  };

  setTimeout(poll, 3000);
}

function updateSuccessStats(item) {
  const stats = document.getElementById('success-stats');
  stats.innerHTML = '';

  const locCount = (item.locations || []).length;
  const subCount = (item.substance || []).length;

  if (locCount > 0) {
    const chip = document.createElement('span');
    chip.className = 'stat-chip found';
    chip.innerHTML = `📍 ${locCount} location${locCount !== 1 ? 's' : ''}`;
    stats.appendChild(chip);
  }

  if (subCount > 0) {
    const chip = document.createElement('span');
    chip.className = 'stat-chip found';
    chip.innerHTML = `💡 ${subCount} tip${subCount !== 1 ? 's' : ''}`;
    stats.appendChild(chip);
  }

  if (locCount === 0 && subCount === 0) {
    const chip = document.createElement('span');
    chip.className = 'stat-chip';
    chip.textContent = 'No travel content detected';
    stats.appendChild(chip);
  }

  document.getElementById('success-sub').textContent =
    locCount > 0
      ? `Found ${locCount} location${locCount !== 1 ? 's' : ''} and ${subCount} tip${subCount !== 1 ? 's' : ''} — open the app to explore.`
      : 'Saved to your collection. Open the app to view.';
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showStatus(message, type = 'info') {
  const bar = document.getElementById('status-bar');
  bar.textContent = message;
  bar.className = `status-bar ${type}`;
  bar.classList.remove('hidden');
}
