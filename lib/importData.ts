'use client';

import { saveItem, saveBoard, saveTrip, getItemById, getBoardById, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

// Shape we expect from a TravelPanel backup JSON
interface TravelPanelBackup {
  version: string;
  app: string;
  exportedAt?: string;
  data: {
    items?: unknown[];
    boards?: unknown[];
    trips?: unknown[];
  };
}

export interface ImportSummary {
  itemsImported: number;
  boardsImported: number;
  tripsImported: number;
  itemsSkipped: number;
  boardsSkipped: number;
  tripsSkipped: number;
  errors: string[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Validates that an item has the minimum required shape
function isValidItem(v: unknown): v is SavedItem {
  if (!isObject(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.url === 'string' &&
    typeof v.title === 'string' &&
    typeof v.savedAt === 'number'
  );
}

function isValidBoard(v: unknown): v is Board {
  if (!isObject(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.itemIds)
  );
}

function isValidTrip(v: unknown): v is Trip {
  if (!isObject(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.boardId === 'string' &&
    typeof v.days === 'number'
  );
}

// Parse and validate a backup file from a FileReader result
export function parseBackupFile(json: string): TravelPanelBackup {
  const parsed = JSON.parse(json); // throws on invalid JSON
  if (!isObject(parsed)) throw new Error('Backup file is not a JSON object');
  if (!isObject(parsed.data)) throw new Error('Backup file is missing "data" field');
  return parsed as TravelPanelBackup;
}

// Import all items/boards/trips, skipping IDs that already exist (idempotent)
export async function importBackup(backup: TravelPanelBackup): Promise<ImportSummary> {
  const summary: ImportSummary = {
    itemsImported: 0, boardsImported: 0, tripsImported: 0,
    itemsSkipped: 0, boardsSkipped: 0, tripsSkipped: 0,
    errors: [],
  };

  const { items = [], boards = [], trips = [] } = backup.data;

  // Items
  for (const raw of items) {
    if (!isValidItem(raw)) {
      summary.errors.push(`Skipped invalid item: ${JSON.stringify(raw).slice(0, 80)}`);
      continue;
    }
    try {
      const existing = await getItemById(raw.id);
      if (existing) {
        summary.itemsSkipped++;
        continue;
      }
      // Ensure required fields have safe defaults
      const item: SavedItem = {
        locations: [],
        activities: [],
        tags: [],
        substance: [],
        enrichmentStatus: 'done',
        retryCount: 0,
        platform: 'other',
        description: '',
        ...raw,
      };
      await saveItem(item);
      summary.itemsImported++;
    } catch (e) {
      summary.errors.push(`Failed to import item ${raw.id}: ${e}`);
    }
  }

  // Boards
  for (const raw of boards) {
    if (!isValidBoard(raw)) {
      summary.errors.push(`Skipped invalid board: ${JSON.stringify(raw).slice(0, 80)}`);
      continue;
    }
    try {
      const existing = await getBoardById(raw.id);
      if (existing) {
        summary.boardsSkipped++;
        continue;
      }
      const board: Board = {
        emoji: '🗺',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...raw,
      };
      await saveBoard(board);
      summary.boardsImported++;
    } catch (e) {
      summary.errors.push(`Failed to import board ${raw.id}: ${e}`);
    }
  }

  // Trips
  for (const raw of trips) {
    if (!isValidTrip(raw)) {
      summary.errors.push(`Skipped invalid trip: ${JSON.stringify(raw).slice(0, 80)}`);
      continue;
    }
    try {
      const existing = await getTripsForBoard(raw.boardId);
      if (existing.some((t) => t.id === raw.id)) {
        summary.tripsSkipped++;
        continue;
      }
      const trip: Trip = {
        agentSteps: [],
        plan: null,
        preferences: '',
        boardName: '',
        name: undefined,
        createdAt: Date.now(),
        ...raw,
      };
      await saveTrip(trip);
      summary.tripsImported++;
    } catch (e) {
      summary.errors.push(`Failed to import trip ${raw.id}: ${e}`);
    }
  }

  return summary;
}
