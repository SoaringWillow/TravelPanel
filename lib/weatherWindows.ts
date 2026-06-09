// Static weather suitability dataset for popular destinations.
// avoidMonths and idealMonths are 0-indexed (Jan = 0).

export interface WeatherWindow {
  destination: string;
  country: string;
  keywords: string[];   // name variants for fuzzy matching
  idealMonths: number[];
  avoidMonths: number[];
  avoidReasons: string[];
  notes: string;
}

export const WEATHER_WINDOWS: WeatherWindow[] = [
  // Japan
  { destination: 'Tokyo', country: 'Japan', keywords: ['tokyo', 'japan', 'edo', 'kantō', 'kanto'],
    idealMonths: [2, 3, 4, 8, 9, 10], avoidMonths: [5, 6, 7],
    avoidReasons: ['rainy season (tsuyu, June–July)', 'extreme summer heat and humidity'],
    notes: 'Best: Mar–May (cherry blossom), Sep–Nov (autumn foliage). Jun–Jul is rainy and humid (30°C+/90% humidity). August is very hot and crowded.' },
  { destination: 'Kyoto', country: 'Japan', keywords: ['kyoto', 'osaka', 'kansai'],
    idealMonths: [2, 3, 4, 9, 10], avoidMonths: [5, 6, 7],
    avoidReasons: ['rainy season June–July', 'oppressive heat and humidity in August'],
    notes: 'Mar–May for sakura, Oct–Nov for maples. August can feel like a sauna inside temple grounds.' },
  { destination: 'Hokkaido', country: 'Japan', keywords: ['hokkaido', 'sapporo'],
    idealMonths: [6, 7, 8, 1, 2], avoidMonths: [11, 0],
    avoidReasons: ['extreme cold January (-12°C)', 'limited daylight in December'],
    notes: 'Summer (Jun–Aug) is Japan\'s best weather; avoid the mainland heat. Winter (Feb) is ideal for ski resorts and the Sapporo Snow Festival.' },

  // Southeast Asia
  { destination: 'Bali', country: 'Indonesia', keywords: ['bali', 'ubud', 'seminyak', 'canggu', 'indonesia'],
    idealMonths: [5, 6, 7, 8, 9], avoidMonths: [11, 0, 1],
    avoidReasons: ['monsoon season (wet season Dec–Mar)', 'flooding roads and muddy rice terraces'],
    notes: 'Dry season May–October is best. Wet season brings daily downpours but also lush green landscapes and fewer tourists.' },
  { destination: 'Bangkok', country: 'Thailand', keywords: ['bangkok', 'thailand', 'phuket', 'chiang mai', 'krabi', 'koh'],
    idealMonths: [10, 11, 0, 1], avoidMonths: [4, 5, 6, 7, 8, 9],
    avoidReasons: ['monsoon season May–October', 'extreme heat March–April (38–42°C)'],
    notes: 'Nov–Feb is cool and dry — the golden window. March and April pre-monsoon are brutally hot. May–October is wet with daily downpours.' },
  { destination: 'Hanoi', country: 'Vietnam', keywords: ['hanoi', 'vietnam', 'ha long', 'halong', 'sapa'],
    idealMonths: [9, 10, 11, 2, 3, 4], avoidMonths: [5, 6, 7, 8],
    avoidReasons: ['rainy season June–September (heavy flooding in northern regions)', 'oppressive summer humidity'],
    notes: 'Oct–Dec and Mar–Apr are ideal. February can be cold and drizzly (winter drizzle, 15°C). Summer is very hot and wet.' },
  { destination: 'Ho Chi Minh City', country: 'Vietnam', keywords: ['ho chi minh', 'saigon', 'southern vietnam', 'mekong'],
    idealMonths: [11, 0, 1, 2, 3], avoidMonths: [4, 5, 6, 7, 8, 9, 10],
    avoidReasons: ['wet season May–November with severe flooding in low-lying areas'],
    notes: 'Dry season Dec–Apr is best. Flooding can make streets impassable in Sep–Oct.' },
  { destination: 'Singapore', country: 'Singapore', keywords: ['singapore'],
    idealMonths: [1, 2, 3, 6, 7, 8], avoidMonths: [11, 0],
    avoidReasons: ['northeast monsoon November–January brings heavy rain and high humidity'],
    notes: 'Relatively consistent year-round but Feb–Aug has least rainfall. Dec–Jan are wettest.' },

  // South Asia
  { destination: 'Mumbai', country: 'India', keywords: ['mumbai', 'bombay', 'goa', 'western india'],
    idealMonths: [10, 11, 0, 1, 2], avoidMonths: [5, 6, 7, 8],
    avoidReasons: ['southwest monsoon June–September (extreme flooding, 2000+mm of rain)'],
    notes: 'Nov–Feb is cool and dry — perfect. Jun–Sep monsoon brings the famous flooding; some areas inaccessible.' },
  { destination: 'Delhi', country: 'India', keywords: ['delhi', 'new delhi', 'agra', 'rajasthan', 'jaipur', 'northern india'],
    idealMonths: [9, 10, 11, 0, 1, 2], avoidMonths: [4, 5, 6, 7, 8],
    avoidReasons: ['extreme summer heat April–June (45–48°C in Rajasthan)', 'monsoon flooding July–August', 'air quality is worst October–February (AQI 300–500)'],
    notes: 'Oct–Mar is the best window. Air quality warnings November–February — wear a mask. Never visit Agra or Rajasthan in May.' },
  { destination: 'Maldives', country: 'Maldives', keywords: ['maldives'],
    idealMonths: [11, 0, 1, 2, 3], avoidMonths: [5, 6, 7, 8],
    avoidReasons: ['southwest monsoon June–August brings rough seas and storm surges'],
    notes: 'Nov–Apr is the dry season with calm turquoise water. Some resorts discount heavily in the wet season.' },

  // East Asia
  { destination: 'Seoul', country: 'South Korea', keywords: ['seoul', 'korea', 'busan', 'jeju'],
    idealMonths: [3, 4, 5, 8, 9, 10], avoidMonths: [6, 7],
    avoidReasons: ['monsoon season July–August (jangma) with heavy rains and flooding', 'extreme summer humidity'],
    notes: 'Spring (Apr–Jun) and autumn (Sep–Nov) are ideal. Jul–Aug is rainy and humid. Jan–Feb is very cold (-15°C).' },
  { destination: 'Beijing', country: 'China', keywords: ['beijing', 'china', 'great wall', 'forbidden city'],
    idealMonths: [3, 4, 5, 8, 9], avoidMonths: [6, 7, 0, 1],
    avoidReasons: ['summer sandstorms and extreme heat July', 'severe air pollution November–February', 'sub-zero temperatures and ice December–January'],
    notes: 'Spring Apr–Jun and autumn Sep–Oct are best. Winter is bitterly cold (−15°C) and extremely polluted.' },
  { destination: 'Shanghai', country: 'China', keywords: ['shanghai'],
    idealMonths: [3, 4, 9, 10, 11], avoidMonths: [6, 7],
    avoidReasons: ['rainy season June (meiyu plum rains)', 'extreme heat July–August (38°C+, 90% humidity)'],
    notes: 'Spring and autumn are glorious. Summers are notoriously sweltering and wet.' },

  // Middle East
  { destination: 'Dubai', country: 'UAE', keywords: ['dubai', 'abu dhabi', 'uae'],
    idealMonths: [9, 10, 11, 0, 1, 2, 3], avoidMonths: [5, 6, 7, 8],
    avoidReasons: ['extreme summer heat June–August (48°C), dangerous for outdoor activities'],
    notes: 'Oct–Apr is the golden season. June–September is brutally hot; outdoor sightseeing is not recommended.' },
  { destination: 'Marrakech', country: 'Morocco', keywords: ['marrakech', 'morocco', 'fez', 'casablanca'],
    idealMonths: [2, 3, 4, 9, 10, 11], avoidMonths: [6, 7],
    avoidReasons: ['July–August temperatures reach 45°C in the medina'],
    notes: 'Spring (Mar–May) and autumn (Sep–Nov) are ideal. The Sahara is best Oct–Mar.' },

  // Pacific
  { destination: 'Sydney', country: 'Australia', keywords: ['sydney', 'australia', 'melbourne'],
    idealMonths: [8, 9, 10, 11, 0, 1], avoidMonths: [5, 6, 7],
    avoidReasons: ['Southern Hemisphere winter June–August (cold, grey, 12°C)'],
    notes: 'Sep–Apr is warm and sunny (Southern Hemisphere spring/summer). Note: fire season Oct–Mar can produce smoke haze.' },
  { destination: 'Queenstown', country: 'New Zealand', keywords: ['queenstown', 'new zealand', 'fiordland', 'milford'],
    idealMonths: [11, 0, 1, 5, 6, 7], avoidMonths: [9],
    avoidReasons: ['October is shoulder season with unpredictable storms'],
    notes: 'Dec–Feb for hiking (long daylight, 25°C). Jun–Aug for skiing. Milford Sound is accessible year-round but wettest Oct–Jan.' },

  // Iceland / Nordic
  { destination: 'Iceland', country: 'Iceland', keywords: ['iceland', 'reykjavik', 'northern lights'],
    idealMonths: [5, 6, 7], avoidMonths: [11, 0, 1],
    avoidReasons: ['only 4–5 hours of daylight in December', 'road closures and dangerous ice on highland tracks'],
    notes: 'Jun–Aug: midnight sun, all roads open, puffins, waterfalls. Sep–Nov: Northern Lights but short days. Interior (Highlands) only accessible Jun–Sep.' },
  { destination: 'Norway', country: 'Norway', keywords: ['norway', 'oslo', 'bergen', 'fjords', 'tromsø'],
    idealMonths: [5, 6, 7, 8], avoidMonths: [11, 0, 1],
    avoidReasons: ['polar night in northern Norway November–January (0 hours of sunlight)', 'ferry cancellations and harsh conditions'],
    notes: 'Jun–Aug for fjord hiking and midnight sun. Winter is for Northern Lights (Tromsø) but prepare for very limited daylight.' },

  // Caribbean
  { destination: 'Caribbean', country: 'Various', keywords: ['caribbean', 'barbados', 'jamaica', 'cuba', 'st lucia', 'antigua', 'cancun', 'mexico'],
    idealMonths: [11, 0, 1, 2, 3, 4], avoidMonths: [8, 9],
    avoidReasons: ['hurricane season peaks August–October (Category 5 storms possible)'],
    notes: 'Dec–May is the dry season with calm seas. Hurricane season is June–November, peaking Aug–Oct. Travel insurance is strongly recommended.' },

  // East Africa
  { destination: 'Kenya', country: 'Kenya', keywords: ['kenya', 'safari', 'masai mara', 'nairobi', 'serengeti', 'tanzania'],
    idealMonths: [0, 1, 5, 6, 7, 8, 9], avoidMonths: [3, 4, 10, 11],
    avoidReasons: ['long rains April–May', 'short rains November–December (muddy safari roads)'],
    notes: 'Jul–Oct is peak dry season and Great Migration at Masai Mara. Jan–Feb is warm and dry (calving season).' },
];

