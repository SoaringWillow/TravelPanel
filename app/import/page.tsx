'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, MapPin, CheckCircle2, AlertCircle, Loader2, Link } from 'lucide-react';
import { saveItem } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';
import type { SavedItem, Location } from '@/lib/types';

// ─── Parsers ─────────────────────────────────────────────────────────────────

interface ParsedPlace {
  title: string;
  url: string;
  lat?: number;
  lng?: number;
}

function parseGoogleMapsJSON(text: string): ParsedPlace[] {
  try {
    const data = JSON.parse(text);
    const results: ParsedPlace[] = [];

    // GeoJSON FeatureCollection (Takeout format)
    if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
      for (const f of data.features) {
        const title = f.properties?.Title ?? f.properties?.name ?? '';
        const url = f.properties?.['Google Maps URL'] ?? f.properties?.url ?? '';
        const coords = f.geometry?.coordinates;
        if (title) {
          results.push({
            title,
            url: url || `https://maps.google.com/?q=${encodeURIComponent(title)}`,
            lng: Array.isArray(coords) ? coords[0] : undefined,
            lat: Array.isArray(coords) ? coords[1] : undefined,
          });
        }
      }
      return results;
    }

    // Array of saved places (simpler Takeout format)
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.Title) {
          results.push({ title: item.Title, url: item.URL ?? item.url ?? '' });
        }
      }
      return results;
    }
  } catch {
    // fall through
  }
  return [];
}

const TRAVEL_RE = /hotel|hostel|restaurant|cafe|café|temple|shrine|museum|beach|park|attraction|tour|travel|visit|sight|monument|castle|market|bazaar|district|landmark|gallery/i;

function parseBookmarksHTML(html: string): ParsedPlace[] {
  if (typeof document === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  return anchors
    .filter((a) => {
      const href = (a as HTMLAnchorElement).href ?? '';
      const title = a.textContent ?? '';
      return (
        href.startsWith('http') &&
        (TRAVEL_RE.test(title) || TRAVEL_RE.test(href))
      );
    })
    .slice(0, 100)
    .map((a) => ({
      title: a.textContent?.trim() ?? '',
      url: (a as HTMLAnchorElement).href,
    }));
}

function parseAppleMapsURL(raw: string): ParsedPlace | null {
  try {
    const url = new URL(raw.trim());
    if (!url.hostname.includes('maps.apple.com') && !url.hostname.includes('maps.google.com')) return null;
    const ll = url.searchParams.get('ll') ?? url.searchParams.get('sll');
    const q = url.searchParams.get('q') ?? url.searchParams.get('near') ?? '';
    if (ll) {
      const [lat, lng] = ll.split(',').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { title: q || 'Unnamed place', url: raw.trim(), lat, lng };
      }
    }
    if (q) return { title: q, url: raw.trim() };
  } catch {
    // invalid URL
  }
  return null;
}

// ─── Import helpers ────────────────────────────────────────────────────────────

