'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, MapPin, AlertTriangle, Lightbulb, Star, DollarSign, Clock, Info } from 'lucide-react';
import { getItemById } from '@/lib/db';
import { SavedItem, SubstanceItem, SubstanceType } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SafeImage from '@/components/SafeImage';

// ─── Substance icon + color map ───────────────────────────────────────────────

const SUBSTANCE_META: Record<SubstanceType, { icon: React.ReactNode; color: string; label: string }> = {
  tip:            { icon: <Lightbulb size={14} />,      color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',   label: 'Tip'          },
  warning:        { icon: <AlertTriangle size={14} />,  color: 'text-red-600 bg-red-50 dark:bg-red-900/30',         label: 'Watch out'    },
  opinion:        { icon: <Star size={14} />,            color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30', label: 'Opinion'     },
  wisdom:         { icon: <Info size={14} />,            color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',      label: 'Know before you go' },
  context:        { icon: <Info size={14} />,            color: 'text-gray-600 bg-gray-100 dark:bg-gray-800',        label: 'Context'      },
  recommendation: { icon: <Star size={14} />,            color: 'text-green-600 bg-green-50 dark:bg-green-900/30',  label: 'Must do'      },
};

function SubstanceCard({ item }: { item: SubstanceItem }) {
  const meta = SUBSTANCE_META[item.type] ?? SUBSTANCE_META.context;
  return (
    <div className={`flex gap-3 rounded-xl p-3 ${meta.color}`}>
      <span className="flex-shrink-0 mt-0.5" aria-hidden="true">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-0.5">{meta.label}</p>
        <p className="text-sm leading-relaxed">{item.content}</p>
        {item.applies_to && (
          <p className="text-xs opacity-60 mt-1">Re: {item.applies_to}</p>
        )}
        {item.source_quote && (
          <blockquote className="text-xs italic opacity-60 mt-1 border-l-2 border-current pl-2">
            "{item.source_quote}"
          </blockquote>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItemById(id).then((it) => {
      setItem(it ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-gray-400 dark:text-gray-500">Clip not found.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-indigo-600 font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  const date = new Date(item.savedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-8">
      {/* Header image */}
      <div className="relative">
        <SafeImage
          src={item.thumbnail}
          alt={item.title}
          fallbackText={item.title}
          className="w-full h-56 object-cover"
        />
        {/* Back button overlay */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
          style={{ marginTop: 'max(0px, env(safe-area-inset-top))' }}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-4">
        {/* Platform + date */}
        <div className="flex items-center gap-2">
          <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full`}>
            {PLATFORM_LABELS[item.platform]}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{date}</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
          {item.title}
        </h1>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Locations */}
        {item.locations.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Places mentioned
            </h2>
            <div className="flex flex-wrap gap-2">
              {item.locations.map((loc) => (
                <div
                  key={`${loc.lat},${loc.lng}`}
                  className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5"
                >
                  <MapPin size={12} className="text-indigo-400 flex-shrink-0" aria-hidden="true" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{loc.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-2.5 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Substance / wisdom */}
        {(item.substance?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Insider knowledge
            </h2>
            <div className="space-y-2">
              {item.substance!.map((s, i) => (
                <SubstanceCard key={i} item={s} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex flex-col gap-3">
          {/* Plan a trip CTA */}
          {item.locations.length > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/boards`)}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <MapPin size={16} aria-hidden="true" />
              Plan a trip here
            </button>
          )}

          {/* Open original */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm flex items-center justify-center gap-2"
          >
            <ExternalLink size={15} aria-hidden="true" />
            Open original post
          </a>
        </div>
      </div>
    </div>
  );
}
