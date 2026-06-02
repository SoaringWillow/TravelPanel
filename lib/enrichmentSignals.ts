// Static dataset of major annual travel events used to inject contextual
// warnings into trip plans. Dates are month-based (1=Jan) for recurring events.

export interface EnrichmentEvent {
  id: string;
  name: string;
  location: string; // city or region name for keyword matching
  keywords: string[]; // lowercase location keywords to match against trip locations
  monthStart: number;
  dayStart: number;
  monthEnd: number;
  dayEnd: number;
  crowd: 'high' | 'very high' | 'extreme';
  priceNote?: string; // e.g. "+40% accommodation"
  warning: string;   // human-readable warning to inject into the plan prompt
}

export const ENRICHMENT_EVENTS: EnrichmentEvent[] = [
  {
    id: 'cherry-blossom-tokyo',
    name: 'Cherry Blossom Season',
    location: 'Tokyo / Kyoto / Japan',
    keywords: ['tokyo', 'kyoto', 'osaka', 'nara', 'japan'],
    monthStart: 3, dayStart: 20, monthEnd: 4, dayEnd: 15,
    crowd: 'very high',
    priceNote: '+40% accommodation',
    warning: '🌸 Cherry Blossom peak (late March–mid April): accommodation typically +40% above average, popular parks can have 2hr queues. Book months in advance.',
  },
  {
    id: 'golden-week-japan',
    name: 'Golden Week Japan',
    location: 'Japan',
    keywords: ['tokyo', 'kyoto', 'osaka', 'japan', 'hiroshima', 'nara'],
    monthStart: 4, dayStart: 29, monthEnd: 5, dayEnd: 5,
    crowd: 'extreme',
    priceNote: '+50–80% prices',
    warning: '🇯🇵 Golden Week (Apr 29–May 5): Japan\'s busiest travel period. Trains and hotels sell out months ahead. Prices surge +50–80%. Consider avoiding major cities.',
  },
  {
    id: 'songkran-thailand',
    name: 'Songkran (Thai New Year)',
    location: 'Thailand',
    keywords: ['bangkok', 'chiang mai', 'thailand', 'pattaya', 'phuket'],
    monthStart: 4, dayStart: 13, monthEnd: 4, dayEnd: 15,
    crowd: 'very high',
    warning: '💦 Songkran (Apr 13–15): Thailand\'s water festival. Streets turn into massive water fights. Keep electronics in waterproof bags. Traffic in Bangkok can be severe.',
  },
  {
    id: 'lunar-new-year',
    name: 'Lunar New Year',
    location: 'China / Vietnam / Korea',
    keywords: ['beijing', 'shanghai', 'hong kong', 'guangzhou', 'hanoi', 'ho chi minh', 'seoul', 'china', 'vietnam', 'korea'],
    monthStart: 1, dayStart: 20, monthEnd: 2, dayEnd: 20,
    crowd: 'extreme',
    priceNote: '+30–60% prices',
    warning: '🧧 Lunar New Year (Jan/Feb, dates vary): The world\'s largest annual migration. Many restaurants and shops close for 1–2 weeks. Transport books out months ahead. +30–60% price surge.',
  },
  {
    id: 'diwali-india',
    name: 'Diwali',
    location: 'India',
    keywords: ['delhi', 'mumbai', 'jaipur', 'varanasi', 'india', 'rajasthan'],
    monthStart: 10, dayStart: 15, monthEnd: 11, dayEnd: 15,
    crowd: 'high',
    warning: '🪔 Diwali (Oct/Nov, dates vary by year): Festival of Lights. Cities are beautifully decorated but very busy. Air quality in Delhi can dip sharply due to fireworks.',
  },
  {
    id: 'christmas-markets-europe',
    name: 'Christmas Markets',
    location: 'Europe',
    keywords: ['vienna', 'prague', 'berlin', 'munich', 'strasbourg', 'cologne', 'germany', 'austria', 'czech', 'france'],
    monthStart: 12, dayStart: 1, monthEnd: 12, dayEnd: 24,
    crowd: 'high',
    priceNote: '+20–30% hotels',
    warning: '🎄 Christmas Markets (Dec 1–24): Central European cities draw massive crowds. Hotels in Vienna, Prague, Munich book out by October. Budget +20–30% on accommodation.',
  },
  {
    id: 'coachella',
    name: 'Coachella',
    location: 'Palm Springs / Indio',
    keywords: ['palm springs', 'indio', 'coachella', 'joshua tree', 'california'],
    monthStart: 4, dayStart: 11, monthEnd: 4, dayEnd: 20,
    crowd: 'very high',
    priceNote: '+200–400% hotels',
    warning: '🎵 Coachella (mid-April): Hotel prices in Palm Springs surge +200–400%. Book months ahead or stay in LA. Traffic on I-10 can add 2–3 hours.',
  },
  {
    id: 'oktoberfest',
    name: 'Oktoberfest',
    location: 'Munich',
    keywords: ['munich', 'münchen', 'germany', 'bavaria'],
    monthStart: 9, dayStart: 20, monthEnd: 10, dayEnd: 6,
    crowd: 'very high',
    priceNote: '+100–200% hotels',
    warning: '🍺 Oktoberfest (late Sep–early Oct): Munich hotel prices triple. Book tents months ahead. The city is genuinely fun but genuinely packed.',
  },
  {
    id: 'carnival-rio',
    name: 'Rio Carnival',
    location: 'Rio de Janeiro',
    keywords: ['rio', 'rio de janeiro', 'brazil'],
    monthStart: 2, dayStart: 1, monthEnd: 3, dayEnd: 10,
    crowd: 'extreme',
    priceNote: '+150–300% accommodation',
    warning: '🎭 Rio Carnival (late Feb/early March): Accommodation prices surge 150–300%. City is electric but pickpocketing risk is elevated. Book parade tickets months ahead.',
  },
  {
    id: 'venice-flood-season',
    name: 'Acqua Alta (Venice Flooding)',
    location: 'Venice',
    keywords: ['venice', 'venezia', 'italy'],
    monthStart: 10, dayStart: 1, monthEnd: 1, dayEnd: 31,
    crowd: 'high',
    warning: '🌊 Acqua Alta season (Oct–Jan): Venice floods 15–60 times per year. Pack waterproof boots. Raised walkways are set up but ground floors of hotels may be affected.',
  },
  {
    id: 'monsoon-se-asia',
    name: 'Monsoon Season',
    location: 'Southeast Asia',
    keywords: ['bali', 'thailand', 'vietnam', 'cambodia', 'myanmar', 'philippines', 'phuket', 'koh samui'],
    monthStart: 6, dayStart: 1, monthEnd: 9, dayEnd: 30,
    crowd: 'high',
    warning: '🌧️ Monsoon season (Jun–Sep in most of SE Asia): Heavy afternoon rains are common. Some islands close beach clubs. Prices are lower but outdoor activities may be disrupted.',
  },
  {
    id: 'ramadan-middle-east',
    name: 'Ramadan',
    location: 'Middle East / Muslim-majority countries',
    keywords: ['dubai', 'abu dhabi', 'istanbul', 'marrakech', 'cairo', 'jordan', 'morocco', 'uae', 'turkey'],
    monthStart: 3, dayStart: 1, monthEnd: 4, dayEnd: 30,
    crowd: 'high',
    warning: '🌙 Ramadan (dates vary, typically Mar/Apr): Many restaurants close during daylight hours. Iftar (sunset meal) is a beautiful cultural experience. Alcohol restrictions increase in some countries.',
  },
  {
    id: 'new-years-eve-sydney',
    name: "New Year's Eve Fireworks",
    location: 'Sydney',
    keywords: ['sydney', 'australia'],
    monthStart: 12, dayStart: 30, monthEnd: 1, dayEnd: 2,
    crowd: 'very high',
    priceNote: '+200% hotels on Dec 31',
    warning: '🎆 New Year\'s Eve (Dec 31): Sydney Harbour has world-class fireworks. Hotels within view of the harbour charge +200%. Arrive at viewing spots 6–8 hours early.',
  },
  {
    id: 'summer-europe',
    name: 'European Summer Peak',
    location: 'Europe',
    keywords: ['barcelona', 'rome', 'paris', 'amsterdam', 'athens', 'santorini', 'amalfi', 'florence', 'italy', 'spain', 'greece'],
    monthStart: 7, dayStart: 1, monthEnd: 8, dayEnd: 31,
    crowd: 'very high',
    priceNote: '+40–80% prices',
    warning: '☀️ European peak summer (Jul–Aug): Tourist sites are at maximum capacity. Prices +40–80% vs shoulder season. Book museums and restaurants weeks ahead. Heat in southern Europe can reach 40°C.',
  },
  {
    id: 'ski-season-alps',
    name: 'Ski Season',
    location: 'Alps',
    keywords: ['chamonix', 'zermatt', 'st moritz', 'innsbruck', 'verbier', 'switzerland', 'austria'],
    monthStart: 12, dayStart: 20, monthEnd: 3, dayEnd: 31,
    crowd: 'very high',
    priceNote: '+50–100% ski-in hotels',
    warning: '⛷️ Ski season peak (Dec–Mar): Ski resort accommodation books out months ahead, especially Christmas/Feb half-term. Prices +50–100%. Book lessons and lift passes in advance.',
  },
  {
    id: 'lantern-festival-taiwan',
    name: 'Lantern Festival Taiwan',
    location: 'Taiwan',
    keywords: ['taipei', 'pingxi', 'taiwan'],
    monthStart: 2, dayStart: 5, monthEnd: 2, dayEnd: 25,
    crowd: 'high',
    warning: '🏮 Lantern Festival (15 days after Lunar New Year): Pingxi sky lanterns and Yanshui beehive firecrackers are world-famous. Hugely crowded but spectacular. Train tickets sell out days ahead.',
  },
  {
    id: 'burning-man',
    name: 'Burning Man',
    location: 'Nevada',
    keywords: ['nevada', 'black rock', 'reno', 'las vegas'],
    monthStart: 8, dayStart: 25, monthEnd: 9, dayEnd: 5,
    crowd: 'high',
    priceNote: 'Reno hotels +100%',
    warning: '🔥 Burning Man (late Aug–early Sep): 80,000 people in Black Rock Desert. Reno hotels surge +100%. Highway 447 can have 3–5hr queues on entry/exit days.',
  },
  {
    id: 'edinburgh-fringe',
    name: 'Edinburgh Fringe',
    location: 'Edinburgh',
    keywords: ['edinburgh', 'scotland'],
    monthStart: 8, dayStart: 1, monthEnd: 8, dayEnd: 25,
    crowd: 'very high',
    priceNote: '+150% accommodation',
    warning: '🎭 Edinburgh Fringe (Aug): The world\'s largest arts festival. City accommodation +150%; book a year ahead for good options. Worth it — the city is electric.',
  },
  {
    id: 'formula1-monaco',
    name: 'Monaco Grand Prix',
    location: 'Monaco / Nice',
    keywords: ['monaco', 'monte carlo', 'nice', 'cannes'],
    monthStart: 5, dayStart: 22, monthEnd: 5, dayEnd: 27,
    crowd: 'very high',
    priceNote: '+300–500% hotels',
    warning: '🏎️ Monaco Grand Prix (late May): Hotels in Monaco and Nice surge +300–500%. The race weekend makes the principality almost impossible to navigate by road.',
  },
  {
    id: 'hajj-saudi',
    name: 'Hajj Pilgrimage',
    location: 'Saudi Arabia',
    keywords: ['mecca', 'medina', 'jeddah', 'saudi arabia'],
    monthStart: 6, dayStart: 1, monthEnd: 7, dayEnd: 15,
    crowd: 'extreme',
    warning: '🕌 Hajj season (dates vary, approx Jun/Jul): Non-Muslims cannot enter Mecca. Jeddah and Medina see massive pilgrim overflow. Flights in/out of Saudi Arabia book up months ahead.',
  },
];

