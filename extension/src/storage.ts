import type { SavedClip, Board, ExtensionSettings, Platform } from './types';

const KEYS = {
  CLIPS: 'clips',
  BOARDS: 'boards',
  SETTINGS: 'settings',
} as const;

export async function getSettings(): Promise<ExtensionSettings | null> {
  const result = await chrome.storage.sync.get(KEYS.SETTINGS);
  return (result[KEYS.SETTINGS] as ExtensionSettings) ?? null;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set({ [KEYS.SETTINGS]: settings });
}

export async function getBoards(): Promise<Board[]> {
  const result = await chrome.storage.local.get(KEYS.BOARDS);
  return (result[KEYS.BOARDS] as Board[]) ?? [];
}

export async function saveBoard(board: Board): Promise<void> {
  const boards = await getBoards();
  const idx = boards.findIndex(b => b.id === board.id);
  if (idx >= 0) {
    boards[idx] = board;
  } else {
    boards.push(board);
  }
  await chrome.storage.local.set({ [KEYS.BOARDS]: boards });
}

export async function getClips(): Promise<SavedClip[]> {
  const result = await chrome.storage.local.get(KEYS.CLIPS);
  return (result[KEYS.CLIPS] as SavedClip[]) ?? [];
}

export async function saveClip(clip: SavedClip): Promise<void> {
  const clips = await getClips();
  const idx = clips.findIndex(c => c.id === clip.id);
  if (idx >= 0) {
    clips[idx] = clip;
  } else {
    clips.unshift(clip);
  }
  await chrome.storage.local.set({ [KEYS.CLIPS]: clips });
}

export async function addClipToBoard(boardId: string, clipId: string): Promise<void> {
  const boards = await getBoards();
  const board = boards.find(b => b.id === boardId);
  if (!board) return;
  if (!board.clipIds.includes(clipId)) {
    board.clipIds.unshift(clipId);
    await saveBoard(board);
  }
}

export function detectPlatform(url: string): Platform {
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin.qq.com')) return 'wechat';
  if (url.includes('douyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com')) return 'bilibili';
  return 'other';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
