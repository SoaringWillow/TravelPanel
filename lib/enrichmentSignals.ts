export interface EnrichmentSignal {
  id: string;
  destinations: string[];  // lowercase substrings to match against location address/name
  startMonth: number;      // 1-12 inclusive
  endMonth: number;        // 1-12 inclusive; may wrap (e.g. 11-2 for Nov-Feb)
  title: string;
  warning: string;
  emoji: string;
  severity: 'info' | 'warning' | 'high';
}

function monthInRange(month: number, start: number, end: number): boolean {
  if (start <= end) return month >= start && month <= end;
  // Wraps around year end (e.g. Nov-Feb: start=11, end=2)
  return month >= start || month <= end;
}

export const ENRICHMENT_SIGNALS: EnrichmentSignal[] = [
  {
    id: 'cherry-blossom-japan',
    destinations: ['japan', 'tokyo', 'kyoto', 'osaka', 'hiroshima', 'nara'],
    startMonth: 3,
    endMonth: 4,
    title: 'Cherry Blossom Season',
    warning: 'Peak crowds and accommodation 40–60% above average. Book hotels months in advance and expect long queues at popular viewing spots.',
    emoji: '🌸',
    severity: 'high',
  },
  {
    id: 'golden-week-japan',
    destinations: ['japan', 'tokyo', 'kyoto', 'osaka', 'hokkaido'],
    startMonth: 4,
    endMonth: 5,
    title: 'Golden Week',
    warning: 'Japan\'s busiest national holiday period (Apr 29–May 5). Domestic travel surges, trains and attractions are extremely crowded, and accommodation prices spike significantly.',
    emoji: '🎌',
    severity: 'high',
  },
  {
    id: 'typhoon-japan',
    destinations: ['japan', 'tokyo', 'osaka', 'okinawa'],
    startMonth: 7,
    endMonth: 10,
    title: 'Typhoon Season',
    warning: 'Active typhoon season. Travel disruptions, flight cancellations, and outdoor attraction closures are common. Check forecasts regularly.',
    emoji: '🌀',
    severity: 'warning',
  },
  {
    id: 'monsoon-southeast-asia',
    destinations: ['thailand', 'vietnam', 'cambodia', 'bali', 'indonesia', 'myanmar', 'laos', 'philippines'],
    startMonth: 6,
    endMonth: 10,
    title: 'Monsoon Season',
    warning: 'Heavy rainfall and flooding are common. Outdoor activities may be disrupted and some islands/regions become inaccessible. Also a great time for lower prices.',
    emoji: '🌧️',
    severity: 'info',
  },
  {
    id: 'songkran-thailand',
    destinations: ['thailand', 'bangkok', 'chiang mai'],
    startMonth: 4,
    endMonth: 4,
    title: 'Songkran Water Festival',
    warning: 'Thai New Year (Apr 13–15) — the city turns into a massive water fight. Expect chaotic and joyful crowds. Protect electronics and important documents.',
    emoji: '💦',
    severity: 'info',
  },
  {
    id: 'chinese-new-year',
    destinations: ['china', 'beijing', 'shanghai', 'hong kong', 'taiwan', 'singapore', 'vietnam', 'malaysia'],
    startMonth: 1,
    endMonth: 2,
    title: 'Chinese New Year',
    warning: 'Major national holiday — many businesses close for 1–2 weeks. Transport is extremely crowded and expensive. Major fireworks and celebrations in city centers.',
    emoji: '🧧',
    severity: 'warning',
  },
  {
    id: 'cherry-blossoms-korea',
    destinations: ['korea', 'seoul', 'busan', 'jeju'],
    startMonth: 3,
    endMonth: 4,
    title: 'Cherry Blossom Season',
    warning: 'Popular parks and blossom spots see significant crowds. Accommodation books out fast — plan ahead.',
    emoji: '🌸',
    severity: 'warning',
  },
  {
    id: 'rainy-season-india',
    destinations: ['india', 'mumbai', 'goa', 'kerala', 'rajasthan'],
    startMonth: 6,
    endMonth: 9,
    title: 'Monsoon Season',
    warning: 'Heavy monsoon rains across most of India. Flooding in coastal areas is common. However, it\'s also a lush and affordable time to visit hill stations.',
    emoji: '🌧️',
    severity: 'info',
  },
  {
    id: 'diwali-india',
    destinations: ['india', 'delhi', 'mumbai', 'jaipur'],
    startMonth: 10,
    endMonth: 11,
    title: 'Diwali Festival of Lights',
    warning: 'Major celebration with spectacular fireworks and illuminations. Air quality in Delhi can deteriorate significantly around Diwali week. Hotels book out fast.',
    emoji: '🪔',
    severity: 'info',
  },
  {
    id: 'carnival-brazil',
    destinations: ['brazil', 'rio de janeiro', 'salvador', 'recife'],
    startMonth: 2,
    endMonth: 3,
    title: 'Carnival',
    warning: 'World-famous festival — accommodation costs 3–5× normal and books out a year in advance. Expect huge crowds and street celebrations for 5+ days.',
    emoji: '🎭',
    severity: 'high',
  },
  {
    id: 'christmas-markets-europe',
    destinations: ['germany', 'austria', 'france', 'switzerland', 'czech', 'prague', 'vienna', 'strasbourg', 'nuremberg'],
    startMonth: 11,
    endMonth: 12,
    title: 'Christmas Markets',
    warning: 'Beautiful festive markets run late Nov–Dec. Popular markets get very crowded on weekends — visit on weekdays for a better experience.',
    emoji: '🎄',
    severity: 'info',
  },
  {
    id: 'peak-bali',
    destinations: ['bali'],
    startMonth: 7,
    endMonth: 8,
    title: 'Peak Tourist Season',
    warning: 'July–August is Bali\'s busiest period. Prices for accommodation and activities are at their highest, popular sites (Tanah Lot, Tegallalang) are crowded.',
    emoji: '☀️',
    severity: 'warning',
  },
  {
    id: 'summer-europe',
    destinations: ['italy', 'spain', 'france', 'greece', 'portugal', 'rome', 'barcelona', 'paris', 'santorini', 'amsterdam'],
    startMonth: 7,
    endMonth: 8,
    title: 'Peak Summer Season',
    warning: 'Most popular tourist destinations in Europe are at maximum capacity in July–August. Expect long queues, high accommodation prices, and hot weather.',
    emoji: '☀️',
    severity: 'warning',
  },
  {
    id: 'new-year-everywhere',
    destinations: ['new york', 'sydney', 'london', 'dubai', 'bangkok', 'singapore', 'hong kong', 'paris'],
    startMonth: 12,
    endMonth: 1,
    title: 'New Year Celebrations',
    warning: 'Major NYE events draw massive crowds. Fireworks viewing areas fill up hours in advance. Book accommodation well ahead and plan transport carefully.',
    emoji: '🎆',
    severity: 'info',
  },
  {
    id: 'hurricane-caribbean',
    destinations: ['caribbean', 'cuba', 'jamaica', 'bahamas', 'cancun', 'mexico', 'florida'],
    startMonth: 6,
    endMonth: 11,
    title: 'Hurricane Season',
    warning: 'Active hurricane season in the Caribbean and Gulf of Mexico. Travel insurance is strongly recommended. Monitor NOAA forecasts if visiting Jun–Nov.',
    emoji: '🌀',
    severity: 'warning',
  },
  {
    id: 'autumn-colors-japan',
    destinations: ['japan', 'kyoto', 'nikko', 'tokyo', 'hokkaido'],
    startMonth: 10,
    endMonth: 12,
    title: 'Autumn Foliage Season',
    warning: 'Momiji (red leaf) season brings heavy crowds to temples and parks, especially in Kyoto (Nov–Dec) and Hokkaido (Oct). Plan early morning visits to beat the crowds.',
    emoji: '🍁',
    severity: 'warning',
  },
  {
    id: 'sakura-taiwan',
    destinations: ['taiwan', 'taipei'],
    startMonth: 2,
    endMonth: 3,
    title: 'Cherry Blossom Season',
    warning: 'Popular blossom viewing spots fill up quickly, especially on weekends. Alishan National Forest is particularly busy — book transport in advance.',
    emoji: '🌸',
    severity: 'info',
  },
];

export function getSignalsForPlan(
  locations: Array<{ name: string; address?: string }>,
  travelMonth: number
): EnrichmentSignal[] {
  const text = locations
    .flatMap((l) => [l.name, l.address ?? ''])
    .join(' ')
    .toLowerCase();

  return ENRICHMENT_SIGNALS.filter((signal) => {
    const matchesDest = signal.destinations.some((dest) => text.includes(dest));
    const matchesMonth = monthInRange(travelMonth, signal.startMonth, signal.endMonth);
    return matchesDest && matchesMonth;
  });
}
