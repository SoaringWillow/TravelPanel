// Static dataset of major annual events that affect travel planning.
// startMonth / endMonth are 0-indexed (Jan = 0).

export interface FestivalEvent {
  name: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  startMonth: number;
  endMonth: number;
  crowdMultiplier: number;  // 1 = normal, 2 = double crowds
  priceMultiplier: number;  // 1 = normal, 1.4 = 40% higher
  notes: string;
}

export const FESTIVALS: FestivalEvent[] = [
  // Japan
  { name: 'Cherry Blossom Season', location: 'Tokyo', country: 'Japan', lat: 35.68, lng: 139.69, startMonth: 2, endMonth: 3, crowdMultiplier: 2.5, priceMultiplier: 1.3, notes: 'Peak bloom late March–early April. Ueno Park, Shinjuku Gyoen extremely crowded. Book accommodation months ahead.' },
  { name: 'Cherry Blossom Season', location: 'Kyoto', country: 'Japan', lat: 35.01, lng: 135.76, startMonth: 2, endMonth: 3, crowdMultiplier: 3.0, priceMultiplier: 1.5, notes: 'Maruyama Park and Philosopher\'s Path peak late March. Hotels sell out 6+ months ahead.' },
  { name: 'Golden Week', location: 'Japan', country: 'Japan', lat: 35.68, lng: 139.69, startMonth: 3, endMonth: 4, crowdMultiplier: 3.0, priceMultiplier: 1.8, notes: 'April 29–May 5. Domestic travel peaks; trains, hotels fully booked. Avoid major tourist sites.' },
  { name: 'Gion Matsuri', location: 'Kyoto', country: 'Japan', lat: 35.01, lng: 135.76, startMonth: 6, endMonth: 6, crowdMultiplier: 2.5, priceMultiplier: 1.4, notes: 'July festival with grand procession on July 17. Extremely crowded central Kyoto.' },
  { name: 'Awa Odori', location: 'Tokushima', country: 'Japan', lat: 34.07, lng: 134.55, startMonth: 7, endMonth: 7, crowdMultiplier: 2.0, priceMultiplier: 1.3, notes: 'August 12–15 dance festival. Hotel rooms book out far in advance.' },
  { name: 'Autumn Foliage Season', location: 'Nikko', country: 'Japan', lat: 36.72, lng: 139.60, startMonth: 9, endMonth: 10, crowdMultiplier: 2.0, priceMultiplier: 1.2, notes: 'Late October–November peak. Weekends extremely crowded.' },

  // Thailand
  { name: 'Songkran Water Festival', location: 'Bangkok', country: 'Thailand', lat: 13.75, lng: 100.50, startMonth: 3, endMonth: 3, crowdMultiplier: 2.0, priceMultiplier: 1.2, notes: 'April 13–15 Thai New Year. Streets become water battles; expect drenching everywhere. Most shops close.' },
  { name: 'Songkran Water Festival', location: 'Chiang Mai', country: 'Thailand', lat: 18.79, lng: 98.98, startMonth: 3, endMonth: 3, crowdMultiplier: 3.0, priceMultiplier: 1.4, notes: 'Most famous Songkran in Thailand. Old City moat area is water-battle epicentre for 3–7 days.' },
  { name: 'Loi Krathong', location: 'Chiang Mai', country: 'Thailand', lat: 18.79, lng: 98.98, startMonth: 10, endMonth: 10, crowdMultiplier: 2.5, priceMultiplier: 1.3, notes: 'November full moon lantern festival. Sky lanterns light up the city. Book far ahead.' },

  // China / East Asia
  { name: 'Chinese New Year', location: 'Beijing', country: 'China', lat: 39.91, lng: 116.39, startMonth: 0, endMonth: 1, crowdMultiplier: 0.5, priceMultiplier: 1.4, notes: 'Jan/Feb. Huge portions of population travel home; many businesses closed for 1–2 weeks. Tourist sites may be crowded with domestic tourists.' },
  { name: 'Chinese New Year', location: 'Shanghai', country: 'China', lat: 31.22, lng: 121.47, startMonth: 0, endMonth: 1, crowdMultiplier: 0.6, priceMultiplier: 1.3, notes: 'Many Shanghainese leave for home provinces; city feels quieter but major sites may be busier with tourists.' },
  { name: 'Harbin Ice Festival', location: 'Harbin', country: 'China', lat: 45.80, lng: 126.53, startMonth: 11, endMonth: 1, crowdMultiplier: 2.0, priceMultiplier: 1.3, notes: 'January–February world-famous ice sculptures. Temperatures drop to -25°C. Must-see but dress extremely warmly.' },

  // Brazil
  { name: 'Rio Carnival', location: 'Rio de Janeiro', country: 'Brazil', lat: -22.91, lng: -43.17, startMonth: 1, endMonth: 2, crowdMultiplier: 4.0, priceMultiplier: 3.0, notes: 'Friday before Ash Wednesday. Most expensive and crowded week of the year. 5–7M visitors. Book a year ahead. Sambadrome or street blocks.' },

  // India
  { name: 'Diwali', location: 'Jaipur', country: 'India', lat: 26.91, lng: 75.79, startMonth: 9, endMonth: 10, crowdMultiplier: 2.0, priceMultiplier: 1.2, notes: 'October/November. Festival of Lights. Spectacular fireworks, streets decorated. Jaipur and Varanasi especially atmospheric.' },
  { name: 'Holi', location: 'Mathura', country: 'India', lat: 27.49, lng: 77.67, startMonth: 2, endMonth: 2, crowdMultiplier: 3.0, priceMultiplier: 1.2, notes: 'March. Festival of Colours. Barsana and Mathura most famous. Clothes will be permanently stained; protect electronics.' },
  { name: 'Pushkar Camel Fair', location: 'Pushkar', country: 'India', lat: 26.49, lng: 74.55, startMonth: 10, endMonth: 10, crowdMultiplier: 3.0, priceMultiplier: 1.5, notes: 'November. 200,000+ camels, horses, cattle. Unique desert spectacle.' },

  // Europe
  { name: 'Oktoberfest', location: 'Munich', country: 'Germany', lat: 48.13, lng: 11.58, startMonth: 8, endMonth: 9, crowdMultiplier: 2.5, priceMultiplier: 2.0, notes: 'Late September–first Sunday of October. 6M visitors. Accommodation at 3–4× normal prices. Book tents in advance.' },
  { name: 'Edinburgh Fringe', location: 'Edinburgh', country: 'UK', lat: 55.95, lng: -3.19, startMonth: 7, endMonth: 7, crowdMultiplier: 3.0, priceMultiplier: 2.5, notes: 'August. Largest arts festival on earth. 3M tickets sold. Accommodation 4× normal price; book 6+ months ahead.' },
  { name: 'La Tomatina', location: 'Buñol', country: 'Spain', lat: 39.42, lng: -0.79, startMonth: 7, endMonth: 7, crowdMultiplier: 5.0, priceMultiplier: 1.0, notes: 'Last Wednesday of August. Tomato fight in small town 40km from Valencia. Ticketed; wear old clothes.' },
  { name: 'Running of the Bulls', location: 'Pamplona', country: 'Spain', lat: 42.82, lng: -1.64, startMonth: 6, endMonth: 6, crowdMultiplier: 3.0, priceMultiplier: 2.0, notes: 'July 6–14 San Fermín festival. Daily bull run 8am. Hotels 300–500% premium; many camp nearby.' },
  { name: 'Venice Carnival', location: 'Venice', country: 'Italy', lat: 45.44, lng: 12.32, startMonth: 1, endMonth: 2, crowdMultiplier: 3.0, priceMultiplier: 2.0, notes: '2 weeks before Ash Wednesday. Masks and costumes fill the city. Expect 3M visitors across the festival.' },
  { name: 'Bastille Day', location: 'Paris', country: 'France', lat: 48.86, lng: 2.35, startMonth: 6, endMonth: 6, crowdMultiplier: 2.0, priceMultiplier: 1.3, notes: 'July 14. Fireworks at Eiffel Tower draw huge crowds. Book viewing spots hours ahead.' },
  { name: 'Christmas Markets', location: 'Nuremberg', country: 'Germany', lat: 49.45, lng: 11.08, startMonth: 10, endMonth: 11, crowdMultiplier: 2.0, priceMultiplier: 1.3, notes: 'Late November–December 24. Famous Christkindlesmarkt. Crowded weekends but magical atmosphere.' },

  // USA
  { name: 'Coachella', location: 'Indio', country: 'USA', lat: 33.68, lng: -116.24, startMonth: 3, endMonth: 3, crowdMultiplier: 3.0, priceMultiplier: 3.0, notes: 'Two weekends in April. Palm Springs accommodation inflated 500%+. Nearby cities affected too.' },
  { name: 'Mardi Gras', location: 'New Orleans', country: 'USA', lat: 29.95, lng: -90.07, startMonth: 1, endMonth: 2, crowdMultiplier: 3.5, priceMultiplier: 2.5, notes: 'Fat Tuesday (day before Ash Wednesday). French Quarter overwhelmed. Book accommodation 6+ months ahead.' },
  { name: 'Burning Man', location: 'Black Rock City', country: 'USA', lat: 40.79, lng: -119.20, startMonth: 7, endMonth: 8, crowdMultiplier: 1.0, priceMultiplier: 1.0, notes: 'Late August–early September. 70,000 attendees in Nevada desert. Self-reliant event; no ticket sales at gate.' },

  // Middle East / Africa
  { name: 'Ramadan', location: 'Dubai', country: 'UAE', lat: 25.20, lng: 55.27, startMonth: 2, endMonth: 3, crowdMultiplier: 0.8, priceMultiplier: 0.8, notes: 'Month-long (dates vary). Many restaurants closed during daylight. Avoid eating/drinking in public. Beautiful night atmosphere.' },
  { name: 'Marrakech Moussem of Tan-Tan', location: 'Marrakech', country: 'Morocco', lat: 31.63, lng: -7.99, startMonth: 3, endMonth: 4, crowdMultiplier: 2.0, priceMultiplier: 1.2, notes: 'Spring. Nomadic cultural festival. Medina hotels book up quickly.' },

  // South Korea
  { name: 'Cherry Blossom Season', location: 'Seoul', country: 'South Korea', lat: 37.57, lng: 126.98, startMonth: 3, endMonth: 3, crowdMultiplier: 2.0, priceMultiplier: 1.2, notes: 'Late March–early April. Yeouido Hangang Park and Namsan especially crowded weekends.' },

  // Taiwan
  { name: 'Lantern Festival', location: 'Pingxi', country: 'Taiwan', lat: 25.02, lng: 121.74, startMonth: 1, endMonth: 1, crowdMultiplier: 4.0, priceMultiplier: 1.3, notes: '15th day of Lunar New Year. Sky lanterns released. Very crowded; arrive early.' },

  // Australia
  { name: 'Sydney New Year\'s Eve Fireworks', location: 'Sydney', country: 'Australia', lat: -33.86, lng: 151.21, startMonth: 11, endMonth: 11, crowdMultiplier: 4.0, priceMultiplier: 2.5, notes: 'December 31. Harbour Bridge fireworks attract 1M+. Secure vantage point hours in advance.' },

  // Mexico
  { name: 'Día de los Muertos', location: 'Oaxaca', country: 'Mexico', lat: 17.06, lng: -96.72, startMonth: 9, endMonth: 10, crowdMultiplier: 2.5, priceMultiplier: 1.4, notes: 'Nov 1–2. Most authentic celebrations in Oaxaca and Michoacán. Cemeteries, parades, altars. Book accommodation well ahead.' },

  // Peru
  { name: 'Inti Raymi', location: 'Cusco', country: 'Peru', lat: -13.53, lng: -71.97, startMonth: 5, endMonth: 5, crowdMultiplier: 2.5, priceMultiplier: 1.5, notes: 'June 24 Inca Festival of the Sun at Sacsayhuamán. June is shoulder season but this week is hectic.' },
];

