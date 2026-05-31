'use client';

import { useState } from 'react';
import { Check, Pencil, Trash2, Plus } from 'lucide-react';
import { Trip } from '@/lib/types';

interface PlanVersionBarProps {
  trips: Trip[];
  currentTripId: string | null;
  onSelect: (trip: Trip) => void;
  onRename: (tripId: string, name: string) => void;
  onDelete: (tripId: string) => void;
  onNewVersion: () => void;
}

export default function PlanVersionBar({
  trips,
  currentTripId,
  onSelect,
  onRename,
  onDelete,
  onNewVersion,
}: PlanVersionBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  if (trips.length === 0) return null;

  const startEdit = (trip: Trip) => {
    setEditingId(trip.id);
    setDraft(trip.name ?? '');
  };

  const commitEdit = () => {
    if (editingId && draft.trim()) onRename(editingId, draft.trim());
    setEditingId(null);
    setDraft('');
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-500">Saved versions</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {trips.map((trip) => {
          const isActive = trip.id === currentTripId;
          const isEditing = trip.id === editingId;

          if (isEditing) {
            return (
              <input
                key={trip.id}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') { setEditingId(null); setDraft(''); }
                }}
                className="flex-shrink-0 border-2 border-indigo-300 rounded-full px-3 py-1 text-xs focus:outline-none"
                style={{ width: 120 }}
              />
            );
          }

          return (
            <div
              key={trip.id}
              className={`flex-shrink-0 flex items-center gap-1 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
              }`}
            >
              <button onClick={() => onSelect(trip)} className="flex items-center gap-1 whitespace-nowrap">
                {isActive && <Check size={12} />}
                {trip.name || 'Untitled plan'}
              </button>
              {isActive && (
                <>
                  <button
                    onClick={() => startEdit(trip)}
                    className="p-0.5 hover:bg-white/20 rounded-full"
                    aria-label="Rename version"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => onDelete(trip.id)}
                    className="p-0.5 hover:bg-white/20 rounded-full"
                    aria-label="Delete version"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              )}
            </div>
          );
        })}

        <button
          onClick={onNewVersion}
          className="flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors whitespace-nowrap"
        >
          <Plus size={12} />
          New version
        </button>
      </div>
    </div>
  );
}
