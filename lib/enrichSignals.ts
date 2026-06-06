// Static dataset of major travel events that can affect trip planning.
// Used to inject warnings into the planner prompt when the destination matches.

export interface EnrichSignal {
  id: string;
  location: string;       // city or region keyword (case-insensitive match)
  region: string;         // broader region for fallback matching
  event: string;          // event name
  window: string;         // human-readable date window
  monthStart: number;     // 1-12, start month
  monthEnd: number;       // 1-12, end month
  priceSurge?: number;    // multiplier, e.g. 1.4 = 40% above average
  crowdLevel?: 'high' | 'very high' | 'extreme';
  note: string;           // advisory note for travellers
}

export const ENRICH_SIGNALS: EnrichSignal[] = [
  {
    id: 'jp-cherry-blossom-tokyo',
    location: 'tokyo', region: 'japan',
    event: 'Cherry Blossom (Sakura)',
    window: 'late March – mid April', monthStart: 3, monthEnd: 4,
    priceSurge: 1.4, crowdLevel: 'very high',
    note: 'Peak bloom typically Mar 25–Apr 10. Accommodation books out 3+ months ahead; prices ~40% above average.',
  },
  {
    id: 'jp-cherry-blossom-kyoto',
    location: 'kyoto', region: 'japan',
    event: 'Cherry Blossom (Sakura)',
    window: 'late March – mid April', monthStart: 3, monthEnd: 4,
    priceSurge: 1.5, crowdLevel: 'extreme',
    note: 'Kyoto is the most crowded cherry blossom destination. Temples are elbow-to-elbow. Book very early and visit popular spots before 8am.',
  },
  {
    id: 'jp-golden-week',
    location: 'japan', region: 'japan',
    event: 'Golden Week',
    window: 'late April – early May', monthStart: 4, monthEnd: 5,
    priceSurge: 1.6, crowdLevel: 'extreme',
    note: 'Nationwide public holiday week (Apr 29–May 5). Trains and tourist sites are extremely crowded; domestic flights and hotels sell out fast.',
  },
  {
    id: 'jp-obon',
    location: 'japan', region: 'japan',
    event: 'Obon Festival',
    window: 'mid August', monthStart: 8, monthEnd: 8,
    priceSurge: 1.3, crowdLevel: 'high',
    note: 'Obon (Aug 13–16) is a major travel period. Expect packed Shinkansen and significant hotel price increases.',
  },
  {
    id: 'th-songkran',
    location: 'thailand', region: 'thailand',
    event: 'Songkran (Thai New Year)',
    window: 'mid April', monthStart: 4, monthEnd: 4,
    priceSurge: 1.3, crowdLevel: 'very high',
    note: 'Nationwide water festival Apr 13–15. Roads are blocked in Bangkok and Chiang Mai; be prepared to get very wet. Hotels fill up fast.',
  },
  {
    id: 'cn-chinese-new-year',
    location: 'china', region: 'china',
    event: 'Chinese New Year (Spring Festival)',
    window: 'late January – mid February', monthStart: 1, monthEnd: 2,
    priceSurge: 1.5, crowdLevel: 'extreme',
    note: 'Largest annual human migration. Many restaurants and shops close for 1–2 weeks. Book transport and hotels months in advance.',
  },
  {
    id: 'sg-cny',
    location: 'singapore', region: 'southeast asia',
    event: 'Chinese New Year',
    window: 'late January – mid February', monthStart: 1, monthEnd: 2,
    priceSurge: 1.2, crowdLevel: 'high',
    note: 'Chinatown and major attractions are extremely busy. Hotels raise prices during the two-week festive period.',
  },
  {
    id: 'in-diwali',
    location: 'india', region: 'india',
    event: 'Diwali (Festival of Lights)',
    window: 'October – November', monthStart: 10, monthEnd: 11,
    priceSurge: 1.3, crowdLevel: 'high',
    note: 'National festival with fireworks and family travel. Flights and trains from major cities fill up weeks ahead.',
  },
  {
    id: 'br-carnival',
    location: 'rio de janeiro', region: 'brazil',
    event: 'Rio Carnival',
    window: 'February – early March', monthStart: 2, monthEnd: 3,
    priceSurge: 2.5, crowdLevel: 'extreme',
    note: 'World\'s largest carnival. Rio hotels can cost 3× normal rates; book 6–12 months ahead. Be extra vigilant about personal safety.',
  },
  {
    id: 'de-christmas-markets',
    location: 'germany', region: 'germany',
    event: 'Christmas Markets',
    window: 'late November – December 24', monthStart: 11, monthEnd: 12,
    priceSurge: 1.3, crowdLevel: 'high',
    note: 'Famous markets in Nuremberg, Cologne, and Dresden draw millions. Weekends are extremely crowded; visit on weekday mornings for the best experience.',
  },
  {
    id: 'at-christmas-markets',
    location: 'vienna', region: 'austria',
    event: 'Vienna Christmas Markets',
    window: 'mid November – December 26', monthStart: 11, monthEnd: 12,
    priceSurge: 1.4, crowdLevel: 'high',
    note: 'Vienna\'s Rathausplatz market is world-famous. The entire city centre is magical but crowded; book hotels early.',
  },
  {
    id: 'me-ramadan',
    location: 'dubai', region: 'middle east',
    event: 'Ramadan',
    window: 'varies (lunar calendar, ~March–April)', monthStart: 3, monthEnd: 4,
    crowdLevel: 'high',
    note: 'During Ramadan, eating/drinking in public during daylight is prohibited. Many restaurants only open after sunset; nightlife is vibrant but daytime is quiet.',
  },
  {
    id: 'us-thanksgiving',
    location: 'united states', region: 'usa',
    event: 'Thanksgiving Travel',
    window: 'late November', monthStart: 11, monthEnd: 11,
    priceSurge: 1.5, crowdLevel: 'very high',
    note: 'Busiest US travel week. Airports and highways are severely congested. Book flights and rental cars weeks ahead.',
  },
  {
    id: 'es-la-tomatina',
    location: 'valencia', region: 'spain',
    event: 'La Tomatina',
    window: 'last Wednesday of August', monthStart: 8, monthEnd: 8,
    crowdLevel: 'very high',
    note: 'Famous tomato-throwing festival in Buñol (near Valencia). Tickets sell out fast; wear old clothes and cover electronics.',
  },
  {
    id: 'my-hari-raya',
    location: 'malaysia', region: 'southeast asia',
    event: 'Hari Raya Aidilfitri (Eid)',
    window: 'after Ramadan (varies)', monthStart: 4, monthEnd: 5,
    priceSurge: 1.2, crowdLevel: 'high',
    note: 'Major national holiday. Expect heavy traffic on highways as families travel; many shops close on the first two days.',
  },
];

// ─── Match logic ─────────────────────────────────────────────────────────────

/**
 * Returns signals that match any of the given destination keywords.
 * If a departure month is provided, further filters to events overlapping that month.
 */
export function matchSignals(
  destinations: string[],
  departureMonth?: number,
): EnrichSignal[] {
  const lower = destinations.map((d) => d.toLowerCase());

  return ENRICH_SIGNALS.filter((sig) => {
    const locationMatch = lower.some(
      (d) => d.includes(sig.location) || sig.location.includes(d) || d.includes(sig.region)
    );
    if (!locationMatch) return false;
    if (departureMonth === undefined) return true;
    // Check if departure month overlaps the event window
    const start = Math.min(sig.monthStart, sig.monthEnd);
    const end   = Math.max(sig.monthStart, sig.monthEnd);
    return departureMonth >= start && departureMonth <= end;
  });
}
