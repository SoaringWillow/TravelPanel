'use client';

import { saveItem, addItemToBoard, getAllBoards } from './db';
import type { SavedItem } from './types';

let initialized = false;

export async function initExtensionBridge() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  // Publish current board list so the extension can read it
  await syncBoardsToStorage();

  // Process any clip that was written to localStorage before the app mounted
  const pending = localStorage.getItem('travelpanel:incoming-clip');
  if (pending) {
    try {
      const clip: SavedItem = JSON.parse(pending);
      await persistClip(clip);
    } catch (_) {}
    localStorage.removeItem('travelpanel:incoming-clip');
  }

  // Live delivery: extension injects a custom event after the app is mounted
  window.addEventListener('travelpanel:incoming-clip', async (e: Event) => {
    const clip = (e as CustomEvent<SavedItem>).detail;
    if (!clip?.id || !clip?.url) return;
    await persistClip(clip);
    localStorage.removeItem('travelpanel:incoming-clip');
  });
}

async function persistClip(clip: SavedItem) {
  try {
    await saveItem(clip);
    if (clip.boardId) {
      await addItemToBoard(clip.boardId, clip.id);
    }
    // Refresh board list after save
    await syncBoardsToStorage();
    // Signal the UI to refresh (any page listening can respond)
    window.dispatchEvent(new CustomEvent('travelpanel:clip-saved', { detail: clip }));
  } catch (err) {
    console.error('[ExtensionBridge] Failed to persist clip:', err);
  }
}

export async function syncBoardsToStorage() {
  try {
    const boards = await getAllBoards();
    localStorage.setItem('travelpanel:boards', JSON.stringify(boards));
  } catch (_) {}
}
