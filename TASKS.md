# TravelPanel — Task Queue

> This file is the autonomous work queue. Each Claude session reads this file, picks the next `[ ]` task, implements it, marks it `[x]`, commits, and moves to the next. Sessions are logged in SESSIONS.md.
>
> **Task format**: Each task has enough detail to implement without further clarification.
> **Priority order**: Work top-to-bottom within each phase. Don't skip phases.

---

## ⭐ Goal: Beautiful, Fully Functional iOS App (revised 2026-06-05)

All Phase A tasks are done. Phase B's actionable tasks are done (B4 blocked on Supabase
keys; B1 scaffolded, dormant until keys). The remaining work is **iOS polish + Phase C
features** that make TravelPanel feel like a native app people love.

Priority order: `C1 → C2 → C3 → C4 → C5 → C6 → C7 → D1 → D2 → D3 → D4`

---

## PHASE C — iOS Polish (Current Sprint)

### C1 — Error Boundary + Map Fallback
**Status**: `[ ]` Not started
**Why**: Unhandled React errors crash the whole app with a white screen. A map load
failure shows nothing. This is the most visible stability gap.
**Files**: new `components/ErrorBoundary.tsx`, `app/layout.tsx`, `components/MapView.tsx`
**What to do**:
- Create `components/ErrorBoundary.tsx` — class component that catches render errors,
  shows a friendly "Something went wrong" screen with a "Reload" button
  (`window.location.reload()`)
- Wrap `{children}` in `app/layout.tsx` with `<ErrorBoundary>`
- In `components/MapView.tsx`, wrap the MapLibre init in try/catch; if map fails to
  load, show a fallback `<div>` with indigo background, "Map unavailable" text and
  a list of saved locations as text instead

### C2 — Haptic Feedback
**Status**: `[ ]` Not started
**Why**: Native iOS apps vibrate on key actions. This single change makes TravelPanel
feel 10× more native with almost no code.
**Files**: new `lib/haptics.ts`, then call it in the right places
**What to do**:
- Create `lib/haptics.ts` with:
  ```typescript
  export async function haptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (['light','medium','heavy'].includes(style)) {
        await Haptics.impact({ style: style === 'light' ? ImpactStyle.Light : style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy });
      } else {
        const type = style === 'success' ? NotificationType.Success : style === 'warning' ? NotificationType.Warning : NotificationType.Error;
        await Haptics.notification({ type });
      }
    } catch {} // no-op outside Capacitor
  }
  ```
- Install `@capacitor/haptics`: add to package.json dependencies (`^6.0.0`)
- Trigger haptics:
  - `haptic('success')` when a clip is saved (in `app/share/page.tsx` handleSave after success)
  - `haptic('medium')` when a board is created (`hooks/useBoards.ts` createBoard)
  - `haptic('success')` when a plan is generated (`app/plan/[boardId]/page.tsx` on plan complete)
  - `haptic('error')` when enrichment fails (in `lib/enrichItem.ts` catch block)
  - `haptic('light')` on every NavBar tab tap (in `components/NavBar.tsx` each Link)

### C3 — Pull-to-Refresh on Inbox and Boards
**Status**: `[ ]` Not started
**Why**: iOS users swipe down to refresh as muscle memory. Missing it feels broken.
**Files**: `app/inbox/page.tsx`, `app/boards/page.tsx`, new `hooks/usePullToRefresh.ts`
**What to do**:
- Create `hooks/usePullToRefresh.ts`:
  - Listen for `touchstart` / `touchmove` / `touchend` on the scroll container ref
  - If the scroll position is at the top AND the user drags down ≥ 60px, trigger refresh
  - Show an animated spinner (indigo, positioned above the list) during the pull/refresh
  - On release (or at 60px threshold), call the provided `onRefresh` callback
  - Animate the list content down by the pull distance (max 80px) during drag
- Wire into `app/inbox/page.tsx`: refresh = reload items from IndexedDB
- Wire into `app/boards/page.tsx`: refresh = reload boards from IndexedDB
- The hook should be disabled when scroll position > 0 (standard iOS behaviour)

### C4 — Map Empty State (First-Launch Onboarding Prompt)
**Status**: `[ ]` Not started
**Why**: New users see a blank map. There's no signal about what to do. This is the
worst possible first impression.
**Files**: `app/page.tsx`, `components/MapView.tsx`
**What to do**:
- In `app/page.tsx`, when `items.length === 0 && !loading`, render an overlay card
  (centered, above the map, below the top bar) that says:
  - "✈️ Start saving travel inspiration"
  - "Share any Instagram, YouTube, or Xiaohongshu post here to clip locations + wisdom"
  - A button "Clip your first post →" that opens the ImportSheet
- The card should be semi-transparent (white/95) with a rounded-2xl shadow, like the
  top bar aesthetic
- Dismiss automatically when the first item is saved

### C5 — Enrichment Retry UI on Failed Cards
**Status**: `[ ]` Not started
**Why**: A2 implemented automatic retry (3 attempts) but after all 3 fail the user
sees a broken card with no manual escape. It's a dead end.
**Files**: `components/InboxCard.tsx`
**What to do**:
- When `item.enrichmentStatus === 'failed'` AND `item.retryCount >= 3`, show:
  - A "⚠️ Couldn't extract info" state on the card (replace the loading spinner)
  - A small "Retry" button that calls the existing `onRetry(item.id)` prop
