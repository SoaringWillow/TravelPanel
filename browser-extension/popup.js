'use strict';

const DEFAULT_APP_URL = 'https://travelpanel.vercel.app';

// Platform detection (mirrors lib/parse-url.ts logic)
const PLATFORM_PATTERNS = [
  { id: 'xiaohongshu', patterns: [/xiaohongshu\.com/, /xhslink\.com/, /xhs\.link/], label: 'Xiaohongshu' },
  { id: 'wechat',      patterns: [/mp\.weixin\.qq\.com/],                            label: 'WeChat'       },
  { id: 'douyin',      patterns: [/douyin\.com/, /v\.douyin\.com/],                  label: 'Douyin'       },
  { id: 'bilibili',    patterns: [/bilibili\.com/, /b23\.tv/],                        label: 'Bilibili'     },
  { id: 'youtube',     patterns: [/youtube\.com/, /youtu\.be/],                       label: 'YouTube'      },
  { id: 'instagram',   patterns: [/instagram\.com/],                                  label: 'Instagram'    },
];

function detectPlatform(url) {
  for (const { id, patterns, label } of PLATFORM_PATTERNS) {
    if (patterns.some((re) => re.test(url))) return { id, label };
  }
  return { id: 'other', label: 'Web' };
}

// Unclippable URL schemes
const BLOCKED_SCHEMES = ['chrome:', 'chrome-extension:', 'about:', 'edge:', 'firefox:', 'moz-extension:'];

function isClippable(url) {
  return url && !BLOCKED_SCHEMES.some((s) => url.startsWith(s));
}

// ── DOM helpers ────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function showSetupState() {
  $('preview-card').classList.add('hidden');
  $('actions').classList.add('hidden');
  $('setup-state').classList.remove('hidden');
}

function showErrorState(msg) {
  $('preview-card').classList.add('hidden');
  $('actions').classList.add('hidden');
  $('error-state').classList.remove('hidden');
  $('error-message').textContent = msg;
}

function enableActions() {
  $('save-btn').disabled = false;
  $('inbox-btn').disabled = false;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function init() {
  // Load stored app URL
  const stored = await chrome.storage.local.get('appUrl');
  const appUrl = (stored.appUrl || '').replace(/\/$/, '') || DEFAULT_APP_URL;
  $('app-url-display').textContent = new URL(appUrl).hostname;

  // Check if app URL is configured (only show setup if explicitly cleared)
  const isConfigured = !!stored.appUrl || true; // default URL counts as configured
  if (!isConfigured) {
    showSetupState();
    return;
  }

  // Get current tab
  let tab;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
  } catch {
    showErrorState('Could not read the current tab.');
    return;
  }

  if (!tab || !isClippable(tab.url)) {
    showErrorState('This page cannot be clipped. Navigate to a travel website and try again.');
    return;
  }

  // Populate preview
  const title = tab.title || tab.url;
  const url = tab.url;
  const { id: platformId, label: platformLabel } = detectPlatform(url);

  const badge = $('platform-badge');
  badge.textContent = platformLabel;
  badge.className = `page-platform platform-${platformId}`;

  $('page-title').textContent = title;
  $('page-url').textContent = url;

  enableActions();

  // ── Save with board picker (opens share page in new tab) ─────────────────────
  $('save-btn').addEventListener('click', () => {
    const shareUrl = buildShareUrl(appUrl, url, title, false);
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // ── Quick save to Inbox (opens share page pre-seeded, auto-saves) ─────────────
  $('inbox-btn').addEventListener('click', () => {
    const shareUrl = buildShareUrl(appUrl, url, title, true);
    chrome.tabs.create({ url: shareUrl });
    window.close();
  });

  // ── Settings ──────────────────────────────────────────────────────────────────
  $('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ── Setup button ─────────────────────────────────────────────────────────────
  $('setup-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function buildShareUrl(appUrl, pageUrl, pageTitle, autoInbox) {
  const params = new URLSearchParams({
    url: pageUrl,
    title: pageTitle,
    source: 'extension',
  });
  if (autoInbox) params.set('auto', 'inbox');
  return `${appUrl}/share?${params.toString()}`;
}

document.addEventListener('DOMContentLoaded', init);
