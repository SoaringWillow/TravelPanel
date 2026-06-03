# TravelPanel — App Store Screenshot Shot List

Required: 5 screenshots for iPhone 6.7" (2796×1290) and 6.9" (2868×1320).
Use iOS Simulator + `xcrun simctl io booted screenshot` or Xcode Organiser.

---

## Shot 1 — Map with Pins + Nearby Banner

**Screen**: Home (`/`)  
**What to show**:
- Map centred on Tokyo or Paris with 8–10 coloured pins clustered in 2–3 groups
- The blue "X saved places near you" banner visible below the top bar
- Top bar showing "12 places saved"
- The indigo FAB (+) in the bottom right  

**Setup**:
1. Seed the demo board (tap "Load demo data" in Settings if available)
2. Grant location permission; move simulator to a coord near a seeded pin
3. Wait for the "near you" banner to appear (0.8s delay)

**Caption for the App Store listing**:
"Your inspiration, mapped — see every saved place at a glance"

---

## Shot 2 — Inbox Grid with Substance Badges

**Screen**: Inbox (`/inbox`)  
**What to show**:
- 6 cards in a 2-column grid, all in "done" state
- At least 2 cards showing "💡 3 tips" badge in amber
- At least 1 card showing the "📍 0.4km" nearby distance badge in blue
- Platform badges visible: Xiaohongshu (red), Instagram (gradient), YouTube (red)

**Setup**:
1. Use demo data with varied platforms and substance counts
2. Enable "Near me" sort — the distance badge appears on nearby clips

**Caption**:
"Save any post — Claude extracts locations AND the tips your friends actually share"

---

## Shot 3 — Share Sheet Board Picker (Mid-Save)

**Screen**: Share (`/share?url=...&title=...`)  
**What to show**:
- The share page in "picking" stage
- A real Instagram or Xiaohongshu URL pre-filled
- The title of the post truncated at 2 lines
- Board chips visible: "Inbox", "🗼 Tokyo 2025", "🌊 Bali Ideas", "+ New"

**Setup**:
1. In Simulator, use a real Share Sheet trigger from a test URL
2. Or navigate directly to `/share?url=https://instagram.com/p/abc&title=Hidden+ramen+spot+in+Shinjuku`

**Caption**:
"Share from any app — save in 2 taps, pick your board in 1"

---

## Shot 4 — Trip Plan with Sourced Tips Inline

**Screen**: Plan (`/plan/[boardId]`) in `complete` stage  
**What to show**:
- Day 2 selected in the day strip (indigo active card)
- 3 activity cards visible in the scrollable list
- At least 1 activity with a green "💡 from your clip: Shinjuku ramen guide" sourced tip card
- The summary chips at top: "3 days", "8 locations", "~3 km/day"

**Setup**:
1. Generate a plan for the Tokyo demo board
2. Select Day 2 which has the most activities
3. Scroll to an activity with sourcedTips

**Caption**:
"AI plans your route — every tip cites the clip it came from, so nothing gets lost"

---

## Shot 5 — Board Timeline View

**Screen**: Board detail (`/boards/[id]`) with `viewMode = 'timeline'`  
**What to show**:
- The Timeline toggle selected (active state)
- 2 date groups visible: "Jun 1, 2025" and "May 28, 2025"
- Indigo vertical timeline line with dot per group
- 3–4 horizontal cards visible (thumbnail left, title + location right)
- The "Plan this trip" indigo button at the top

**Setup**:
1. Open the Tokyo board
2. Switch to Timeline view
3. Ensure clips have thumbnails and location names

**Caption**:
"Organise by board, explore by timeline — every saved moment in context"

---

## Technical Notes

- Simulator device: iPhone 16 Pro Max (6.9") and iPhone 15 Pro Max (6.7")
- Status bar: hide the carrier/battery info for clean screenshots (Edit → Simulators → Status Bar)
- Export: `.png` files named `shot-1-map.png` through `shot-5-timeline.png`
- Dark mode: consider submitting one dark and one light version per shot
- App Store limits 10 screenshots per device size; 5 is the minimum
