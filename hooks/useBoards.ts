'use client';
import { useState, useEffect, useCallback } from 'react';
import { Board } from '@/lib/types';
import {
  getAllBoards,
  saveBoard,
  updateBoard as dbUpdateBoard,
  deleteBoard,
  addItemToBoard as dbAddItemToBoard,
  removeItemFromBoard as dbRemoveItemFromBoard,
} from '@/lib/db';
import { track } from '@/lib/analytics';

async function syncBoardsToAppGroup(boards: Board[]) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const payload = boards.slice(0, 8).map((b) => ({ id: b.id, name: b.name, emoji: b.emoji }));
    await Preferences.set({ key: 'recentBoards', value: JSON.stringify(payload) });
  } catch {
    // Not in Capacitor — silently skip
  }
}

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllBoards().then((fetchedBoards) => {
      setBoards(fetchedBoards);
      setLoading(false);
      syncBoardsToAppGroup(fetchedBoards);
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
      syncBoardsToAppGroup(next);
      return next;
    });
    return board;
  }, []);

  const editBoard = useCallback(async (id: string, patch: Partial<Pick<Board, 'name' | 'emoji'>>): Promise<void> => {
    await dbUpdateBoard(id, patch);
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b));
  }, []);

  const removeBoard = useCallback(async (id: string): Promise<void> => {
    await deleteBoard(id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const moveItemToBoard = useCallback(async (boardId: string, itemId: string): Promise<void> => {
    await dbAddItemToBoard(boardId, itemId);
  }, []);

  const removeItemFromBoard = useCallback(async (boardId: string, itemId: string): Promise<void> => {
    await dbRemoveItemFromBoard(boardId, itemId);
  }, []);

  return { boards, loading, createBoard, editBoard, removeBoard, moveItemToBoard, removeItemFromBoard };
}
