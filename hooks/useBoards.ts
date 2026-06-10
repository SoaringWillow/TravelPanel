'use client';
import { useState, useEffect, useCallback } from 'react';
import { Board } from '@/lib/types';
import {
  getAllBoards,
  saveBoard,
  deleteBoard,
  renameBoard as dbRenameBoard,
  addItemToBoard as dbAddItemToBoard,
  removeItemFromBoard as dbRemoveItemFromBoard,
} from '@/lib/db';
import { track } from '@/lib/analytics';

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllBoards().then((fetchedBoards) => {
      setBoards(fetchedBoards);
      setLoading(false);
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
    setBoards((prev) => [board, ...prev]);
    return board;
  }, []);

  const removeBoard = useCallback(async (id: string): Promise<void> => {
    await deleteBoard(id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const renameBoard = useCallback(async (id: string, name: string): Promise<void> => {
    await dbRenameBoard(id, name);
    setBoards((prev) =>
      prev.map((b) => b.id === id ? { ...b, name: name.trim(), updatedAt: Date.now() } : b)
    );
  }, []);

  const moveItemToBoard = useCallback(async (boardId: string, itemId: string): Promise<void> => {
    await dbAddItemToBoard(boardId, itemId);
  }, []);

  const removeItemFromBoard = useCallback(async (boardId: string, itemId: string): Promise<void> => {
    await dbRemoveItemFromBoard(boardId, itemId);
  }, []);

  const refresh = useCallback(async () => {
    const fetchedBoards = await getAllBoards();
    setBoards(fetchedBoards);
  }, []);

  return { boards, loading, createBoard, removeBoard, renameBoard, moveItemToBoard, removeItemFromBoard, refresh };
}