- When `item.enrichmentStatus === 'failed'` AND `item.retryCount < 3`, show a subtle
  "Retrying…" badge (already in A2's scope but may not be visible — verify and fix)
- The retry button should look like a small ghost chip, not a full button

### C6 — Keyboard Safe Area for Text Inputs
**Status**: `[ ]` Not started
**Why**: On iPhone, when the software keyboard opens it can push content behind the
bottom nav or clip the focused input. This is a common Capacitor/PWA gotcha.
**Files**: `app/layout.tsx`, `app/globals.css`
**What to do**:
- Add `<meta name="interactive-widget" content="resizes-content" />` to `app/layout.tsx`
  `<head>` — this tells iOS Safari/WKWebView to resize the viewport when keyboard appears
  (supported from iOS 15.4+)
- Also add `height: 100dvh` to the body/root container so dynamic viewport height is used:
  in `app/globals.css`, update the body rule to `min-height: 100dvh`
- In the ImportSheet and CreateBoardModal, add `pb-4` or `mb-4` below the last input to
  ensure it's not clipped

### C7 — Dark Mode
**Status**: `[ ]` Not started
**Why**: iOS automatically enables dark mode system-wide. Without dark mode support,
TravelPanel looks broken in system dark mode (white backgrounds stay white, unreadable text).
**Files**: `app/globals.css`, `tailwind.config.js`
**What to do**:
- Add `darkMode: 'media'` to `tailwind.config.js` (already there? verify — if it's
  `'class'` change to `'media'` so it follows system preference automatically)
- Update CSS variables in `app/globals.css` to add a `@media (prefers-color-scheme: dark)`
  block with dark mode values:
  ```css
  @media (prefers-color-scheme: dark) {
    :root {
      --background: 222 47% 8%;
      --foreground: 210 40% 95%;
      --card: 222 47% 11%;
      --card-foreground: 210 40% 95%;
      --muted: 217 33% 17%;
      --muted-foreground: 215 20% 65%;
      --border: 217 33% 17%;
    }
  }
  ```
- The MapLibre map can stay light — no dark tile source change needed
- Verify the NavBar, cards, and bottom sheets look correct by inspecting the CSS
  (you can't run a browser here so check class usage for any hardcoded `bg-white`,
  `text-gray-900`, etc. that don't respond to dark mode — list them as a comment
  in the task but don't fix every one; just fix the structural elements)

---

## PHASE D — Cloud + Sharing (Next Sprint)

### D1 — Activate Supabase B1 (needs keys)
**Status**: `[ ]` Blocked — needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Scaffolded**: `lib/supabase.ts`, `lib/cloudSync.ts`, `supabase/schema.sql` all exist
**Remaining**:
- Create Supabase project (user action)
- Run `supabase/schema.sql` to create tables + RLS policies
- Add a sign-in UI: email magic-link input in the settings page (under new "Account" section)
- Wire `syncNow()` on auth state change + on app focus event
- Enable Google OAuth in the Supabase dashboard (user action)

### D2 — Embedding/Vibe Search (B4)
**Status**: `[ ]` Blocked — needs D1 (Supabase + pgvector)
**What to do**: Embed clip `description + substance[].content` text via Claude, store
embeddings in Supabase pgvector, enable semantic search ("find me minimalist cafes in Tokyo")
in the SearchBar with a "✨ Semantic" toggle

### D3 — Shared Boards
**Status**: `[ ]` Not started
**What to do**:
- Each board gets a shareable read-only link: `/b/[shareToken]`
- The link renders the board with all clips + map (read-only, no edit)
- On the board detail page, add a "Share" button that copies the link
- Share token is a short random string stored on the Board object and synced to Supabase

### D4 — Proactive Resurfacing
**Status**: `[ ]` Not started
**What to do**:
- On app open, if the user has unplanned clips from ≥ 3 different destinations,
  show a bottom sheet: "You have clips from Tokyo, Kyoto, and 4 other destinations. Make a plan?"
- Detect destination clusters using the `lat/lng` data already on clips
- Trigger at most once per 7 days (track in localStorage)

---

## COMPLETED TASKS

### Phase A (all done)
- A1 Substance extraction — A2 Enrichment retry — A3 PostHog — A4 Cost guard
- A5 Resource banner — A6 Pin clustering — A7 Full-text search — A8 Seed boards
- A9 Plan export (PDF + .ics) — A10 Multi-version plans — A11 Wisdom view
- A12 Sourced itineraries

### Phase B (actionable tasks done)
- B1 Supabase scaffolded (dormant until keys)
- B2 Browser extension (Chrome/Edge Manifest V3)
- B3 Xiaohongshu Vision fix (screenshot → Claude Vision)
- B4 Embedding search (blocked on B1 keys)
- B5 Cloud backup export + Settings page

### iOS Polish (done this session)
- Safe area: page-header + page-content utilities + NavBar home indicator spacer
- Map FAB repositioned to clear tab bar on all devices
