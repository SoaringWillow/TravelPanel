"use strict";
(() => {
  // src/storage.ts
  var KEYS = {
    CLIPS: "clips",
    BOARDS: "boards",
    SETTINGS: "settings"
  };
  async function getSettings() {
    const result = await chrome.storage.sync.get(KEYS.SETTINGS);
    return result[KEYS.SETTINGS] ?? null;
  }
  async function saveSettings(settings) {
    await chrome.storage.sync.set({ [KEYS.SETTINGS]: settings });
  }
  async function getBoards() {
    const result = await chrome.storage.local.get(KEYS.BOARDS);
    return result[KEYS.BOARDS] ?? [];
  }
  async function saveBoard(board) {
    const boards = await getBoards();
    const idx = boards.findIndex((b) => b.id === board.id);
    if (idx >= 0) {
      boards[idx] = board;
    } else {
      boards.push(board);
    }
    await chrome.storage.local.set({ [KEYS.BOARDS]: boards });
  }
  async function getClips() {
    const result = await chrome.storage.local.get(KEYS.CLIPS);
    return result[KEYS.CLIPS] ?? [];
  }
  async function saveClip(clip) {
    const clips = await getClips();
    const idx = clips.findIndex((c) => c.id === clip.id);
    if (idx >= 0) {
      clips[idx] = clip;
    } else {
      clips.unshift(clip);
    }
    await chrome.storage.local.set({ [KEYS.CLIPS]: clips });
  }
  async function addClipToBoard(boardId, clipId) {
    const boards = await getBoards();
    const board = boards.find((b) => b.id === boardId);
    if (!board)
      return;
    if (!board.clipIds.includes(clipId)) {
      board.clipIds.unshift(clipId);
      await saveBoard(board);
    }
  }
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

  // src/popup.ts
  var currentPageInfo = null;
  var selectedBoardId = void 0;
  var apiBaseUrl = "";
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((el2) => {
      el2.classList.toggle("hidden", el2.id !== id);
    });
  }
  function el(id) {
    return document.getElementById(id);
  }
  async function init() {
    showScreen("loading");
    const settings = await getSettings();
    if (!settings?.apiBaseUrl) {
      showScreen("setup");
      initSetupScreen();
      return;
    }
    apiBaseUrl = settings.apiBaseUrl;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
      showError("Could not get the current page URL.");
      return;
    }
    currentPageInfo = {
      url: tab.url,
      title: tab.title || tab.url,
      favIconUrl: tab.favIconUrl
    };
    initMainScreen();
  }
  function initSetupScreen() {
    const input = el("api-url-input");
    const btn = el("save-settings-btn");
    btn.addEventListener("click", async () => {
      const url = input.value.trim().replace(/\/$/, "");
      if (!url)
        return;
      await saveSettings({ apiBaseUrl: url });
      apiBaseUrl = url;
      initMainScreen();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        btn.click();
    });
  }
  async function initMainScreen() {
    if (!currentPageInfo) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentPageInfo = {
        url: tab?.url || "",
        title: tab?.title || "",
        favIconUrl: tab?.favIconUrl
      };
    }
    showScreen("main");
    const favicon = el("page-favicon");
    const titleEl = el("page-title");
    const urlEl = el("page-url");
    if (currentPageInfo.favIconUrl) {
      favicon.src = currentPageInfo.favIconUrl;
      favicon.onerror = () => {
        favicon.style.display = "none";
      };
    } else {
      favicon.style.display = "none";
    }
    titleEl.textContent = currentPageInfo.title || currentPageInfo.url;
    try {
      const u = new URL(currentPageInfo.url);
      const path = u.pathname.length > 1 ? u.pathname.slice(0, 28) + (u.pathname.length > 28 ? "\u2026" : "") : "";
      urlEl.textContent = u.hostname + path;
    } catch {
      urlEl.textContent = currentPageInfo.url.slice(0, 40);
    }
    const openLink = el("open-app-link");
    openLink.href = `${apiBaseUrl}/share?url=${encodeURIComponent(currentPageInfo.url)}&title=${encodeURIComponent(currentPageInfo.title || "")}`;
    await renderBoards();
    el("new-board-btn").addEventListener("click", () => {
      const form = el("new-board-form");
      const isHidden = form.classList.contains("hidden");
      form.classList.toggle("hidden", !isHidden);
      if (isHidden)
        el("new-board-name").focus();
    });
    el("create-board-btn").addEventListener("click", createBoard);
    el("new-board-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        el("create-board-btn").click();
    });
    el("clip-btn").addEventListener("click", handleClip);
    el("settings-btn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  }
  async function renderBoards(selectId) {
    const boards = await getBoards();
    const list = el("board-list");
    list.innerHTML = "";
    const inbox = makeBoardItem(void 0, "\u{1F4E5}", "Inbox");
    list.appendChild(inbox);
    boards.forEach((b) => list.appendChild(makeBoardItem(b.id, b.emoji, b.name)));
    const target = selectId ?? selectedBoardId;
    if (target) {
      selectBoard(target);
    } else {
      inbox.classList.add("selected");
      selectedBoardId = void 0;
    }
  }
  function makeBoardItem(id, emoji, name) {
    const item = document.createElement("div");
    item.className = "board-item";
    item.dataset.boardId = id ?? "";
    item.innerHTML = `<span class="board-emoji">${emoji}</span><span class="board-name">${escapeHtml(name)}</span>`;
    item.addEventListener("click", () => selectBoard(id));
    return item;
  }
  function selectBoard(id) {
    selectedBoardId = id;
    document.querySelectorAll(".board-item").forEach((item) => {
      item.classList.toggle("selected", (item.dataset.boardId || void 0) === (id ?? ""));
    });
  }
  async function createBoard() {
    const input = el("new-board-name");
    const name = input.value.trim();
    if (!name)
      return;
    const board = {
      id: generateId(),
      name,
      emoji: pickEmoji(name),
      clipIds: [],
      createdAt: Date.now()
    };
    await saveBoard(board);
    input.value = "";
    el("new-board-form").classList.add("hidden");
    await renderBoards(board.id);
  }
  function pickEmoji(name) {
    const lower = name.toLowerCase();
    if (/japan|tokyo|kyoto|osaka/.test(lower))
      return "\u{1F5FC}";
    if (/paris|france|europe/.test(lower))
      return "\u{1F5FC}";
    if (/beach|island|bali|hawaii/.test(lower))
      return "\u{1F3D6}\uFE0F";
    if (/mountain|hiking|trek/.test(lower))
      return "\u{1F3D4}\uFE0F";
    if (/food|eat|cafe|restaurant/.test(lower))
      return "\u{1F35C}";
    if (/city|urban|metro/.test(lower))
      return "\u{1F306}";
    return "\u{1F4CD}";
  }
  async function handleClip() {
    if (!currentPageInfo?.url)
      return;
    showScreen("saving");
    const clipId = generateId();
    const clip = {
      id: clipId,
      url: currentPageInfo.url,
      platform: detectPlatform(currentPageInfo.url),
      title: currentPageInfo.title || currentPageInfo.url,
      description: "",
      locations: [],
      activities: [],
      tags: [],
      substance: [],
      savedAt: Date.now(),
      enrichmentStatus: "pending",
      retryCount: 0,
      boardId: selectedBoardId
    };
    await saveClip(clip);
    if (selectedBoardId)
      await addClipToBoard(selectedBoardId, clipId);
    try {
      const res = await fetch(`${apiBaseUrl}/api/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentPageInfo.url }),
        signal: AbortSignal.timeout(3e4)
      });
      if (!res.ok)
        throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      await saveClip({
        ...clip,
        title: data.title || clip.title,
        description: data.description || "",
        thumbnail: data.thumbnail,
        platform: data.platform || clip.platform,
        locations: data.locations ?? [],
        activities: data.activities ?? [],
        tags: data.tags ?? [],
        substance: data.substance ?? [],
        enrichmentStatus: "done"
      });
      const boards = await getBoards();
      const boardName = selectedBoardId ? boards.find((b) => b.id === selectedBoardId)?.name ?? "board" : "Inbox";
      el("success-detail").textContent = `Saved to ${boardName}`;
      const locs = (data.locations ?? []).length;
      const subs = (data.substance ?? []).length;
      if (locs > 0 || subs > 0) {
        el("success-stats").classList.remove("hidden");
        el("location-count").textContent = `\u{1F4CD} ${locs} ${locs === 1 ? "spot" : "spots"}`;
        el("substance-count").textContent = `\u{1F4A1} ${subs} ${subs === 1 ? "tip" : "tips"}`;
      }
      showScreen("success");
      setTimeout(() => window.close(), 2500);
    } catch (err) {
      el("error-message").textContent = err instanceof Error && err.name !== "TimeoutError" ? `Could not reach TravelPanel: ${err.message}` : "Request timed out. The clip was saved and will retry when the app opens.";
      showScreen("error");
      el("retry-btn").addEventListener("click", () => handleClip(), { once: true });
      el("save-anyway-btn").addEventListener("click", () => {
        el("success-detail").textContent = "Saved \u2014 will extract info when TravelPanel opens";
        el("success-stats").classList.add("hidden");
        showScreen("success");
        setTimeout(() => window.close(), 2e3);
      }, { once: true });
    }
  }
  function showError(msg) {
    el("error-message").textContent = msg;
    showScreen("error");
  }
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  init();
})();
