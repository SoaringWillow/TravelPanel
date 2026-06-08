// Content script — runs in page context.
// The popup uses chrome.scripting.executeScript with an injected function
// instead of messaging, so this file is intentionally minimal.
// It exists so the manifest declares content_scripts, enabling
// scripting.executeScript to target any page.
