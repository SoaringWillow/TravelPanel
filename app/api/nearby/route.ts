import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

interface OverpassElement {
  type: string;
  id:   number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function getEmoji(tags: Record<string, string>): string {
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'bar' || tags.amenity === 'fast_food') return '🍽️';
  if (tags.tourism === 'museum') return '🏛️';
  if (tags.tourism === 'attraction' || tags.historic) return '🗺️';
  if (tags.amenity === 'place_of_worship') return '⛩️';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return '🌿';
  if (tags.shop) return '🛍️';
  if (tags.tourism === 'hotel' || tags.tourism === 'hostel') return '🏨';
  if (tags.public_transport || tags.railway || tags.amenity === 'bus_station') return '🚉';
  return '📍';
}

function getCategory(tags: Record<string, string>): string {
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') return tags.amenity;
  if (tags.amenity === 'bar') return 'bar';
  if (tags.tourism === 'museum') return 'museum';
  if (tags.tourism === 'attraction') return 'attraction';
  if (tags.historic) return 'historic site';
  if (tags.leisure === 'park') return 'park';
  if (tags.shop) return 'shop';
  if (tags.tourism === 'hotel') return 'hotel';
  return 'point of interest';
}

function getName(tags: Record<string, string>): string | null {
  return tags.name ?? tags['name:en'] ?? null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R  = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dG = ((lon2 - lon1) * Math.PI) / 180;
  const a  = Math.sin(dL / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat    = parseFloat(searchParams.get('lat') ?? '');
  const lng    = parseFloat(searchParams.get('lng') ?? '');
  const radius = Math.min(parseInt(searchParams.get('radius') ?? '500', 10), 2000);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const query = `
[out:json][timeout:8];
(
  node["amenity"~"^(restaurant|cafe|bar|museum|place_of_worship|bus_station|fast_food)$"](around:${radius},${lat},${lng});
  node["tourism"~"^(museum|attraction|hotel|hostel)$"](around:${radius},${lat},${lng});
  node["historic"](around:${radius},${lat},${lng});
  node["leisure"~"^(park|garden)$"](around:${radius},${lat},${lng});
  way["leisure"~"^(park|garden)$"](around:${radius},${lat},${lng});
);
out center 20;
`;

  try {
    const res  = await fetch(OVERPASS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Overpass error' }, { status: 502 });
    }

    const data: { elements: OverpassElement[] } = await res.json();

    const places = data.elements
      .filter((el) => {
        const tags = el.tags ?? {};
        return getName(tags) !== null;
      })
      .map((el) => {
        const tags      = el.tags ?? {};
        const elLat     = el.lat ?? el.center?.lat ?? lat;
        const elLon     = el.lon ?? el.center?.lon ?? lng;
        const distanceM = Math.round(haversineKm(lat, lng, elLat, elLon) * 1000);
        return {
          id:       el.id,
          name:     getName(tags)!,
          category: getCategory(tags),
          emoji:    getEmoji(tags),
          lat:      elLat,
          lng:      elLon,
          distanceM,
        };
      })
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 6);

    return NextResponse.json({ places });
  } catch (err) {
    console.error('[nearby]', err);
    return NextResponse.json({ error: 'Failed to fetch nearby places' }, { status: 500 });
  }
}
