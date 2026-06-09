// Static dataset of major annual events and weather windows for trip enrichment.
// Used by /api/plan to inject real-world warnings into generated itineraries.

export interface AnnualEvent {
  name: string;
  destinations: string[]; // lowercase substrings to match against location names
  monthRange: [number, number]; // inclusive start and end months (1–12)
  priceImpact: 'high' | 'medium' | 'low';
  crowdLevel: 'high' | 'medium';
  warning: string; // injected into the planner prompt as a ⚠️ advisory
}

export interface WeatherWindow {
  destination: string; // lowercase, used for fuzzy matching
  bestMonths: number[]; // 1–12
  avoidMonths: number[]; // months to flag as problematic
  reason: string; // human-readable explanation
}

export const ANNUAL_EVENTS: AnnualEvent[] = [
  // Japan
  {
    name: 'Cherry Blossom Season',
    destinations: ['japan', 'tokyo', 'kyoto', 'osaka', 'hiroshima', 'nara'],
    monthRange: [3, 4],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ Cherry Blossom Season (late Mar–mid Apr): accommodation prices are 30–50% above average and popular spots like Maruyama Park and Ueno Park are extremely crowded. Book hotels 3–6 months in advance or consider late March / late April.',
  },
  {
    name: 'Golden Week',
    destinations: ['japan', 'tokyo', 'kyoto', 'osaka', 'hakone', 'nikko'],
    monthRange: [4, 5],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ Golden Week (Apr 29–May 5): Japan\'s busiest domestic holiday period. Shinkansen and popular attractions are fully booked. Prices spike 40–60%. Either book everything months ahead or avoid these dates entirely.',
  },
  {
    name: 'Obon Festival',
    destinations: ['japan', 'tokyo', 'kyoto', 'osaka'],
    monthRange: [8, 8],
    priceImpact: 'medium',
    crowdLevel: 'high',
    warning: '⚠️ Obon (Aug 13–16): Japanese domestic travel holiday. Trains are packed and many local restaurants/businesses close. Book transport early and expect crowded sights.',
  },
  {
    name: 'New Year Holidays',
    destinations: ['japan', 'tokyo', 'kyoto'],
    monthRange: [12, 1],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ New Year (Dec 28–Jan 4): Shrines are overwhelmingly crowded for Hatsumode (first shrine visit). Many businesses closed Jan 1–3. Prices and demand spike significantly.',
  },
  // Thailand
  {
    name: 'Songkran Water Festival',
    destinations: ['thailand', 'bangkok', 'chiang mai', 'chiang rai', 'phuket'],
    monthRange: [4, 4],
    priceImpact: 'medium',
    crowdLevel: 'high',
    warning: '⚠️ Songkran (Apr 13–15): Thailand\'s biggest festival — the entire country has a water fight. Major fun but expect soaked streets, transport chaos, and significantly higher hotel prices in Chiang Mai especially.',
  },
  {
    name: 'Thai Monsoon Season',
    destinations: ['thailand', 'bangkok', 'koh samui', 'koh phangan', 'ko tao'],
    monthRange: [6, 10],
    priceImpact: 'low',
    crowdLevel: 'medium',
    warning: '⚠️ Monsoon season (Jun–Oct): Heavy rain and flooding possible, especially on gulf coast islands. Prices are lower but some beach resorts partially close. Andaman coast (Phuket, Krabi) has different rain patterns — their monsoon is May–Oct.',
  },
  // India
  {
    name: 'Diwali',
    destinations: ['india', 'delhi', 'mumbai', 'jaipur', 'varanasi', 'rajasthan'],
    monthRange: [10, 11],
    priceImpact: 'medium',
    crowdLevel: 'high',
    warning: '⚠️ Diwali (Oct/Nov, date varies): Incredible to witness but expect major crowds, fireworks noise pollution, and transportation delays. Book accommodation 2–3 months ahead in cities like Jaipur and Varanasi.',
  },
  {
    name: 'Holi',
    destinations: ['india', 'delhi', 'jaipur', 'varanasi', 'mathura', 'rajasthan'],
    monthRange: [3, 3],
    priceImpact: 'medium',
    crowdLevel: 'high',
    warning: '⚠️ Holi (March, date varies): The color festival is spectacular but protect your camera gear — colored powder is everywhere. Prices in Jaipur and Mathura spike significantly. ATMs and shops often close on Holi day.',
  },
  // Southeast Asia
  {
    name: 'Bali Nyepi (Day of Silence)',
    destinations: ['bali', 'indonesia'],
    monthRange: [3, 3],
    priceImpact: 'low',
    crowdLevel: 'low',
    warning: '⚠️ Nyepi (Day of Silence, March): The entire island of Bali shuts down for 24 hours — no outdoor activity, no lights, Bali airport closes. Check the exact date before booking; if you are in Bali on Nyepi you must stay in your hotel all day.',
  },
  {
    name: 'SE Asia Rainy Season',
    destinations: ['vietnam', 'cambodia', 'laos', 'myanmar'],
    monthRange: [5, 10],
    priceImpact: 'low',
    crowdLevel: 'medium',
    warning: '⚠️ Rainy season (May–Oct): Heavy daily rain across mainland SE Asia. Flooding possible in low-lying areas. Prices are lower and crowds smaller — popular with budget travelers who don\'t mind the rain.',
  },
  // Europe
  {
    name: 'Oktoberfest',
    destinations: ['germany', 'munich', 'münchen'],
    monthRange: [9, 10],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ Oktoberfest (mid-Sep to early Oct): Munich accommodation prices triple. Book hotels 6+ months ahead for this period. The festival itself is worth planning around — but you need reservations for the main tent seating.',
  },
  {
    name: 'Christmas Markets',
    destinations: ['germany', 'austria', 'czech republic', 'prague', 'vienna', 'strasbourg', 'france', 'belgium', 'switzerland'],
    monthRange: [11, 12],
    priceImpact: 'medium',
    crowdLevel: 'high',
    warning: '⚠️ Christmas markets (late Nov–Dec 24): Beautiful but extremely crowded, especially weekends. Vienna and Prague Christmas markets draw enormous crowds. Hotels sell out early — book October at the latest for December dates.',
  },
  {
    name: 'European Summer Peak',
    destinations: ['italy', 'france', 'spain', 'greece', 'croatia', 'portugal', 'rome', 'paris', 'barcelona', 'santorini', 'dubrovnik', 'lisbon'],
    monthRange: [7, 8],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ European summer peak (Jul–Aug): Absolute peak season. The Colosseum has 2–3 hour queues. Santorini sunsets attract thousands. Dubrovnik caps daily visitors. Prices are highest of the year. Consider June or September for similar weather with fewer crowds.',
  },
  {
    name: 'Edinburgh Fringe Festival',
    destinations: ['edinburgh', 'scotland', 'uk'],
    monthRange: [8, 8],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ Edinburgh Fringe (entire August): The world\'s largest arts festival. Accommodation prices in Edinburgh are 3–4× higher in August. Book months ahead or stay outside the city and commute in.',
  },
  {
    name: 'Notting Hill Carnival',
    destinations: ['london', 'uk', 'england'],
    monthRange: [8, 8],
    priceImpact: 'medium',
    crowdLevel: 'high',
    warning: '⚠️ Notting Hill Carnival (last weekend of August): Europe\'s largest street festival draws 2M+ people to West London. Transport is chaotic on the Sunday and Monday. Great to experience but plan accordingly.',
  },
  // Americas
  {
    name: 'Mardi Gras',
    destinations: ['new orleans', 'louisiana', 'usa'],
    monthRange: [2, 3],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ Mardi Gras (Feb/Mar, date varies): New Orleans hotel prices are 5–10× normal. Book 6+ months ahead. Streets in the French Quarter become impassable on parade nights. Worth experiencing once but requires serious advance planning.',
  },
  {
    name: 'Carnival',
    destinations: ['brazil', 'rio de janeiro', 'rio', 'salvador', 'recife'],
    monthRange: [2, 3],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ Carnival (Feb/Mar, date varies): Rio Carnival Sambadrome tickets and accommodation book out completely 6+ months ahead. The entire city shuts down for 5 days. Prices are 3–5× normal. Street crime risk increases significantly during this period.',
  },
  {
    name: 'Coachella Valley Music Festival',
    destinations: ['palm springs', 'california', 'coachella', 'indio'],
    monthRange: [4, 4],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ Coachella (two weekends in April): Palm Springs and surrounding area accommodation prices spike 5–10×. Book months ahead. I-10 traffic is severe on festival days.',
  },
  {
    name: 'SXSW',
    destinations: ['austin', 'texas', 'usa'],
    monthRange: [3, 3],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ SXSW (mid-March): Austin hotel prices are 3–4× normal during SXSW week. Downtown streets are extremely crowded. Restaurant waits are 1–2 hours. Book accommodation in January at the latest.',
  },
  {
    name: 'Caribbean Hurricane Season',
    destinations: ['caribbean', 'bahamas', 'cuba', 'jamaica', 'barbados', 'st lucia', 'antigua', 'cancun', 'mexico'],
    monthRange: [6, 11],
    priceImpact: 'low',
    crowdLevel: 'low',
    warning: '⚠️ Hurricane season (Jun–Nov): Peak hurricane activity is Aug–Oct. Many resorts offer discounts but some partially close. Travel insurance is strongly recommended. Monitor NOAA forecasts if traveling Aug–Oct.',
  },
  // East Asia
  {
    name: 'Chinese New Year / Spring Festival',
    destinations: ['china', 'beijing', 'shanghai', 'hong kong', 'macau', 'taiwan', 'singapore', 'chengdu', 'guangzhou', 'shenzhen'],
    monthRange: [1, 2],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ Chinese New Year (Jan/Feb, date varies): The world\'s largest annual human migration. Flights and trains in China are fully booked weeks ahead. Many restaurants and shops close for 1–2 weeks. Tourist sites are extraordinarily crowded. Prices spike 50–100%.',
  },
  {
    name: 'Dragon Boat Festival',
    destinations: ['china', 'hong kong', 'taiwan', 'singapore'],
    monthRange: [6, 6],
    priceImpact: 'low',
    crowdLevel: 'medium',
    warning: '⚠️ Dragon Boat Festival (June, date varies): 3-day public holiday in mainland China, Hong Kong, and Taiwan. Domestic travel surges and transport is busier than usual.',
  },
  {
    name: 'Korean Chuseok (Harvest Festival)',
    destinations: ['korea', 'south korea', 'seoul', 'busan', 'jeju'],
    monthRange: [9, 10],
    priceImpact: 'medium',
    crowdLevel: 'high',
    warning: '⚠️ Chuseok (Sep/Oct, 3-day holiday): Korea\'s major family reunion holiday. Seoul to regional routes are fully booked. Many restaurants and shops close in cities. Jeju flights are extremely expensive around this time.',
  },
  // Middle East
  {
    name: 'Ramadan Travel Impact',
    destinations: ['dubai', 'abu dhabi', 'morocco', 'egypt', 'turkey', 'jordan', 'uae', 'saudi arabia'],
    monthRange: [3, 4],
    priceImpact: 'low',
    crowdLevel: 'low',
    warning: '⚠️ Ramadan (dates shift each year, currently Mar–Apr): Restaurants are closed during daylight hours in Muslim-majority countries. Nights come alive with Iftar celebrations — a wonderful cultural experience. Alcohol may be restricted in some venues. Note: Ramadan dates shift ~11 days earlier each year.',
  },
  // Events/Festivals misc
  {
    name: 'La Tomatina',
    destinations: ['bunol', 'valencia', 'spain'],
    monthRange: [8, 8],
    priceImpact: 'medium',
    crowdLevel: 'high',
    warning: '⚠️ La Tomatina (last Wednesday of August): The tomato-throwing festival in Buñol. Tickets sell out months ahead. Valencia accommodation prices spike for this week. Bring clothes you\'re happy to throw away.',
  },
  {
    name: 'Running of the Bulls',
    destinations: ['pamplona', 'spain', 'navarra'],
    monthRange: [7, 7],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ San Fermín / Running of the Bulls (July 6–14): Pamplona\'s population multiplies 10×. Accommodation must be booked 6+ months ahead — prices are extreme. The encierro (bull run) is genuinely dangerous. The festival itself is a spectacular week-long party.',
  },
  {
    name: 'Full Moon Party',
    destinations: ['koh phangan', 'thailand', 'ko pha ngan'],
    monthRange: [1, 12],
    priceImpact: 'medium',
    crowdLevel: 'high',
    warning: '⚠️ Full Moon Party (monthly, Haad Rin Beach): Draws 10,000–30,000 people to a single beach. Accommodation on Koh Phangan costs 2–3× normal on Full Moon nights. Surrounding islands (Koh Samui, Koh Tao) also see price spikes.',
  },
  // Sapporo / winter
  {
    name: 'Sapporo Snow Festival',
    destinations: ['sapporo', 'hokkaido', 'japan'],
    monthRange: [2, 2],
    priceImpact: 'high',
    crowdLevel: 'high',
    warning: '⚠️ Sapporo Snow Festival (first week of February): 2M+ visitors come to see the snow sculptures. Sapporo accommodation is fully booked months ahead. Flights from Tokyo are expensive. Book early if combining with ski resorts.',
  },
];

