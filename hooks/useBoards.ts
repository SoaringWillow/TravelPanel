'use client';
import { useState, useEffect, useCallback } from 'react';
import { Board } from '@/lib/types';
import {
  getAllBoards,
  saveBoard,
  deleteBoard,
  addItemToBoard as dbAddItemToBoard,
  removeItemFromBoard as dbRemoveItemFromBoard,
} from '@/lib/db';
import { track } from '@/lib/analytics';

// Mirror board summaries to App Group so the iOS Share Extension can show a picker
async function mirrorBoardsToAppGroup(boards: Board[]) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const summaries = boards.map((b) => ({ id: b.id, name: b.name, emoji: b.emoji }));
    await Preferences.set({ key: 'savedBoards', value: JSON.stringify(summaries) });
  } catch {
    // Not on native — no-op
  }
}

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllBoards().then((fetchedBoards) => {
      setBoards(fetchedBoards);
      setLoading(false);
      mirrorBoardsToAppGroup(fetchedBoards);
    });
  }, []);

  const createBoard = useCallback(async (name: string, emoji: string): Promise<Board> => {
    const now = Date.now();
    const board: Board = {
      id: crypto.randomUUID(),
      name,
      emoji,
      itemIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveBoard(board);
    track('board_created');
    setBoards((prev) => {
      const next = [board, ...prev];
      mirrorBoardsToAppGroup(next);
      return next;
    });
    return board;
  }, []);

  const removeBoard = useCallback(async (id: string): Promise<void> => {
    await deleteBoard(id);
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== id);
      mirrorBoardsToAppGroup(next);
      return next;
    });
  }, []);

  const moveItemToBoard = useCallback(async (boardId: string, itemId: string): Promise<void> => {
    await dbAddItemToBoard(boardId, itemId);
  }, []);

  const removeItemFromBoard = useCallback(async (boardId: string, itemId: string): Promise<void> => {
    await dbRemoveItemFromBoard(boardId, itemId);
  }, []);

  return { boards, loading, createBoard, removeBoard, moveItemToBoard, removeItemFromBoard };
}
