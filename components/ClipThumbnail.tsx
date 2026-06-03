'use client';

import { useState } from 'react';
import { Platform } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/parse-url';

interface ClipThumbnailProps {
  src?: string;
  alt: string;
  platform: Platform;
  title: string;
  className?: string;
  style?: React.CSSProperties;
}

// Renders a thumbnail image with a graceful platform-colored fallback when
// the image is absent or fails to load (common with Xiaohongshu/WeChat).
export default function ClipThumbnail({ src, alt, platform, title, className, style }: ClipThumbnailProps) {
  const [failed, setFailed] = useState(!src);

  const color = PLATFORM_COLORS[platform];
  const initials = title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || platform[0].toUpperCase();

  if (failed) {
    return (
      <div
        className={className}
        style={{
          background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
        aria-label={alt}
      >
        <span style={{ color: 'white', fontWeight: 700, fontSize: '1.1em', letterSpacing: '0.04em', opacity: 0.9 }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
