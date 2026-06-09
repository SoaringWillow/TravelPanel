'use client';

import { useState } from 'react';

interface SafeImageProps {
  src?: string;
  alt?: string;
  fallbackEmoji?: string;
  fallbackText?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

const FALLBACK_COLORS = [
  'from-indigo-400 to-purple-500',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-rose-500',
  'from-pink-400 to-purple-500',
];

function colorForText(text: string): string {
  const i = text.charCodeAt(0) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[i];
}

export default function SafeImage({
  src,
  alt = '',
  fallbackEmoji,
  fallbackText,
  className = '',
  loading = 'lazy',
}: SafeImageProps) {
  const [error, setError] = useState(false);

  const showFallback = !src || error;
  const label = fallbackEmoji ?? (fallbackText ? fallbackText.charAt(0).toUpperCase() : '✈️');
  const gradient = colorForText(fallbackText ?? alt ?? 'a');

  if (showFallback) {
    return (
      <div className={`bg-gradient-to-br ${gradient} flex items-center justify-center ${className}`}>
        <span className="text-white text-2xl select-none">{label}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={loading}
      crossOrigin="anonymous"
      onError={() => setError(true)}
      className={className}
    />
  );
}
