import { detectPlatform, generateId } from './storage';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to TravelPanel',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Clip this link to TravelPanel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.menuItemId === 'clip-link' ? info.linkUrl : tab?.url;
  if (!url) return;

  const { settings } = await chrome.storage.sync.get('settings') as { settings?: { apiBaseUrl: string } };
  if (!settings?.apiBaseUrl) {
    // Show notification to configure the extension
    chrome.notifications.create('needs-setup', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'TravelPanel Clipper',
      message: 'Click the extension icon and enter your TravelPanel URL to get started.',
    });
    return;
  }

  const clipId = generateId();
  const title = info.menuItemId === 'clip-link'
    ? (info.selectionText || url)
    : (tab?.title || url);

  const clip = {
    id: clipId,
    url,
    platform: detectPlatform(url),
    title,
    description: '',
    locations: [],
    activities: [],
    tags: [],
    substance: [],
    savedAt: Date.now(),
    enrichmentStatus: 'pending',
    retryCount: 0,
    boardId: undefined,
  };

  const { clips = [] } = await chrome.storage.local.get('clips') as { clips?: object[] };
  await chrome.storage.local.set({ clips: [clip, ...clips] });

  chrome.notifications.create(`clip-${clipId}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'TravelPanel — Clipping…',
    message: `Extracting spots and tips from "${title.slice(0, 60)}"`,
  });

  try {
    const res = await fetch(`${settings.apiBaseUrl}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();

    const { clips: current = [] } = await chrome.storage.local.get('clips') as { clips?: typeof clip[] };
    const idx = current.findIndex(c => c.id === clipId);
    if (idx >= 0) {
      current[idx] = {
        ...current[idx],
        title: data.title || clip.title,
        description: data.description || '',
        thumbnail: data.thumbnail,
        platform: data.platform || clip.platform,
        locations: data.locations ?? [],
        activities: data.activities ?? [],
        tags: data.tags ?? [],
        substance: data.substance ?? [],
        enrichmentStatus: 'done',
      };
      await chrome.storage.local.set({ clips: current });
    }

    const locs = (data.locations ?? []).length;
    const subs = (data.substance ?? []).length;

    chrome.notifications.create(`done-${clipId}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'TravelPanel — Clipped!',
      message: `${locs} spot${locs !== 1 ? 's' : ''}, ${subs} tip${subs !== 1 ? 's' : ''} extracted`,
    });

  } catch {
    // Clip already saved as pending — it retries when the app opens
    chrome.notifications.create(`fail-${clipId}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'TravelPanel — Saved',
      message: 'Clip saved. AI extraction will retry when TravelPanel opens.',
    });
  }
});
