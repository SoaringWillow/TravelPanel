// ─── Substance (wisdom layer) ───────────────────────────────────────────────

// The second extraction layer: the actual wisdom in a post, beyond the pin list.
// e.g. "arrive before 8am", "cash-only", "skip the tourist menu", "free on Tuesdays"
export type SubstanceType =
  | 'tip'         // actionable advice
  | 'warning'     // avoid / watch out
  | 'opinion'     // subjective take from the author
  | 'wisdom'      // broader knowledge ("cherry blossoms peak mid-April")
  | 'context'     // background info that shapes the visit
  | 'recommendation'; // explicit endorsement of something specific

export interface SubstanceItem {
  type: SubstanceType;
  content: string;          // the extracted insight, 1–2 sentences max
  applies_to?: string;      // spot name, season, or trip phase it relates to
  source_quote?: string;    // verbatim fragment from the original post
}

// ─── Core geo/content types ────────────────────────────────────────────────

export interface Location {
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

export type Platform = 'wechat' | 'xiaohongshu' | 'douyin' | 'bilibili' | 'other';

// pending  → just captured, SW hasn't processed yet
// processing → SW currently calling /api/import
// done     → Claude extracted locations/activities
// failed   → failed after retries
export type EnrichmentStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface SavedItem {
  id: string;
  url: string;
  platform: Platform;
  title: string;
  description: string;
  thumbnail?: string;
  locations: Location[];
  activities: string[];
  tags: string[];
  substance: SubstanceItem[]; // wisdom layer — tips, warnings, opinions from the post
  savedAt: number;
  notes?: string;
  enrichmentStatus: EnrichmentStatus;
  retryCount: number;
  boardId?: string; // undefined = Inbox (unassigned)
  isDemo?: boolean; // onboarding seed content — removable in one tap
  suggestedBoardId?: string;   // auto-sort suggestion from AI
  suggestedBoardReason?: string;
}

// ─── Board / Collection ─────────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  emoji: string;          // e.g. "🗼", default "🗺"
  description?: string;
  coverThumbnail?: string; // thumbnail of first item with an image
  itemIds: string[];       // ordered SavedItem ids
  createdAt: number;
  updatedAt: number;
  isDemo?: boolean; // onboarding seed content — removable in one tap
}

// ─── AI Planner types ────────────────────────────────────────────────────────

export type AgentStepType =
  | 'searching'
  | 'found'
  | 'clustering'
  | 'routing'
  | 'validating'
  | 'done'
  | 'error';

export interface AgentStep {
  type: AgentStepType;
  message: string;
  timestamp: number;
}

// A tip that traces back to a specific saved clip — the sourced-itinerary moat.
export interface SourcedTip {
  content: string;
  sourceTitle: string; // title of the clip this wisdom came from
}

export interface Activity {
  time: string;
  location: Location;
  name: string;
  duration: string;
  tips: string[];
  sourcedTips?: SourcedTip[]; // wisdom drawn from the user's own clips, cited
}

export interface DayPlan {
  day: number;
  theme: string;
  locations: Location[];
  activities: Activity[];
}

export interface TripPlan {
  overview: string;
  totalLocations: number;
  estimatedDailyDistance: string;
  days: DayPlan[];
  tips: string[];
}

export interface Trip {
  id: string;
  boardId: string;
  boardName: string;
  name?: string; // user-facing variant name, e.g. "Relaxed pace"
  days: number;
  preferences: string;
  agentSteps: AgentStep[];
  plan: TripPlan | null;
  createdAt: number;
}

// ─── API types ───────────────────────────────────────────────────────────────

export interface ImportResult {
  platform: Platform;
  title: string;
  description: string;
  thumbnail?: string;
  locations: Location[];
  activities: string[];
  tags: string[];
  substance: SubstanceItem[];
}

// NDJSON messages streamed from /api/plan
export type PlanStreamMessage =
  | { t: 'step'; step: AgentStep }
  | { t: 'plan'; plan: Partial<TripPlan> };
