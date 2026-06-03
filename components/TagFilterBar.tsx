'use client';

// Tag icons + colors — matches the tags the AI extraction uses
const TAG_CONFIG: Record<string, { emoji: string; color: string }> = {
  food:         { emoji: '🍜', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  nature:       { emoji: '🌿', color: 'bg-green-100 text-green-700 border-green-200'   },
  culture:      { emoji: '🏛️', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  adventure:    { emoji: '🧗', color: 'bg-red-100 text-red-700 border-red-200'         },
  relaxation:   { emoji: '🧘', color: 'bg-sky-100 text-sky-700 border-sky-200'         },
  photography:  { emoji: '📷', color: 'bg-pink-100 text-pink-700 border-pink-200'      },
  shopping:     { emoji: '🛍️', color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' },
  nightlife:    { emoji: '🌃', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  history:      { emoji: '🏺', color: 'bg-amber-100 text-amber-700 border-amber-200'   },
  art:          { emoji: '🎨', color: 'bg-rose-100 text-rose-700 border-rose-200'      },
  architecture: { emoji: '🏗️', color: 'bg-slate-100 text-slate-700 border-slate-200'  },
  beach:        { emoji: '🏖️', color: 'bg-cyan-100 text-cyan-700 border-cyan-200'      },
  mountain:     { emoji: '⛰️', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  city:         { emoji: '🏙️', color: 'bg-blue-100 text-blue-700 border-blue-200'     },
  rural:        { emoji: '🌾', color: 'bg-lime-100 text-lime-700 border-lime-200'      },
};

export const ALL_TAGS = Object.keys(TAG_CONFIG);

interface TagFilterBarProps {
  activeTags: Set<string>;
  onToggle: (tag: string) => void;
  onClear: () => void;
  /** Only show tags that actually appear in the current clip list */
  availableTags?: string[];
}

export default function TagFilterBar({
  activeTags,
  onToggle,
  onClear,
  availableTags,
}: TagFilterBarProps) {
  const tags = availableTags?.length ? availableTags : ALL_TAGS;

  if (tags.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-hide">
      {/* "All" clears active filters */}
      <button
        type="button"
        onClick={onClear}
        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
          activeTags.size === 0
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
        }`}
      >
        All
      </button>

      {tags.map((tag) => {
        const cfg      = TAG_CONFIG[tag];
        const isActive = activeTags.has(tag);
        if (!cfg) return null;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              isActive
                ? `${cfg.color} border-current ring-1 ring-current ring-offset-0`
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            <span>{cfg.emoji}</span>
            <span className="capitalize">{tag}</span>
          </button>
        );
      })}
    </div>
  );
}
