import { generateText } from 'ai';
import { models } from './models';

interface WeatherDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  code: number;
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Heavy drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Moderate showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm w/ hail',
};

function describeWeather(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? 'Variable';
}

async function geocodeLocation(name: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as { results?: Array<{ latitude: number; longitude: number; name: string; country?: string }> };
    const r = data.results?.[0];
    if (!r) return null;
    return { lat: r.latitude, lng: r.longitude, displayName: `${r.name}${r.country ? `, ${r.country}` : ''}` };
  } catch {
    return null;
  }
}

async function fetchWeather(lat: number, lng: number, days: number): Promise<WeatherDay[] | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&forecast_days=${Math.min(days, 16)}&timezone=auto`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        weathercode: number[];
      };
    };
    return data.daily.time.map((date, i) => ({
      date,
      maxTemp: Math.round(data.daily.temperature_2m_max[i]),
      minTemp: Math.round(data.daily.temperature_2m_min[i]),
      precipitation: Math.round(data.daily.precipitation_sum[i] * 10) / 10,
      code: data.daily.weathercode[i],
    }));
  } catch {
    return null;
  }
}

function formatWeatherSummary(days: WeatherDay[], location: string): string {
  const lines = days.map((d) =>
    `${d.date}: ${describeWeather(d.code)}, ${d.minTemp}–${d.maxTemp}°C${d.precipitation > 0 ? `, ${d.precipitation}mm rain` : ''}`
  );
  return `Weather forecast for ${location}:\n${lines.join('\n')}`;
}

async function fetchEventSignals(location: string, startDate: string, days: number): Promise<string> {
  const endDate = new Date(new Date(startDate).getTime() + days * 86400000)
    .toISOString().slice(0, 10);

  try {
    const { text } = await generateText({
      model: models.enrichment,
      prompt: `List major annual events, festivals, public holidays, or seasonal highlights happening in or near ${location} between ${startDate} and ${endDate}. Focus on events that would affect a traveller's plans: crowds, closures, special experiences, or price surges. Be concise — 2–5 bullet points. If nothing notable, say "No major events identified for this period." Do NOT fabricate events you're unsure about.`,
    });
    return text.trim();
  } catch {
    return 'Event signals unavailable.';
  }
}

export interface EnrichmentSignals {
  weather: string | null;
  events: string;
  location: string;
}

export async function getEnrichmentSignals(
  rawLocation: string,
  startDate: string,
  tripDays: number
): Promise<EnrichmentSignals> {
  const [geo, events] = await Promise.all([
    geocodeLocation(rawLocation),
    fetchEventSignals(rawLocation, startDate, tripDays),
  ]);

  let weather: string | null = null;
  if (geo) {
    const weatherDays = await fetchWeather(geo.lat, geo.lng, tripDays + 3);
    if (weatherDays) {
      weather = formatWeatherSummary(weatherDays.slice(0, tripDays), geo.displayName);
    }
  }

  return {
    weather,
    events,
    location: geo?.displayName ?? rawLocation,
  };
}