export const WEATHER_WINDOWS: WeatherWindow[] = [
  { destination: 'tokyo', bestMonths: [3, 4, 10, 11], avoidMonths: [7, 8], reason: 'Jul–Aug is hot and humid (35°C+) with typhoon risk Sep–Oct. Spring (Mar–Apr) for cherry blossoms and autumn (Oct–Nov) for fall foliage are the finest seasons.' },
  { destination: 'kyoto', bestMonths: [3, 4, 10, 11], avoidMonths: [7, 8], reason: 'Same as Tokyo — summer is brutally hot. Autumn (Nov) is arguably the most beautiful time with maple foliage.' },
  { destination: 'osaka', bestMonths: [3, 4, 10, 11], avoidMonths: [7, 8], reason: 'Summer heat and humidity. Best in spring and autumn.' },
  { destination: 'hokkaido', bestMonths: [7, 8, 2], avoidMonths: [12, 1], reason: 'Hokkaido summers (Jul–Aug) are pleasantly cool — the only place in Japan to escape heat. Winters are deep snow paradise for skiing.' },
  { destination: 'bali', bestMonths: [6, 7, 8, 9], avoidMonths: [1, 2], reason: 'Dry season Jun–Sep is ideal. Jan–Feb is peak rainy season with heavy daily downpours. However, rice terraces are beautiful and prices lower in wet season.' },
  { destination: 'bangkok', bestMonths: [11, 12, 1, 2], avoidMonths: [4, 5], reason: 'Nov–Feb is the cool dry season — most comfortable. April is the hottest month (40°C+) before the rains come. May–Oct is wet season.' },
  { destination: 'chiang mai', bestMonths: [11, 12, 1, 2], avoidMonths: [3, 4], reason: 'Mar–Apr is burning season — severe air pollution from agricultural fires (AQI can exceed 300). Nov–Feb is cool and clear, ideal for trekking.' },
  { destination: 'phuket', bestMonths: [11, 12, 1, 2, 3, 4], avoidMonths: [5, 6, 7, 8, 9, 10], reason: 'West coast beaches (Patong, Kata) face the Andaman monsoon May–Oct. Rough seas make swimming dangerous. East coast and gulf islands are better in this period.' },
  { destination: 'singapore', bestMonths: [2, 3, 6, 7], avoidMonths: [11, 12], reason: 'Singapore has tropical climate year-round. Nov–Jan is wetter with northeast monsoon. Feb–Mar and Jun–Jul tend to be drier.' },
  { destination: 'vietnam', bestMonths: [], avoidMonths: [], reason: 'Vietnam has three distinct climate zones — check specific city. Hanoi: best Oct–Apr. Hoi An: Feb–Aug (floods Nov). Ho Chi Minh City: dry season Dec–Apr.' },
  { destination: 'hanoi', bestMonths: [10, 11, 12, 1, 2, 3, 4], avoidMonths: [7, 8, 9], reason: 'Jul–Sep is hot, humid, and rainy with typhoon risk. Oct–Apr is dry and cooler.' },
  { destination: 'ho chi minh', bestMonths: [12, 1, 2, 3, 4], avoidMonths: [5, 6, 7, 8, 9, 10], reason: 'Dry season Dec–Apr is ideal. May–Nov is rainy season with afternoon downpours.' },
  { destination: 'rome', bestMonths: [4, 5, 6, 9, 10], avoidMonths: [7, 8], reason: 'Jul–Aug is scorching (35–40°C) and the most crowded. Apr–Jun and Sep–Oct offer pleasant temperatures and smaller queues at the Colosseum.' },
  { destination: 'paris', bestMonths: [4, 5, 6, 9], avoidMonths: [7, 8], reason: 'Peak tourist season Jul–Aug means full museums, expensive hotels, and many Parisians on holiday. Apr–Jun and September are far more pleasant.' },
  { destination: 'barcelona', bestMonths: [4, 5, 6, 9, 10], avoidMonths: [7, 8], reason: 'Summer is packed. La Sagrada Familia and Park Güell require timed tickets months ahead in July. May–June and September offer beach weather without the crush.' },
  { destination: 'lisbon', bestMonths: [4, 5, 6, 9, 10], avoidMonths: [7, 8], reason: 'Jul–Aug is very hot and tourist-heavy. Spring and autumn are ideal — warm, fewer crowds, lower prices.' },
  { destination: 'amsterdam', bestMonths: [4, 5, 6, 7, 8], avoidMonths: [11, 12, 1, 2], reason: 'Winter is grey, cold, and rainy. Summer (Jun–Aug) and tulip season (Apr) are best. April is tulip peak at Keukenhof.' },
  { destination: 'london', bestMonths: [5, 6, 7, 8, 9], avoidMonths: [11, 12, 1, 2], reason: 'British weather is famously unpredictable but summer (Jun–Aug) is reliably the sunniest. Hyde Park and outdoor events are at their best.' },
  { destination: 'prague', bestMonths: [4, 5, 9, 10], avoidMonths: [7, 8], reason: 'Peak summer floods Old Town Square with tour groups. Spring and autumn are quieter and just as beautiful.' },
  { destination: 'greece', bestMonths: [5, 6, 9, 10], avoidMonths: [7, 8], reason: 'July and August are scorching (40°C on Santorini) and overwhelmingly crowded. May–June and September offer perfect beach weather with far fewer tourists.' },
  { destination: 'santorini', bestMonths: [5, 6, 9], avoidMonths: [7, 8], reason: 'Peak season Oia sunset spots have 2,000+ people. May and September have similar weather with a fraction of the crowds.' },
  { destination: 'dubai', bestMonths: [11, 12, 1, 2, 3], avoidMonths: [6, 7, 8, 9], reason: 'Summer (Jun–Sep) temperatures regularly exceed 45°C with extreme humidity. Nov–Mar is ideal with comfortable temperatures.' },
  { destination: 'new york', bestMonths: [4, 5, 9, 10], avoidMonths: [1, 2, 7, 8], reason: 'January–February can be bitterly cold. July–August is hot and humid. Spring and autumn are the city at its best.' },
  { destination: 'sydney', bestMonths: [9, 10, 11, 3, 4], avoidMonths: [7, 8], reason: 'Sydney winters (Jul–Aug) are mild but grey. Spring (Sep–Nov) and early autumn (Mar–Apr) are perfect — warm, sunny, and with manageable crowds.' },
  { destination: 'cape town', bestMonths: [11, 12, 1, 2, 3], avoidMonths: [6, 7, 8], reason: 'Cape Town has a Mediterranean climate — dry, hot summers (Dec–Feb) and wet winters. The Cape Peninsula is at its most beautiful in summer.' },
  { destination: 'maui', bestMonths: [4, 5, 6, 9, 10], avoidMonths: [12, 1, 2, 3], reason: 'Dec–Mar is whale watching season but also the most crowded time (holiday travelers). Apr–Jun and Sep–Oct have beautiful weather and fewer tourists.' },
];

