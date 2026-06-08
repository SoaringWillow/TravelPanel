'use strict';

// Content script: extracts rich page metadata and responds to the popup.

function getMetaContent(name) {
  const selectors = [
    `meta[property="${name}"]`,
    `meta[name="${name}"]`,
    `meta[itemprop="${name}"]`,
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.content) return el.content;
  }
  return '';
}

function extractMeta() {
  const url = window.location.href;

  const title =
    getMetaContent('og:title') ||
    getMetaContent('twitter:title') ||
    document.title ||
    '';

  const description =
    getMetaContent('og:description') ||
    getMetaContent('description') ||
    getMetaContent('twitter:description') ||
    '';

  const image =
    getMetaContent('og:image') ||
    getMetaContent('twitter:image') ||
    getMetaContent('twitter:image:src') ||
    '';

  return { url, title, description, image };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_META') {
    sendResponse(extractMeta());
  }
  return false;
});