// ─── Query helpers ────────────────────────────────────────────────────────────

function distanceDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
}

// Return festivals relevant to a set of locations during a date range.
// Matches by: geographic proximity (within ~5 degrees ≈ 500km) AND month overlap.
export function getRelevantFestivals(
  locationCoords: Array<{ lat: number; lng: number; name: string }>,
  startDate: Date,
  endDate: Date
): FestivalEvent[] {
  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();

  return FESTIVALS.filter((f) => {
    // Month overlap (handle year wrap)
    const monthInRange = startMonth <= endMonth
      ? f.startMonth <= endMonth && f.endMonth >= startMonth
      : f.startMonth >= startMonth || f.endMonth <= endMonth;

    if (!monthInRange) return false;

    // Geographic proximity
    return locationCoords.some(
      (loc) => distanceDeg(loc.lat, loc.lng, f.lat, f.lng) < 5
    );
  });
}

// Format festivals as a context string for the planner prompt.
export function formatFestivalContext(festivals: FestivalEvent[]): string {
  if (festivals.length === 0) return '';

  const lines = festivals.map((f) =>
    `⚠️ ${f.name} (${f.location}, ${f.country}): ${f.notes} — expect ${
      f.crowdMultiplier > 1.5 ? `${Math.round((f.crowdMultiplier - 1) * 100)}% more crowds` : 'moderate extra crowds'
    }${f.priceMultiplier > 1.1 ? ` and ~${Math.round((f.priceMultiplier - 1) * 100)}% higher prices` : ''}.`
  );

  return `\n\nREAL-WORLD EVENTS DURING THIS TRIP:\n${lines.join('\n')}\nPlease factor these events into timing recommendations and include relevant warnings in the plan.`;
}
