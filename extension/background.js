// src/storage.ts
function detectPlatform(url) {
  if (url.includes("xiaohongshu.com") || url.includes("xhslink.com"))
    return "xiaohongshu";
  if (url.includes("weixin.qq.com") || url.includes("mp.weixin.qq.com"))
    return "wechat";
  if (url.includes("douyin.com") || url.includes("tiktok.com"))
    return "douyin";
  if (url.includes("bilibili.com"))
    return "bilibili";
  return "other";
}
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// src/background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "clip-page",
    title: "Clip to TravelPanel",
    contexts: ["page"]
  });
  chrome.contextMenus.create({
    id: "clip-link",
    title: "Clip this link to TravelPanel",
    contexts: ["link"]
  });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.menuItemId === "clip-link" ? info.linkUrl : tab?.url;
  if (!url)
    return;
  const { settings } = await chrome.storage.sync.get("settings");
  if (!settings?.apiBaseUrl) {
    chrome.notifications.create("needs-setup", {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "TravelPanel Clipper",
      message: "Click the extension icon and enter your TravelPanel URL to get started."
    });
    return;
  }
  const clipId = generateId();
  const title = info.menuItemId === "clip-link" ? info.selectionText || url : tab?.title || url;
  const clip = {
    id: clipId,
    url,
    platform: detectPlatform(url),
    title,
    description: "",
    locations: [],
    activities: [],
    tags: [],
    substance: [],
    savedAt: Date.now(),
    enrichmentStatus: "pending",
    retryCount: 0,
    boardId: void 0
  };
  const { clips = [] } = await chrome.storage.local.get("clips");
  await chrome.storage.local.set({ clips: [clip, ...clips] });
  chrome.notifications.create(`clip-${clipId}`, {
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "TravelPanel \u2014 Clipping\u2026",
    message: `Extracting spots and tips from "${title.slice(0, 60)}"`
  });
  try {
    const res = await fetch(`${settings.apiBaseUrl}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    if (!res.ok)
      throw new Error(`${res.status}`);
    const data = await res.json();
    const { clips: current = [] } = await chrome.storage.local.get("clips");
    const idx = current.findIndex((c) => c.id === clipId);
    if (idx >= 0) {
      current[idx] = {
        ...current[idx],
        title: data.title || clip.title,
        description: data.description || "",
        thumbnail: data.thumbnail,
        platform: data.platform || clip.platform,
        locations: data.locations ?? [],
        activities: data.activities ?? [],
        tags: data.tags ?? [],
        substance: data.substance ?? [],
        enrichmentStatus: "done"
      };
      await chrome.storage.local.set({ clips: current });
    }
    const locs = (data.locations ?? []).length;
    const subs = (data.substance ?? []).length;
    chrome.notifications.create(`done-${clipId}`, {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "TravelPanel \u2014 Clipped!",
      message: `${locs} spot${locs !== 1 ? "s" : ""}, ${subs} tip${subs !== 1 ? "s" : ""} extracted`
    });
  } catch {
    chrome.notifications.create(`fail-${clipId}`, {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "TravelPanel \u2014 Saved",
      message: "Clip saved. AI extraction will retry when TravelPanel opens."
    });
  }
});
