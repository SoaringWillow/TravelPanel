// Server-side only — called from /api/plan

export interface WeatherSignal {
  minTemp: number;
  maxTemp: number;
  conditions: string; // human-readable e.g. "partly cloudy"
}

export interface HolidaySignal {
  name: string;
  date: string; // ISO date "YYYY-MM-DD"
}

export interface DestSignals {
  weather?: WeatherSignal;
  holidays?: HolidaySignal[];
  countryCode?: string;
}

// WMO weather interpretation codes → short description
const WMO_CODES: Record<number, string> = {
  0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'foggy', 48: 'icy fog',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow',
  80: 'rain showers', 81: 'heavy showers', 82: 'violent showers',
  95: 'thunderstorm', 96: 'thunderstorm with hail',
};

// Module-level cache (lasts until the process restarts — fine for serverless warm instances)
const cache = new Map<string, { data: DestSignals; ts: number }>();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'TravelPanel/1.0 (contact@travelpanel.app)' },
    });
  } finally {
    clearTimeout(id);
  }
}

async function fetchCountryCode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    );
    if (!res.ok) return null;
    const json = await res.json() as { address?: { country_code?: string } };
    return json.address?.country_code?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherSignal | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=3`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const json = await res.json() as {
      daily?: {
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        weathercode?: number[];
      };
    };
    const d = json.daily;
    if (!d?.temperature_2m_max?.length) return null;

    const maxTemps = d.temperature_2m_max;
    const minTemps = d.temperature_2m_min ?? maxTemps;
    const codes    = d.weathercode ?? [];

    const avgMax = Math.round(maxTemps.reduce((s, v) => s + v, 0) / maxTemps.length);
    const avgMin = Math.round(minTemps.reduce((s, v) => s + v, 0) / minTemps.length);
    const mostFreqCode = codes.sort(
      (a, b) => codes.filter((c) => c === b).length - codes.filter((c) => c === a).length,
    )[0] ?? 0;

    return {
      minTemp:    avgMin,
      maxTemp:    avgMax,
      conditions: WMO_CODES[mostFreqCode] ?? 'variable',
    };
  } catch {
    return null;
  }
}

async function fetchHolidays(countryCode: string, year: number): Promise<HolidaySignal[]> {
  try {
    const res = await fetchWithTimeout(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
    );
    if (!res.ok) return [];
    const json = await res.json() as { date: string; name: string }[];
    // Return only next 60 days' worth
    const now = Date.now();
    return json
      .filter((h) => {
        const d = new Date(h.date).getTime();
        return d >= now && d <= now + 60 * 24 * 60 * 60 * 1000;
      })
      .map((h) => ({ name: h.name, date: h.date }));
  } catch {
    return [];
  }
}

export async function fetchDestinationSignals(lat: number, lng: number): Promise<DestSignals> {
  const key = cacheKey(lat, lng);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < WEEK_MS) return cached.data;

  const [countryCode, weather] = await Promise.all([
    fetchCountryCode(lat, lng),
    fetchWeather(lat, lng),
  ]);

  const holidays = countryCode
    ? await fetchHolidays(countryCode, new Date().getFullYear())
    : [];

  const data: DestSignals = {
    weather:     weather ?? undefined,
    holidays:    holidays.length > 0 ? holidays : undefined,
    countryCode: countryCode ?? undefined,
  };

  cache.set(key, { data, ts: Date.now() });
  return data;
}

export function formatSignalsForPrompt(signals: DestSignals): string {
  const parts: string[] = [];

  if (signals.weather) {
    const w = signals.weather;
    parts.push(`Weather forecast (next 3 days): ${w.minTemp}–${w.maxTemp}°C, ${w.conditions}`);
  }

  if (signals.holidays && signals.holidays.length > 0) {
    const h = signals.holidays;
    parts.push(`Upcoming public holidays (next 60 days): ${h.map((x) => `${x.name} (${x.date})`).join(', ')}`);
  }

  return parts.length > 0
    ? `\nReal-world context for this destination:\n${parts.map((p) => `- ${p}`).join('\n')}\n`
    : '';
}
