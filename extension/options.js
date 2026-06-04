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

  // src/options.ts
  async function init() {
    const settings = await getSettings();
    const input = document.getElementById("api-url");
    const saveBtn = document.getElementById("save-btn");
    const statusEl = document.getElementById("status");
    if (settings?.apiBaseUrl) {
      input.value = settings.apiBaseUrl;
    }
    saveBtn.addEventListener("click", async () => {
      const url = input.value.trim().replace(/\/$/, "");
      if (!url) {
        statusEl.textContent = "Please enter a URL.";
        statusEl.className = "status error";
        return;
      }
      try {
        new URL(url);
      } catch {
        statusEl.textContent = "Enter a valid URL (e.g. https://your-app.vercel.app)";
        statusEl.className = "status error";
        return;
      }
      await saveSettings({ apiBaseUrl: url });
      statusEl.textContent = "Saved!";
      statusEl.className = "status success";
      setTimeout(() => {
        statusEl.textContent = "";
        statusEl.className = "status";
      }, 2e3);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        saveBtn.click();
    });
  }
  init();
})();