/** Returns matching annual events for a set of destination names and optional month. */
export function getRelevantEvents(
  destinationNames: string[],
  currentMonth?: number,
): AnnualEvent[] {
  const lowerNames = destinationNames.map((n) => n.toLowerCase());

  return ANNUAL_EVENTS.filter((event) => {
    const destMatch = event.destinations.some((dest) =>
      lowerNames.some((name) => name.includes(dest) || dest.includes(name))
    );
    if (!destMatch) return false;

    // If month provided, only return year-round relevant events or those in/near the window
    if (currentMonth !== undefined) {
      const [start, end] = event.monthRange;
      // Include if month is within ±2 months of the event (so planners get advance warnings)
      const inRange = start <= end
        ? currentMonth >= start - 2 && currentMonth <= end + 2
        : currentMonth >= start - 2 || currentMonth <= end + 2; // wraps Dec→Jan
      return inRange;
    }
    return true;
  });
}

/** Returns weather advisory for a destination name and travel month. */
export function getWeatherAdvisory(
  destinationNames: string[],
  month: number,
): string | null {
  const lowerNames = destinationNames.map((n) => n.toLowerCase());

  for (const window of WEATHER_WINDOWS) {
    const isMatch = lowerNames.some(
      (name) => name.includes(window.destination) || window.destination.includes(name)
    );
    if (!isMatch) continue;
    if (window.avoidMonths.includes(month)) {
      return `⚠️ Weather advisory for ${window.destination}: ${window.reason}`;
    }
  }
  return null;
}
