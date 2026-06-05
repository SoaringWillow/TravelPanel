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
import { hapticImpact } from '@/lib/haptics';

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
    hapticImpact('medium');
    setBoards((prev) => [board, ...prev]);
    return board;
  }, []);

  const removeBoard = useCallback(async (id: string): Promise<void> => {
    await deleteBoard(id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const editBoard = useCallback(async (id: string, name: string, emoji: string): Promise<void> => {
    const existing = boards.find((b) => b.id === id);
    if (!existing) return;
    const updated: Board = { ...existing, name, emoji, updatedAt: Date.now() };
    await saveBoard(updated);
    setBoards((prev) => prev.map((b) => (b.id === id ? updated : b)));
  }, [boards]);

  const moveItemToBoard = useCallback(async (boardId: string, itemId: string): Promise<void> => {
    await dbAddItemToBoard(boardId, itemId);
  }, []);

  const removeItemFromBoard = useCallback(async (boardId: string, itemId: string): Promise<void> => {
    await dbRemoveItemFromBoard(boardId, itemId);
  }, []);

  return { boards, loading, createBoard, editBoard, removeBoard, moveItemToBoard, removeItemFromBoard };
}
