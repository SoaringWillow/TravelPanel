import { saveItem, saveBoard } from './db';
import { SavedItem, Board } from './types';

export interface ImportResult {
  clipsRestored: number;
  boardsRestored: number;
  clipsSkipped: number;
  boardsSkipped: number;
  errors: string[];
}

// Minimal validation that a value looks like a SavedItem
function isValidItem(v: unknown): v is SavedItem {
  if (!v || typeof v !== 'object') return false;
  const item = v as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.url === 'string' &&
    typeof item.title === 'string' &&
    typeof item.savedAt === 'number'
  );
}

// Minimal validation that a value looks like a Board
function isValidBoard(v: unknown): v is Board {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    typeof b.name === 'string' &&
    Array.isArray(b.itemIds)
  );
}

export async function restoreFromJSON(json: string): Promise<ImportResult> {
  const result: ImportResult = {
    clipsRestored:  0,
    boardsRestored: 0,
    clipsSkipped:   0,
    boardsSkipped:  0,
    errors:         [],
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    result.errors.push('File is not valid JSON.');
    return result;
  }

  if (!parsed || typeof parsed !== 'object') {
    result.errors.push('Unexpected file format.');
    return result;
  }

  const data = parsed as Record<string, unknown>;

  // Restore items
  const rawItems = Array.isArray(data.items) ? data.items : [];
  for (const raw of rawItems) {
    if (!isValidItem(raw)) {
      result.clipsSkipped++;
      continue;
    }
    try {
      // Ensure required fields have safe defaults for older export versions
      const item: SavedItem = {
        substance:       [],
        activities:      [],
        tags:            [],
        locations:       [],
        enrichmentStatus: 'done',
        retryCount:      0,
        description:     '',
        ...raw,
      };
      await saveItem(item);
      result.clipsRestored++;
    } catch {
      result.clipsSkipped++;
    }
  }

  // Restore boards
  const rawBoards = Array.isArray(data.boards) ? data.boards : [];
  for (const raw of rawBoards) {
    if (!isValidBoard(raw)) {
      result.boardsSkipped++;
      continue;
    }
    try {
      const board: Board = {
        emoji:     '🗺',
        itemIds:   [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...raw,
      };
      await saveBoard(board);
      result.boardsRestored++;
    } catch {
      result.boardsSkipped++;
    }
  }

  return result;
}
