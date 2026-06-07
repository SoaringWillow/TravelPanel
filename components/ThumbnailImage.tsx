'use client';

import { useState } from 'react';
import { Platform } from '@/lib/types';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';

interface ThumbnailImageProps {
  src?: string;
  alt: string;
  platform: Platform;
  className?: string;
}

export default function ThumbnailImage({ src, alt, platform, className = '' }: ThumbnailImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const color = PLATFORM_COLORS[platform];
  const initial = PLATFORM_LABELS[platform][0].toUpperCase();

  const showFallback = !src || errored;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Shimmer — shown while image is loading */}
      {!showFallback && !loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Platform fallback */}
      {showFallback && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${color}cc 0%, ${color}66 100%)` }}
        >
          <span className="text-white font-bold text-3xl opacity-80 select-none">
            {initial}
          </span>
        </div>
      )}

      {/* Actual image */}
      {src && !errored && (
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
