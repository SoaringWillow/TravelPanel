'use strict';

// ── Platform detection (mirrors lib/parse-url.ts + adds common social platforms) ──

const PLATFORMS = [
  { match: ['instagram.com', 'instagr.am'],           label: 'Instagram',        color: '#E1306C' },
  { match: ['youtube.com', 'youtu.be'],               label: 'YouTube',           color: '#FF0000' },
  { match: ['xiaohongshu.com', 'xhslink.com', 'xhs.link'], label: 'Little Red Book', color: '#FF2442' },
  { match: ['douyin.com', 'iesdouyin.com', 'tiktok.com'],   label: 'Douyin / TikTok', color: '#161823' },
  { match: ['bilibili.com', 'b23.tv'],                label: 'Bilibili',          color: '#00AEEC' },
  { match: ['weixin.qq.com', 'mp.weixin'],            label: 'WeChat',            color: '#07C160' },
  { match: ['twitter.com', 'x.com'],                  label: 'X / Twitter',       color: '#000000' },
  { match: ['pinterest.com'],                         label: 'Pinterest',         color: '#E60023' },
  { match: ['tripadvisor.com'],                       label: 'TripAdvisor',       color: '#34E0A1' },
  { match: ['maps.google.com', 'goo.gl/maps'],        label: 'Google Maps',       color: '#4285F4' },
];

const DEFAULT_PLATFORM = { label: 'Web Page', color: '#6366F1' };
const DEFAULT_URL_KEY = 'travelPanelUrl';
const DEFAULT_URL_PLACEHOLDER = 'https://your-app.vercel.app';

function detectPlatform(url) {
  if (!url) return DEFAULT_PLATFORM;
  for (const p of PLATFORMS) {
    if (p.match.some((fragment) => url.includes(fragment))) {
      return { label: p.label, color: p.color };
    }
  }
  return DEFAULT_PLATFORM;
}

// ── State ────────────────────────────────────────────────────────────────────

let currentTab = null;

// ── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const els = {
  platformBadge:      $('platformBadge'),
  pageTitle:          $('pageTitle'),
  pageUrl:            $('pageUrl'),
  saveBtn:            $('saveBtn'),
  mainContent:        $('mainContent'),
  successState:       $('successState'),
  successSub:         $('successSub'),
  settingsToggle:     $('settingsToggle'),
  settingsPanel:      $('settingsPanel'),
  travelPanelUrlInput:$('travelPanelUrlInput'),
  saveSettingsBtn:    $('saveSettingsBtn'),
  configWarning:      $('configWarning'),
};

// ── Initialise ───────────────────────────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const platform = detectPlatform(tab.url || '');
  els.platformBadge.textContent = platform.label;
  els.platformBadge.style.backgroundColor = platform.color;

  els.pageTitle.textContent = tab.title || 'Untitled page';
  els.pageUrl.textContent   = tab.url   || '';

  const stored = await chrome.storage.sync.get({ [DEFAULT_URL_KEY]: '' });
  const savedUrl = stored[DEFAULT_URL_KEY];

  els.travelPanelUrlInput.value = savedUrl;

  if (!savedUrl) {
    els.configWarning.classList.add('visible');
    els.saveBtn.disabled = true;
  }
}

// ── Save clip ────────────────────────────────────────────────────────────────

els.saveBtn.addEventListener('click', async () => {
  if (!currentTab) return;

  const stored = await chrome.storage.sync.get({ [DEFAULT_URL_KEY]: '' });
  const base   = stored[DEFAULT_URL_KEY].replace(/\/+$/, '');

  if (!base) {
    els.settingsPanel.classList.add('visible');
    els.travelPanelUrlInput.focus();
    return;
  }

  const shareUrl = `${base}/share?url=${encodeURIComponent(currentTab.url || '')}&title=${encodeURIComponent(currentTab.title || '')}`;

  chrome.tabs.create({ url: shareUrl });

  showSuccess();
});

function showSuccess() {
  els.mainContent.style.display = 'none';
  els.settingsPanel.classList.remove('visible');
  els.successState.classList.add('visible');
  setTimeout(() => window.close(), 2000);
}

// ── Settings toggle ──────────────────────────────────────────────────────────

els.settingsToggle.addEventListener('click', () => {
  const open = els.settingsPanel.classList.toggle('visible');
  if (open) els.travelPanelUrlInput.focus();
});

// ── Save settings ────────────────────────────────────────────────────────────

els.saveSettingsBtn.addEventListener('click', saveSettings);
els.travelPanelUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveSettings();
});

async function saveSettings() {
  let url = els.travelPanelUrlInput.value.trim().replace(/\/+$/, '');
  if (!url) return;

  // Ensure protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    els.travelPanelUrlInput.value = url;
  }

  await chrome.storage.sync.set({ [DEFAULT_URL_KEY]: url });

  // Re-enable save button now that URL is set
  els.saveBtn.disabled = false;
  els.configWarning.classList.remove('visible');

  // Flash button
  els.saveSettingsBtn.textContent = 'Saved ✓';
  els.saveSettingsBtn.classList.add('saved');
  setTimeout(() => {
    els.saveSettingsBtn.textContent = 'Save';
    els.saveSettingsBtn.classList.remove('saved');
    els.settingsPanel.classList.remove('visible');
  }, 1200);
}

// ── Boot ─────────────────────────────────────────────────────────────────────

init().catch(console.error);