// ─── Query helpers ────────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '');
}

// Return weather windows matching a set of location names and the trip months.
export function getRelevantWeatherWindows(
  locationNames: string[],
  travelMonths: number[]
): Array<WeatherWindow & { isIdeal: boolean; isAvoid: boolean }> {
  const normNames = locationNames.map(normalise);

  return WEATHER_WINDOWS
    .filter((w) =>
      w.keywords.some((kw) =>
        normNames.some((name) => name.includes(normalise(kw)) || normalise(kw).includes(name.split(' ')[0]))
      )
    )
    .map((w) => ({
      ...w,
      isIdeal: travelMonths.some((m) => w.idealMonths.includes(m)),
      isAvoid: travelMonths.some((m) => w.avoidMonths.includes(m)),
    }));
}

// Format weather context for the planner prompt.
export function formatWeatherContext(
  windows: Array<WeatherWindow & { isIdeal: boolean; isAvoid: boolean }>
): string {
  if (windows.length === 0) return '';

  const lines = windows.map((w) => {
    const icon = w.isAvoid ? '⛈' : w.isIdeal ? '🌤' : '🌤';
    const status = w.isAvoid
      ? `⚠️ This is a period to AVOID for ${w.destination}`
      : `✅ This is a good time to visit ${w.destination}`;
    return `${icon} ${status}: ${w.notes}${w.isAvoid ? ` Reasons: ${w.avoidReasons.join(', ')}.` : ''}`;
  });

  return `\n\nWEATHER CONTEXT:\n${lines.join('\n')}\nPlease factor weather suitability into activity recommendations and timing.`;
}
