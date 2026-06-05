import { SavedItem } from './types';

export interface AutoCollection {
  id: string;
  emoji: string;
  name: string;
  description: string;
  itemIds: string[];
}

// Cluster items by geographic proximity (rough bounding-box grouping)
function clusterByRegion(items: SavedItem[]): AutoCollection[] {
  const itemsWithLoc = items.filter((i) => i.locations.length > 0 && i.enrichmentStatus === 'done');
  if (itemsWithLoc.length === 0) return [];

  // Build centroid map: for each named location group items near it
  const regionMap = new Map<string, string[]>();

  for (const item of itemsWithLoc) {
    for (const loc of item.locations) {
      // Use the top-level city/region name (first word group before comma or last word)
      const region = extractRegion(loc.name);
      if (!region) continue;
      const existing = regionMap.get(region) ?? [];
      if (!existing.includes(item.id)) existing.push(item.id);
      regionMap.set(region, existing);
    }
  }

  const collections: AutoCollection[] = [];
  for (const [region, ids] of regionMap) {
    if (ids.length < 2) continue; // only show regions with 2+ clips
    collections.push({
      id: `region:${region}`,
      emoji: '🗺',
      name: region,
      description: `${ids.length} clips in this area`,
      itemIds: ids,
    });
  }

  // Sort by clip count descending
  return collections.sort((a, b) => b.itemIds.length - a.itemIds.length).slice(0, 6);
}

function extractRegion(locationName: string): string {
  if (!locationName) return '';
  // "Shibuya, Tokyo" → "Tokyo"; "Kyoto" → "Kyoto"; "Bali, Indonesia" → "Bali"
  const parts = locationName.split(',').map((p) => p.trim());
  if (parts.length >= 2) return parts[parts.length - 1];
  return parts[0];
}

// Group food/restaurant clips by region
function collectFoodByRegion(items: SavedItem[]): AutoCollection[] {
  const foodItems = items.filter(
    (i) =>
      i.enrichmentStatus === 'done' &&
      (i.tags.some((t) => /food|eat|restaurant|cafe|cuisine|drink/i.test(t)) ||
        i.activities.some((a) => /food|eat|restaurant|cafe|cuisine/i.test(a)))
  );

  if (foodItems.length < 2) return [];

  const regionMap = new Map<string, string[]>();
  for (const item of foodItems) {
    for (const loc of item.locations) {
      const region = extractRegion(loc.name);
      if (!region) continue;
      const existing = regionMap.get(region) ?? [];
      if (!existing.includes(item.id)) existing.push(item.id);
      regionMap.set(region, existing);
    }
  }

  const collections: AutoCollection[] = [];
  for (const [region, ids] of regionMap) {
    if (ids.length < 2) continue;
    collections.push({
      id: `food:${region}`,
      emoji: '🍜',
      name: `Eat in ${region}`,
      description: `${ids.length} food clips`,
      itemIds: ids,
    });
  }

  return collections.slice(0, 3);
}

// Collect all clips with warning-type substance
function collectWarnings(items: SavedItem[]): AutoCollection[] {
  const warningItems = items.filter(
    (i) =>
      i.enrichmentStatus === 'done' &&
      i.substance?.some((s) => s.type === 'warning')
  );

  if (warningItems.length < 2) return [];

  return [
    {
      id: 'substance:warnings',
      emoji: '⚠️',
      name: 'Avoid These Mistakes',
      description: `${warningItems.length} clips with travel warnings`,
      itemIds: warningItems.map((i) => i.id),
    },
  ];
}

// Collect hidden gems: clips with "hidden", "secret", "underrated" in substance
function collectHiddenGems(items: SavedItem[]): AutoCollection[] {
  const gemItems = items.filter(
    (i) =>
      i.enrichmentStatus === 'done' &&
      i.substance?.some((s) =>
        /hidden|secret|underrated|off.beaten|local.only|tourist.trap avoid|unknown/i.test(s.content)
      )
  );

  if (gemItems.length < 2) return [];

  return [
    {
      id: 'substance:gems',
      emoji: '💎',
      name: 'Hidden Gems',
      description: `${gemItems.length} off-the-beaten-path spots`,
      itemIds: gemItems.map((i) => i.id),
    },
  ];
}

// Main entry point
export function buildAutoCollections(items: SavedItem[]): AutoCollection[] {
  if (items.length < 3) return [];

  const all = [
    ...collectWarnings(items),
    ...collectHiddenGems(items),
    ...collectFoodByRegion(items),
    ...clusterByRegion(items),
  ];

  // Deduplicate by id
  const seen = new Set<string>();
  return all.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
