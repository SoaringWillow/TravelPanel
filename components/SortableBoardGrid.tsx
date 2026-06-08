'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SavedItem } from '@/lib/types';
import InboxCard from './InboxCard';
import SwipeableCard from './SwipeableCard';

// ── Sortable item wrapper ─────────────────────────────────────────────────────

function SortableItem({
  item,
  onDelete,
  onViewOnMap,
}: {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Long-press handle — the entire card acts as drag handle via touch sensor delay */}
      <div {...attributes} {...listeners}>
        <SwipeableCard onDelete={() => onDelete(item.id)}>
          <InboxCard item={item} onDelete={onDelete} onViewOnMap={onViewOnMap} />
        </SwipeableCard>
      </div>
    </div>
  );
}

// ── Grid ─────────────────────────────────────────────────────────────────────

interface SortableBoardGridProps {
  items: SavedItem[];
  onReorder: (newIds: string[]) => void;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
}

export default function SortableBoardGrid({
  items,
  onReorder,
  onDelete,
  onViewOnMap,
}: SortableBoardGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered.map((i) => i.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              onDelete={onDelete}
              onViewOnMap={onViewOnMap}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
