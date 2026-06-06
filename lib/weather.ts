// WMO Weather Interpretation Code → human-readable description
const WMO_CODES: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Moderate showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm',
};

function wmoEmoji(code: number): string {
  if (code === 0 || code === 1) return '☀️';
  if (code === 2 || code === 3) return '⛅';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

interface DayWeather {
  date: string;
  maxTemp: number;
  precipitation: number;
  weatherCode: number;
  description: string;
  emoji: string;
}

export interface WeatherSummary {
  days: DayWeather[];
  /** Short paragraph for injection into the Claude prompt */
  prompt: string;
}

export async function fetchWeatherSummary(
  lat: number,
  lng: number,
  startDateISO: string,
  numDays: number
): Promise<WeatherSummary | null> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lng.toFixed(4));
    url.searchParams.set('daily', 'weathercode,temperature_2m_max,precipitation_sum');
    url.searchParams.set('forecast_days', String(Math.min(numDays, 16)));
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('start_date', startDateISO);
    url.searchParams.set('end_date', addDays(startDateISO, numDays - 1));

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    const dates: string[] = data.daily?.time ?? [];
    const codes: number[] = data.daily?.weathercode ?? [];
    const temps: number[] = data.daily?.temperature_2m_max ?? [];
    const precips: number[] = data.daily?.precipitation_sum ?? [];

    if (dates.length === 0) return null;

    const days: DayWeather[] = dates.slice(0, numDays).map((date, i) => ({
      date,
      maxTemp: Math.round(temps[i] ?? 20),
      precipitation: Math.round((precips[i] ?? 0) * 10) / 10,
      weatherCode: codes[i] ?? 0,
      description: WMO_CODES[codes[i]] ?? 'Variable',
      emoji: wmoEmoji(codes[i] ?? 0),
    }));

    const prompt =
      `Weather forecast for this trip:\n` +
      days
        .map(
          (d, i) =>
            `Day ${i + 1} (${d.date}): ${d.emoji} ${d.description}, ${d.maxTemp}°C max` +
            (d.precipitation > 0 ? `, ${d.precipitation}mm rain` : '')
        )
        .join('\n') +
      `\nAdjust outdoor/indoor activity balance accordingly. Flag rain days for indoor alternatives.`;

    return { days, prompt };
  } catch {
    return null;
  }
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
