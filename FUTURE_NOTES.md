# TravelPanel — Future Revisit Notes

Topics deferred from Round 2 testing. Each item has a rough effort estimate and clear next step.

---

## 1. 🌐 Chinese / Multilingual UI

**Status**: Deferred — all UI strings are in English only.

**Approach**: Add `next-intl`, extract all user-facing strings into `en.json` / `zh.json`. The key UI is entirely in components (no DB-side strings), so extraction is mechanical but tedious.

**Effort**: ~2–3 hours.

**Starting point**: `npm install next-intl`, wrap `app/layout.tsx` with `NextIntlClientProvider`, replace all string literals in components with `useTranslations()` calls.

---

## 2. 📸 Better Thumbnail Extraction for Xiaohongshu / WeChat

**Status**: Deferred — OG images from Chinese platforms are blocked by CORS.

**Details**: The server-side `fetchPageData` function in `app/api/import/route.ts` already runs server-side (no CORS), but Xiaohongshu/RED aggressively blocks scraping. WeChat articles sometimes work.

**Options to explore**:
- Try harder CSS selectors in the OG meta extraction (e.g. `twitter:image`, `og:image:secure_url`)
- RED Book may need auth cookies; consider a share-sheet image attachment flow instead (iOS Share Sheet can attach the image directly)
- For WeChat: the public article image is usually accessible; test harder selectors

**Effort**: 1–2 hours of experimentation.

---

## 3. 🎬 Video Content Analysis

**Status**: Deferred — YouTube HTML scraping yields almost no useful content (no transcript).

**Details**: Currently, a YouTube URL gives Claude only the page title and description. The actual video content (destinations mentioned, activities shown) is not extracted.

**Options to explore**:
- **YouTube Data API v3**: Captions endpoint returns transcript text for public videos with captions enabled. Requires a free API key.
- **yt-dlp** (server-side): Download subtitle track without downloading video. Can run as a child process in the API route.
- **Whisper** (audio): Download audio stream → run Whisper STT → feed transcript to Claude. Higher quality but slower and more expensive.
- **Semantic activity deduplication**: Same place appears under different names across clips (e.g. "Shibuya crossing" vs "scramble crossing Shibuya"). Add a Claude cluster-by-meaning step in `/api/import` using embeddings or a `generateObject` grouping pass.

**Effort**: 2–4 hours depending on approach.

---

## 4. 🌤 Weather + Special Events for Trip Planning

**Status**: Deferred — currently the AI planner has no awareness of weather or local events.

**Approach**: Add an enrichment pass inside `/api/plan/route.ts` before generating the final itinerary:
1. Fetch weather forecast for each destination using **OpenWeatherMap** free tier (5-day/3-hour forecast)
2. Flag major events (festivals, public holidays, peak crowds) via a Claude `generateObject` search step
3. Pass this context into the final `streamObject` prompt so the itinerary accounts for rain days, holiday closures, etc.

**Effort**: 2–3 hours.

**API key needed**: OpenWeatherMap (free tier, no credit card).

---

## 5. 📱 True iOS Native Share Extension

**Status**: Deferred — current PWA share integration requires "Add to Home Screen" first.

**Details**: The Web Share Target API works once the PWA is installed, but getting users past "Add to Home Screen" is a real friction point. A native share extension would appear in every iOS app's share sheet without any setup.

**Options**:
- **React Native** with a Share Extension target: substantial rewrite of the UI layer
- **Swift Share Extension** that calls the same `/api/import` backend: smaller scope, but requires maintaining two codebases
- **Interim**: Document the "Add to Home Screen" flow clearly in onboarding; add a banner on first visit pointing users to install the PWA

**Effort**: Native = 1–2 weeks. PWA onboarding = 2–3 hours.

---

*Last updated: Round 2 polish pass (May 2026)*