function createClipFromPlace(place: ParsedPlace): SavedItem {
  const id = crypto.randomUUID();
  const locations: Location[] = [];
  if (place.lat !== undefined && place.lng !== undefined && Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    locations.push({ lat: place.lat, lng: place.lng, name: place.title });
  }
  return {
    id,
    url: place.url || `https://maps.google.com/?q=${encodeURIComponent(place.title)}`,
    platform: 'other',
    title: place.title,
    description: '',
    locations,
    activities: [],
    tags: [],
    substance: [],
    savedAt: Date.now(),
    enrichmentStatus: locations.length > 0 ? 'done' : 'pending',
    retryCount: 0,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'google' | 'bookmarks' | 'apple';
type ImportStatus = 'idle' | 'previewing' | 'importing' | 'done' | 'error';

export default function ImportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('google');
  const [previews, setPreviews] = useState<ParsedPlace[]>([]);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [appleUrl, setAppleUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      let parsed: ParsedPlace[] = [];
      if (tab === 'google') parsed = parseGoogleMapsJSON(text);
      else if (tab === 'bookmarks') parsed = parseBookmarksHTML(text);
      if (parsed.length === 0) {
        setErrorMsg('No places found in this file. Make sure it\'s a Google Maps or browser bookmarks export.');
        setStatus('error');
      } else {
        setPreviews(parsed.slice(0, 200));
        setStatus('previewing');
        setErrorMsg('');
      }
    };
    reader.readAsText(file);
  }

  function handleApplePaste() {
    const place = parseAppleMapsURL(appleUrl);
    if (!place) {
      setErrorMsg('Could not parse this link. Try a Maps.apple.com or Maps.google.com URL with ?ll=lat,lng');
      setStatus('error');
      return;
    }
    setPreviews([place]);
    setStatus('previewing');
    setErrorMsg('');
  }

  async function handleImport() {
    setStatus('importing');
    setProgress(0);
    let count = 0;

    for (let i = 0; i < previews.length; i++) {
      const clip = createClipFromPlace(previews[i]);
      await saveItem(clip);
      // For pending items, kick off enrichment (best-effort)
      if (clip.enrichmentStatus === 'pending' && clip.url.startsWith('http')) {
        enrichItem(clip.id, clip.url).catch(() => {});
      }
      count++;
      setProgress(Math.round((i + 1) / previews.length * 100));
      // Small delay between enrichment calls
      if (clip.enrichmentStatus === 'pending') await new Promise((r) => setTimeout(r, 300));
    }

    setImportedCount(count);
    setStatus('done');
  }

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: 'google', label: 'Google Maps', emoji: '🗺' },
    { key: 'bookmarks', label: 'Bookmarks', emoji: '🔖' },
    { key: 'apple', label: 'Maps Link', emoji: '📍' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="p-2 -ml-1 text-gray-500 hover:text-gray-800">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Import Places</h1>
          <p className="text-xs text-gray-500">From Google Maps, bookmarks, or a link</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setStatus('idle'); setPreviews([]); setErrorMsg(''); }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                tab === t.key ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Google Maps / Bookmarks — file upload */}
        {(tab === 'google' || tab === 'bookmarks') && status === 'idle' && (
          <div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-4 text-xs text-indigo-700 leading-relaxed space-y-1">
              {tab === 'google' ? (
                <>
                  <p className="font-semibold">How to export from Google Maps:</p>
                  <p>1. Go to Google Takeout → select "Maps (your places)"</p>
                  <p>2. Download the ZIP → find <strong>Saved Places.json</strong></p>
                  <p>3. Upload it below</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">How to export browser bookmarks:</p>
                  <p>Chrome/Safari: Bookmarks Manager → Export (saves as .html)</p>
                  <p>We'll filter for travel-related bookmarks automatically.</p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl py-10 hover:border-indigo-300 hover:bg-indigo-50 transition-all active:scale-[0.99]"
            >
              <Upload size={28} className="text-gray-300" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">
                  {tab === 'google' ? 'Upload Saved Places.json' : 'Upload bookmarks.html'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Tap to choose file</p>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={tab === 'google' ? '.json,application/json' : '.html,text/html'}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Apple Maps / Google Maps link */}
        {tab === 'apple' && status === 'idle' && (
          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 text-xs text-indigo-700 leading-relaxed space-y-1">
              <p className="font-semibold">Paste a Maps link:</p>
              <p>Share any place from Apple Maps or Google Maps — tap the Share button and copy the link.</p>
              <p>Needs a link with <code className="bg-indigo-100 px-1 rounded">?ll=lat,lng</code> coordinates.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={appleUrl}
                onChange={(e) => setAppleUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplePaste()}
                placeholder="https://maps.apple.com/?ll=35.68,139.76&q=Tokyo"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={handleApplePaste}
                disabled={!appleUrl.trim()}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40"
              >
                <Link size={14} />
                Parse
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Parse error</p>
              <p className="text-xs mt-0.5 leading-relaxed">{errorMsg}</p>
              <button type="button" onClick={() => setStatus('idle')} className="text-xs text-red-600 font-semibold mt-2 hover:underline">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {status === 'previewing' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">
                Found {previews.length} place{previews.length !== 1 ? 's' : ''}
              </h2>
              <button type="button" onClick={() => { setStatus('idle'); setPreviews([]); }} className="text-xs text-gray-400 hover:text-gray-600">
                Clear
              </button>
            </div>

            {/* Preview list */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {previews.slice(0, 8).map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <MapPin size={14} className={`flex-shrink-0 ${p.lat ? 'text-indigo-400' : 'text-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400 truncate">{p.lat ? `${p.lat.toFixed(4)}, ${p.lng?.toFixed(4)}` : p.url.slice(0, 40)}</p>
                  </div>
                </div>
              ))}
              {previews.length > 8 && (
                <div className="px-4 py-2.5 text-xs text-gray-400">
                  +{previews.length - 8} more places…
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleImport}
              className="w-full bg-indigo-600 text-white font-semibold text-sm py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm"
            >
              Import {previews.length} place{previews.length !== 1 ? 's' : ''} to Inbox
            </button>
          </div>
        )}

        {/* Importing progress */}
        {status === 'importing' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-4">
            <Loader2 size={28} className="text-indigo-500 animate-spin mx-auto" />
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Importing places…</p>
              <p className="text-xs text-gray-500">{progress}% complete</p>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Done */}
        {status === 'done' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-4">
            <CheckCircle2 size={36} className="text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-bold text-gray-900">{importedCount} places imported</p>
              <p className="text-sm text-gray-500 mt-1">
                Clips with coordinates are ready. Others will be enriched by AI shortly.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/inbox')}
                className="flex-1 bg-indigo-600 text-white font-semibold text-sm py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                Go to Inbox
              </button>
              <button
                type="button"
                onClick={() => { setStatus('idle'); setPreviews([]); setProgress(0); setImportedCount(0); setAppleUrl(''); }}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold text-sm py-3 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                Import more
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
