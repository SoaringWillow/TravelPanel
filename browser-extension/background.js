// TravelPanel Clipper — Background Service Worker

// ─── Platform detection ───────────────────────────────────────────────────────

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return result.settings || { apiUrl: '', rateLimitCount: 0, rateLimitReset: 0 };
}

async function getItems() {
  const result = await chrome.storage.local.get('items');
  return result.items || {};
}

async function saveItemToStorage(item) {
  const result = await chrome.storage.local.get('items');
  const items = result.items || {};
  items[item.id] = item;
  await chrome.storage.local.set({ items });

  // Update badge with total clip count
  const count = Object.keys(items).length;
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#6366F1' });
}

async function updateSettings(patch) {
  const settings = await getSettings();
  await chrome.storage.local.set({ settings: { ...settings, ...patch } });
}

// ─── Rate limit check ─────────────────────────────────────────────────────────

async function checkRateLimit() {
  const settings = await getSettings();
  const now = Date.now();

  // Reset counter if past midnight UTC
  if (settings.rateLimitReset && now >= settings.rateLimitReset) {
    await updateSettings({ rateLimitCount: 0, rateLimitReset: 0 });
    return { allowed: true, remaining: 30 };
  }

  if (settings.rateLimitCount >= 30) {
    return { allowed: false, remaining: 0, resetAt: settings.rateLimitReset };
  }

  return { allowed: true, remaining: 30 - (settings.rateLimitCount || 0) };
}

async function incrementRateLimit() {
  const settings = await getSettings();
  const now = Date.now();

  // Calculate next midnight UTC for reset
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);

  await updateSettings({
    rateLimitCount: (settings.rateLimitCount || 0) + 1,
    rateLimitReset: settings.rateLimitReset || tomorrow.getTime(),
  });
}

// ─── Core enrichment ─────────────────────────────────────────────────────────

async function enrichItem(itemId, url, apiUrl) {
  const items = await getItems();
  const item = items[itemId];
  if (!item) return { success: false, error: 'Item not found' };

  // Rate limit check
  const rateLimit = await checkRateLimit();
  if (!rateLimit.allowed) {
    item.enrichmentStatus = 'failed';
    item.retryCount = 3; // Prevent auto-retry
    await saveItemToStorage(item);
    return { success: false, error: 'Rate limit reached' };
  }

  // Mark as processing
  item.enrichmentStatus = 'processing';
  await saveItemToStorage(item);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    const response = await fetch(`${apiUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`API returned ${response.status}${text ? ': ' + text.slice(0, 100) : ''}`);
    }

    const result = await response.json();

    // Update item with enriched data
    Object.assign(item, {
      title: result.title || item.title,
      description: result.description || '',
      thumbnail: result.thumbnail || '',
      locations: result.locations || [],
      activities: result.activities || [],
      tags: result.tags || [],
      substance: result.substance || [],
      platform: result.platform || item.platform,
      enrichmentStatus: 'done',
    });

    await saveItemToStorage(item);
    await incrementRateLimit();

    return { success: true };

  } catch (err) {
    const isAbort = err.name === 'AbortError';
    item.enrichmentStatus = 'failed';
    item.retryCount = (item.retryCount || 0) + 1;
    await saveItemToStorage(item);

    return {
      success: false,
      error: isAbort ? 'Request timed out' : (err.message || 'Unknown error'),
    };
  }
}

// ─── Retry queue ──────────────────────────────────────────────────────────────

async function processRetryQueue() {
  const settings = await getSettings();
  if (!settings.apiUrl) return;

  const items = await getItems();
  const retryable = Object.values(items).filter(
    item =>
      (item.enrichmentStatus === 'pending' || item.enrichmentStatus === 'failed') &&
      (item.retryCount || 0) < 3
  );

  if (retryable.length === 0) return;

  for (const item of retryable) {
    await enrichItem(item.id, item.url, settings.apiUrl);
    // Stagger requests to avoid hammering the API
    await new Promise(r => setTimeout(r, 1500));
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_CLIP') {
    handleSaveClip(message).then(sendResponse).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async
  }
});

async function handleSaveClip({ url, title, boardId, notes, apiUrl }) {
  const item = {
    id: crypto.randomUUID(),
    url,
    title: title || url,
    platform: detectPlatform(url),
    description: '',
    thumbnail: '',
    locations: [],
    activities: [],
    tags: [],
    substance: [],
    savedAt: Date.now(),
    notes: notes || '',
    enrichmentStatus: 'pending',
    retryCount: 0,
    boardId: boardId || null,
  };

  // Save immediately (optimistic)
  await saveItemToStorage(item);

  // Enrich asynchronously — don't block the save response
  enrichItem(item.id, url, apiUrl).catch(() => {});

  return { success: true, itemId: item.id };
}

// ─── Context menu ─────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || tab.url || '';
  const title = tab.title || url;

  const settings = await getSettings();
  if (!settings.apiUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const item = {
    id: crypto.randomUUID(),
    url,
    title,
    platform: detectPlatform(url),
    description: '',
    thumbnail: '',
    locations: [],
    activities: [],
    tags: [],
    substance: [],
    savedAt: Date.now(),
    notes: '',
    enrichmentStatus: 'pending',
    retryCount: 0,
    boardId: null,
  };

  await saveItemToStorage(item);
  enrichItem(item.id, url, settings.apiUrl).catch(() => {});

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Saved to TravelPanel',
    message: `"${title.slice(0, 60)}" — Claude is extracting locations...`,
  });
});

// ─── Alarms ───────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'retry-queue') {
    await processRetryQueue();
  }
});

// ─── Install / Startup ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'clip-to-travelpanel-page',
    title: 'Save page to TravelPanel',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'clip-to-travelpanel-link',
    title: 'Save link to TravelPanel',
    contexts: ['link'],
  });

  // Set up retry alarm (every 5 minutes)
  chrome.alarms.create('retry-queue', { periodInMinutes: 5 });

  // Clear badge on fresh install
  await chrome.action.setBadgeText({ text: '' });
});

// On service worker start, process any stuck pending items
chrome.runtime.onStartup.addListener(async () => {
  await processRetryQueue();
});
