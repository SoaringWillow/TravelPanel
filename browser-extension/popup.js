/* popup.js — TravelPanel Clipper */
'use strict';

const DB_NAME = 'TravelPanelDB';
const DB_VERSION = 2;

const PLATFORM_MAP = {
  youtube:      { icon: '▶', label: 'YouTube' },
  instagram:    { icon: '📸', label: 'Instagram' },
  xiaohongshu:  { icon: '📕', label: 'Xiaohongshu' },
  tiktok:       { icon: '🎵', label: 'TikTok' },
  twitter:      { icon: '𝕏', label: 'Twitter / X' },
  bilibili:     { icon: '📺', label: 'Bilibili' },
};

function detectPlatform(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('youtube') || h.includes('youtu.be'))           return 'youtube';
    if (h.includes('instagram'))                                    return 'instagram';
    if (h.includes('xiaohongshu') || h.includes('xhslink'))        return 'xiaohongshu';
    if (h.includes('tiktok') || h.includes('douyin'))              return 'tiktok';
    if (h.includes('twitter') || h.includes('x.com'))              return 'twitter';
    if (h.includes('bilibili'))                                     return 'bilibili';
  } catch { /* ignore */ }
  return 'other';
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 1 ? u.pathname.slice(0, 28) + (u.pathname.length > 28 ? '…' : '') : '';
    return u.hostname + path;
  } catch {
    return url.slice(0, 40);
  }
}

function showView(id) {
  ['mainView', 'successView', 'syncSuccessView', 'configView'].forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = v === id ? '' : 'none';
  });
}

// ─── Sync function (injected into TravelPanel tab via chrome.scripting) ──────
// NOTE: This function is serialised and sent to the page — no closure access.
function injectedSync(pendingClips) {
  return new Promise(resolve => {
    const req = indexedDB.open('TravelPanelDB', 2);

    req.onerror = () => resolve({ ok: false, boards: [], imported: 0, error: req.error?.message });

    req.onsuccess = () => {
      const db = req.result;

      // Read all boards first
      const tx1 = db.transaction('boards', 'readonly');
      const boardsReq = tx1.objectStore('boards').getAll();

      boardsReq.onsuccess = async () => {
        const boards = (boardsReq.result || []).map(b => ({
          id: b.id,
          name: b.name,
          emoji: b.emoji || '📌',
        }));

        if (!pendingClips || pendingClips.length === 0) {
          db.close();
          // Dispatch refresh event even with no pending clips (boards sync)
          window.dispatchEvent(new CustomEvent('travelpanel:extension-sync', { detail: { newItems: 0 } }));
          return resolve({ ok: true, boards, imported: 0 });
        }

        // Write pending clips to items store
        const tx2 = db.transaction('items', 'readwrite');
        const store = tx2.objectStore('items');

        for (const clip of pendingClips) {
          store.put({
            id: clip.id,
            url: clip.url,
            title: clip.title || 'Untitled',
            description: '',
            thumbnail: '',
            platform: clip.platform || 'other',
            locations: [],
            activities: [],
            tags: [],
            substance: [],
            savedAt: clip.clippedAt || Date.now(),
            enrichmentStatus: 'pending',
            retryCount: 0,
            boardId: clip.boardId || undefined,
          });
        }

        tx2.oncomplete = () => {
          db.close();
          window.dispatchEvent(new CustomEvent('travelpanel:extension-sync', {
            detail: { newItems: pendingClips.length },
          }));
          resolve({ ok: true, boards, imported: pendingClips.length });
        };

        tx2.onerror = () => {
          db.close();
          resolve({ ok: false, boards, imported: 0, error: tx2.error?.message });
        };
      };

      boardsReq.onerror = () => {
        db.close();
        resolve({ ok: false, boards: [], imported: 0, error: boardsReq.error?.message });
      };
    };
  });
}

// ─── State ───────────────────────────────────────────────────────────────────
let currentTab = null;
let appUrl = '';
let selectedBoardId = '';
let isOnAppTab = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get(['appUrl', 'cachedBoards', 'pendingClips']);
  appUrl = (stored.appUrl || '').replace(/\/$/, '');
  const cachedBoards = stored.cachedBoards || [];
  const pendingClips = stored.pendingClips || [];

  if (!appUrl) {
    showView('configView');
    return;
  }

  showView('mainView');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  const tabUrl = tab?.url || '';
  const tabTitle = tab?.title || '';

  isOnAppTab = tabUrl.startsWith(appUrl);

  // Populate page info
  document.getElementById('pageTitleEl').textContent = tabTitle || 'Untitled page';
  document.getElementById('pageUrlEl').textContent = shortUrl(tabUrl);

  // Favicon
  if (tabUrl) {
    try {
      const faviconImg = document.getElementById('faviconImg');
      faviconImg.src = `https://www.google.com/s2/favicons?domain=${new URL(tabUrl).hostname}&sz=32`;
      faviconImg.style.display = '';
      faviconImg.onerror = () => { faviconImg.style.display = 'none'; };
    } catch { /* ignore */ }
  }

  // Platform badge
  const platform = detectPlatform(tabUrl);
  const pInfo = PLATFORM_MAP[platform];
  if (pInfo) {
    const badge = document.getElementById('platformBadge');
    badge.textContent = `${pInfo.icon} ${pInfo.label}`;
    badge.style.display = '';
  }

  // Boards
  renderBoards(cachedBoards);

  // If on app tab: show sync button; auto-sync boards quietly
  if (isOnAppTab) {
    if (pendingClips.length > 0) {
      const syncBtn = document.getElementById('syncBtn');
      const syncLabel = document.getElementById('syncBtnLabel');
      syncLabel.textContent = `Sync ${pendingClips.length} pending clip${pendingClips.length > 1 ? 's' : ''}`;
      syncBtn.style.display = '';
    } else {
      // Silently refresh boards only
      doSync(true);
    }
  } else if (pendingClips.length > 0) {
    const notice = document.getElementById('pendingNotice');
    const noticeText = document.getElementById('pendingNoticeText');
    noticeText.textContent = `⏳ ${pendingClips.length} clip${pendingClips.length > 1 ? 's' : ''} pending sync — open TravelPanel to sync`;
    notice.style.display = '';
  }

  // Hide boards hint if we have boards
  if (cachedBoards.length > 0) {
    const hint = document.getElementById('boardsHint');
    hint.style.display = 'none';
  }

  // If we're not on the app tab but not on an interesting page, adjust hint
  if (!isOnAppTab && cachedBoards.length === 0) {
    document.getElementById('boardsHintText').textContent = 'Open TravelPanel to sync boards';
  }
}

