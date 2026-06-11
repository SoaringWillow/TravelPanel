'use client';

// Cross-component signal that an item changed in IndexedDB outside the normal
// React data flow (e.g. the layout-level enrichment retry queue finished an
// item). Hooks listen and re-read just that item.

export const ITEM_UPDATED_EVENT = 'travelpanel:item-updated';

export function emitItemUpdated(id: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ITEM_UPDATED_EVENT, { detail: { id } }));
}

export function onItemUpdated(handler: (id: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const id = (e as CustomEvent<{ id: string }>).detail?.id;
    if (id) handler(id);
  };
  window.addEventListener(ITEM_UPDATED_EVENT, listener);
  return () => window.removeEventListener(ITEM_UPDATED_EVENT, listener);
}
