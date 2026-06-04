'use client';

interface TagFilterBarProps {
  tags: string[];
  selectedTag: string | null;
  onSelect: (tag: string | null) => void;
}

export default function TagFilterBar({ tags, selectedTag, onSelect }: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        key="all"
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
          selectedTag === null
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
        }`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onSelect(selectedTag === tag ? null : tag)}
          className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
            selectedTag === tag
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}
