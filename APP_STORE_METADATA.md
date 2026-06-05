# App Store Connect — Submission Metadata

## Basic Info

| Field | Value |
|---|---|
| App Name | TravelPanel |
| Subtitle | AI Travel Inspiration |
| Bundle ID | com.travelpanel.app |
| SKU | TRAVELPANEL_001 |
| Category (Primary) | Travel |
| Category (Secondary) | Reference |
| Age Rating | 4+ (no objectionable content) |
| Privacy Policy URL | https://your-app.vercel.app/legal/privacy |

---

## Description

**Short (first 252 chars — shown in search results):**
Save travel inspiration from Instagram, YouTube, and Xiaohongshu. AI extracts the real wisdom — tips, warnings, hidden gems — not just pins. Plan multi-day trips that cite your saved clips.

**Full Description:**

TravelPanel turns social media travel content into actionable trip plans.

**The Problem**
You save a travel video that says "avoid this restaurant, go here instead at 7am to beat the crowds, the hidden trail is behind the main waterfall" — and all you get is a pin on a map. The wisdom is gone.

**What TravelPanel Does**
TravelPanel extracts both: the geographic skeleton AND the substance — tips, warnings, opinions, hidden-gem wisdom. Every clip keeps its source insights. When you plan a trip, your itinerary cites exactly which clip told you what.

**Key Features**
• Save from any travel app using the iOS Share Extension — just tap Share → TravelPanel
• AI extracts locations AND travel wisdom from each post (not just pins)
• Map view shows all your saved spots — tap any pin to see its source wisdom  
• AI Trip Planner builds day-by-day itineraries with inline clip citations
• Share boards with friends — they import your entire curated collection
• Works offline — all data lives on your device
• Board timelines show your clip history with substance highlights
• "Near Me" shows saved spots close to your current location

**Substance over Spots**
Every other travel app throws away the text. We keep it. The "go in the morning", "skip this tourist trap", "the food cart near the back entrance" — that's the real value of following a travel creator, and TravelPanel is the only app that preserves it.

**Privacy First**
All your clips and boards are stored locally on your device. We never sell your data or track your location without permission.

---

## Keywords (100 chars max)

`travel,trip planner,AI,itinerary,inspiration,clips,map,instagram,youtube,travel planning`

---

## Screenshot Specifications

Required: 5 screenshots per device size
- 6.7" (iPhone 15 Pro Max): 1290 × 2796 px
- 6.1" (iPhone 15 Pro): 1179 × 2556 px

### Screenshot 1 — The Map View
**Caption**: "Your travel world, mapped"
Show: Main map with several colorful pins, nearby clips panel open at bottom showing 3 clips with distance badges, indigo GPS button active

### Screenshot 2 — Capture Flow
**Caption**: "Save in seconds from any app"
Show: Share sheet with TravelPanel icon visible, or the /share page mid-extraction with the "Finding the magic…" animation and an Instagram URL being processed

### Screenshot 3 — Substance Wisdom
**Caption**: "Keep the wisdom, not just the pins"
Show: An InboxCard expanded with a timeline of substance tips — tips, warnings, recommendations visible. Emphasis on the 💡 tip badges.

### Screenshot 4 — Trip Planner
**Caption**: "AI plans your trip from your saved clips"
Show: A 3-day itinerary with DayStripCards, the route map visible, clip citations visible inline (e.g. "via: Tokyo Night Walk — best ramen spot")

### Screenshot 5 — Shared Board Import
**Caption**: "Share your discoveries"
Show: The import-board page with a board preview (emoji, stats strip, clip previews) and the "Import to TravelPanel" button

---

## App Store Review Notes

"TravelPanel is a travel inspiration capture and planning tool. The AI extraction feature uses the Anthropic Claude API to analyze travel content URLs. All data is stored locally on device using IndexedDB. The Share Extension receives URLs from other apps and passes them to the main app for processing. No background location tracking — GPS is only used when the user explicitly taps 'Near Me'."

## What to Prepare in Xcode

1. Set bundle ID to `com.travelpanel.app` in Signing & Capabilities
2. Add App Group capability: `group.com.travelpanel.app`
3. Add Share Extension target (see `ios/App/ShareExtension/XCODE_SETUP.md`)
4. Set deployment target to iOS 16.0+
5. Run on device to verify Share Extension works
6. Product → Archive → Distribute App → App Store Connect
7. Upload to TestFlight for internal testing before submission
