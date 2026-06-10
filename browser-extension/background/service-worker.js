/* global chrome */

// ─── Install ──────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       'save-to-travelpanel',
    title:    'Save to TravelPanel',
    contexts: ['page', 'link'],
  });
});

// ─── Context menu ─────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-travelpanel') return;
  const url   = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title  || url;
  await saveFromContext(url, title);
});

// ─── Keyboard shortcut ────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-to-travelpanel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await saveFromContext(tab.url || '', tab.title || '');
});

// ─── Message handler (from popup) ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SAVE_CLIP') {
    handleSaveClip(msg.clip, msg.appUrl)
      .then(()    => sendResponse({ success: true  }))
      .catch((e)  => sendResponse({ success: false, error: e.message }));
    return true; // keep channel open for async
  }

  if (msg.type === 'GET_BOARDS') {
    getBoardsFromApp(msg.appUrl)
      .then((boards) => sendResponse({ boards }))
      .catch(()      => sendResponse({ boards: [] }));
    return true;
  }
});

// ─── Save helpers ─────────────────────────────────────────────────────────────

async function saveFromContext(url, title) {
  const { appUrl } = await chrome.storage.local.get('appUrl');

  if (!appUrl) {
    chrome.notifications.create('no-config', {
      type:     'basic',
      iconUrl:  '../icons/icon.svg',
      title:    'TravelPanel',
      message:  'Configure your TravelPanel URL first — click the extension icon.',
    });
    return;
  }

  const clip = buildClip(url, title);
  await handleSaveClip(clip, appUrl);
}

async function handleSaveClip(clip, appUrl) {
  // 1. Persist to extension storage immediately (offline-safe)
  const { pendingClips = [] } = await chrome.storage.local.get('pendingClips');
  pendingClips.push(clip);
  await chrome.storage.local.set({ pendingClips });

  // 2. Try live delivery to an open TravelPanel tab
  const delivered = await deliverToAppTab(clip, appUrl);

  // 3. Background enrichment via the API (non-blocking)
  if (appUrl) {
    triggerEnrichment(clip, appUrl).catch(() => {});
  }

  // 4. If not delivered live, open the share page as fallback
  if (!delivered && appUrl) {
    const params = new URLSearchParams({ url: clip.url, title: clip.title });
    if (clip.boardId) params.set('boardId', clip.boardId);
    // Only open the share page when triggered from context menu / shortcut
    // (popup has its own success state, so skip the redirect there)
  }

  chrome.notifications.create(`saved-${clip.id}`, {
    type:     'basic',
    iconUrl:  '../icons/icon.svg',
    title:    'Saved to TravelPanel!',
    message:  truncate(clip.title, 80) + ' — extracting locations…',
  });
}

async function deliverToAppTab(clip, appUrl) {
  if (!appUrl) return false;
  try {
    const host    = new URL(appUrl).host;
    const allTabs = await chrome.tabs.query({});
    const appTabs = allTabs.filter((t) => {
      try { return new URL(t.url || '').host === host; } catch { return false; }
    });
    if (!appTabs.length) return false;

    await chrome.scripting.executeScript({
      target: { tabId: appTabs[0].id },
      world:  'MAIN',
      func: (clipData) => {
        // Write to localStorage so the app can pick it up on load
        localStorage.setItem('travelpanel:incoming-clip', JSON.stringify(clipData));
        // Dispatch event for live delivery if app is already mounted
        window.dispatchEvent(new CustomEvent('travelpanel:incoming-clip', { detail: clipData }));
      },
      args: [clip],
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function triggerEnrichment(clip, appUrl) {
  const res = await fetch(`${appUrl}/api/import`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url: clip.url }),
  });
  if (!res.ok) return;

  const data = await res.json();

  // Merge enrichment data back into pending storage
  const { pendingClips = [] } = await chrome.storage.local.get('pendingClips');
  const idx = pendingClips.findIndex((c) => c.id === clip.id);
  if (idx >= 0) {
    pendingClips[idx] = {
      ...pendingClips[idx],
      ...data,
      id:               clip.id,
      savedAt:          clip.savedAt,
      boardId:          clip.boardId,
      enrichmentStatus: 'done',
    };
    await chrome.storage.local.set({ pendingClips });

    // Re-deliver enriched clip if TravelPanel is open
    await deliverToAppTab(pendingClips[idx], appUrl);
  }
}

async function getBoardsFromApp(appUrl) {
  if (!appUrl) return [];
  try {
    const host    = new URL(appUrl).host;
    const allTabs = await chrome.tabs.query({});
    const appTabs = allTabs.filter((t) => {
      try { return new URL(t.url || '').host === host; } catch { return false; }
    });
    if (!appTabs.length) return [];

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: appTabs[0].id },
      world:  'MAIN',
      func: () => {
        const raw = localStorage.getItem('travelpanel:boards');
        return raw ? JSON.parse(raw) : [];
      },
    });
    return result?.result || [];
  } catch (_) {
    return [];
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function buildClip(url, title) {
  return {
    id:               crypto.randomUUID(),
    url,
    title:            title || url,
    platform:         detectPlatform(url),
    description:      '',
    thumbnail:        '',
    locations:        [],
    activities:       [],
    tags:             [],
    substance:        [],
    savedAt:          Date.now(),
    enrichmentStatus: 'pending',
    retryCount:       0,
    boardId:          undefined,
  };
}

function detectPlatform(url) {
  if (!url) return 'other';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin'))                   return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') ||
      url.includes('xhs.link'))                                                     return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') ||
      url.includes('tiktok.com'))                                                   return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv'))                      return 'bilibili';
  return 'other';
}

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max) + '…' : (str || '');
}
