'use client';

import { useState } from 'react';

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Destinations',
    emojis: ['🗺','🏝','🏔','🌋','🏕','🗼','🏯','🗽','🎡','🏟','🌉','🌃','🌆','🌄','🌅','🏖'],
  },
  {
    label: 'Transport',
    emojis: ['✈️','🚢','🚂','🚌','🛵','🚗','🛶','🏍','🚁','🛸','🚀','⛵','🚤','🛥','🚆','🚉'],
  },
  {
    label: 'Food & Drink',
    emojis: ['🍜','🍣','🍕','🥘','🍷','🧋','🥐','🍱','🍛','🥗','🍲','☕','🍵','🍺','🥂','🍾'],
  },
  {
    label: 'Activities',
    emojis: ['🎨','🛍','🧗','🏄','🎭','🏛','🎵','📸','⛷','🤿','🎯','🎪','🎠','🏋','🧘','🌊'],
  },
  {
    label: 'Nature',
    emojis: ['🌸','🍁','🌿','🌺','🌾','🌴','🦋','🦅','🐚','🌻','🍄','🌊','❄️','🌈','🌙','☀️'],
  },
];

interface EmojiPickerProps {
  selected: string;
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
  const [activeGroup, setActiveGroup] = useState(0);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Group tabs */}
      <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-100 dark:border-gray-700 px-2 gap-0.5 pt-1">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            onClick={() => setActiveGroup(i)}
            className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-t-lg transition-colors
              ${activeGroup === i
                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-2">
        {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`text-xl w-9 h-9 flex items-center justify-center rounded-xl transition-all
              hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90
              ${selected === emoji ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-400' : ''}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