function renderBoards(boards) {
  const grid = document.getElementById('boardGrid');
  grid.innerHTML = '';

  const inboxChip = makeChip('', '📥', 'Inbox', selectedBoardId === '');
  grid.appendChild(inboxChip);

  boards.forEach(b => {
    grid.appendChild(makeChip(b.id, b.emoji || '📌', b.name, selectedBoardId === b.id));
  });
}

function makeChip(id, emoji, name, selected) {
  const chip = document.createElement('button');
  chip.className = 'board-chip' + (selected ? ' selected' : '');
  chip.dataset.boardId = id;
  chip.title = name;
  chip.innerHTML = `<span>${emoji}</span><span>${name}</span>`;
  chip.addEventListener('click', () => {
    selectedBoardId = id;
    document.querySelectorAll('.board-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
  return chip;
}

// ─── Clip action ─────────────────────────────────────────────────────────────
async function clipPage() {
  const btn = document.getElementById('clipBtn');
  btn.disabled = true;
  btn.querySelector('svg + span') ? null : null;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="3"/></svg> Saving…`;

  const tabUrl = currentTab?.url || '';
  const tabTitle = currentTab?.title || '';

  try {
    const clip = {
      id: crypto.randomUUID(),
      url: tabUrl,
      title: tabTitle,
      boardId: selectedBoardId || undefined,
      clippedAt: Date.now(),
      platform: detectPlatform(tabUrl),
    };

    const { pendingClips = [] } = await chrome.storage.local.get('pendingClips');
    pendingClips.push(clip);
    await chrome.storage.local.set({ pendingClips });

    // Update badge
    await chrome.action.setBadgeText({ text: String(pendingClips.length) });
    await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });

    // Show success
    const { cachedBoards = [] } = await chrome.storage.local.get('cachedBoards');
    const boardName = selectedBoardId
      ? (cachedBoards.find(b => b.id === selectedBoardId)?.name || 'board')
      : 'Inbox';

    document.getElementById('successSub').textContent = `Saved to ${boardName}`;

    const pill = document.getElementById('successPendingPill');
    if (pendingClips.length > 1) {
      pill.textContent = `${pendingClips.length} clips pending — open TravelPanel to sync`;
      pill.style.display = '';
    }

    document.getElementById('openAppBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: appUrl });
      window.close();
    });

    showView('successView');
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Clip to TravelPanel`;
    console.error('[TravelPanel Clipper] clip failed:', err);
  }
}

// ─── Sync action (runs when on TravelPanel tab) ───────────────────────────────
async function doSync(silent = false) {
  if (!currentTab?.id) return;

  const { pendingClips = [] } = await chrome.storage.local.get('pendingClips');

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: injectedSync,
      args: [pendingClips],
    });

    const result = results?.[0]?.result;
    if (!result?.ok) return;

    // Cache boards
    if (result.boards?.length > 0) {
      await chrome.storage.local.set({
        cachedBoards: result.boards,
        boardsCachedAt: Date.now(),
      });
      renderBoards(result.boards);
      document.getElementById('boardsHint').style.display = 'none';
    }

    // Clear pending clips if we imported
    if (pendingClips.length > 0) {
      await chrome.storage.local.set({ pendingClips: [] });
      await chrome.action.setBadgeText({ text: '' });
    }

    if (!silent && pendingClips.length > 0) {
      document.getElementById('syncCountText').textContent =
        `${result.imported} clip${result.imported !== 1 ? 's' : ''} added to TravelPanel`;
      showView('syncSuccessView');
      setTimeout(() => window.close(), 2200);
    } else if (!silent) {
      // Just hid sync button, boards refreshed — nothing dramatic to show
      const syncBtn = document.getElementById('syncBtn');
      syncBtn.style.display = 'none';
    } else {
      const syncBtn = document.getElementById('syncBtn');
      syncBtn.style.display = 'none';
    }
  } catch (err) {
    // Probably failed because content script can't run on this URL (chrome:// etc.)
    console.warn('[TravelPanel Clipper] sync via scripting failed:', err?.message);
  }
}

// ─── Event listeners ─────────────────────────────────────────────────────────
document.getElementById('clipBtn')?.addEventListener('click', clipPage);
document.getElementById('syncBtn')?.addEventListener('click', () => doSync(false));
document.getElementById('settingsBtn')?.addEventListener('click', () => chrome.runtime.openOptionsPage());
document.getElementById('goSettingsBtn')?.addEventListener('click', () => chrome.runtime.openOptionsPage());

init();
