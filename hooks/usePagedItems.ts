'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const PAGE_SIZE = 40;

export function usePagedItems<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset to page 1 when the items array reference changes (filter/search)
  useEffect(() => {
    setPage(1);
  }, [items]);

  // IntersectionObserver: load next page when sentinel is visible
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (page * PAGE_SIZE >= items.length) return; // all loaded

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, page]);

  const visible = items.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < items.length;

  const setSentinelRef = useCallback((el: HTMLDivElement | null) => {
    sentinelRef.current = el;
  }, []);

  return { visible, hasMore, sentinelRef: setSentinelRef };
}
