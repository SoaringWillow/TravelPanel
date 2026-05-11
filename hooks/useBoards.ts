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
    setBoards((prev) => [board, ...prev]);
    return board;
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

  return { boards, loading, createBoard, removeBoard, moveItemToBoard, removeItemFromBoard };
}
