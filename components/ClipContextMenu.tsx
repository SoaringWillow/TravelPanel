'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, FolderInput, Link2, Trash2 } from 'lucide-react';
import { SavedItem } from '@/lib/types';

interface ClipContextMenuProps {
  item: SavedItem | null;
  onClose: () => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard: (id: string) => void;
  onShare: (item: SavedItem) => void;
  onDelete: (id: string) => void;
}

export default function ClipContextMenu({
  item,
  onClose,
  onViewOnMap,
  onMoveToBoard,
  onShare,
  onDelete,
}: ClipContextMenuProps) {
  if (!item) return null;

  const actions = [
    {
      icon: <MapPin size={18} />,
      label: 'View on Map',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-950',
      onClick: () => { onViewOnMap(item.id); onClose(); },
      disabled: item.locations.length === 0,
    },
    {
      icon: <FolderInput size={18} />,
      label: 'Move to Board',
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950',
      onClick: () => { onMoveToBoard(item.id); onClose(); },
    },
    {
      icon: <Link2 size={18} />,
      label: 'Share Link',
      color: 'text-sky-600',
      bg: 'bg-sky-50 dark:bg-sky-950',
      onClick: () => { onShare(item); onClose(); },
      disabled: !item.url,
    },
    {
      icon: <Trash2 size={18} />,
      label: 'Delete',
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950',
      onClick: () => { onDelete(item.id); onClose(); },
    },
  ];

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1500] bg-black/30"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed bottom-0 left-0 right-0 z-[1501] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl safe-bottom"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Clip title */}
          <div className="px-5 pt-3 pb-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-0.5 uppercase tracking-wide">
              Clip
            </p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white line-clamp-2">
              {item.title}
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 space-y-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl ${action.bg} ${action.color} font-medium text-sm transition-opacity disabled:opacity-40 active:scale-[0.98]`}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          <div className="pb-8 px-5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