// ─── Matcher ─────────────────────────────────────────────────────────────────

export interface ActiveEvent extends EnrichmentEvent {
  matchedLocations: string[];
}

/**
 * Given a list of location names and a travel date range, return all matching
 * enrichment events with their matched location names.
 */
export function getActiveEvents(
  locationNames: string[],
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): ActiveEvent[] {
  const lowerNames = locationNames.map((n) => n.toLowerCase());

  return ENRICHMENT_EVENTS.filter((event) => {
    // Location match: any event keyword appears in any location name
    const locationMatches = event.keywords.some((kw) =>
      lowerNames.some((loc) => loc.includes(kw))
    );
    if (!locationMatches) return false;

    // Date overlap: event window overlaps with travel window
    const eventStart = event.monthStart * 100 + event.dayStart;
    const eventEnd = event.monthEnd * 100 + event.dayEnd;
    const travelStart = startMonth * 100 + startDay;
    const travelEnd = endMonth * 100 + endDay;
    return eventStart <= travelEnd && eventEnd >= travelStart;
  }).map((event) => ({
    ...event,
    matchedLocations: locationNames.filter((n) =>
      event.keywords.some((kw) => n.toLowerCase().includes(kw))
    ),
  }));
}

/**
 * Build a prompt snippet injecting enrichment warnings into the plan prompt.
 * Returns empty string if no events match.
 */
export function buildEnrichmentPromptBlock(activeEvents: ActiveEvent[]): string {
  if (activeEvents.length === 0) return '';
  const lines = activeEvents.map((e) => `- ${e.warning}`);
  return `\n\nREAL-WORLD CONTEXT (inject these warnings into the relevant activities):\n${lines.join('\n')}\n`;
}
