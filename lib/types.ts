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
  savedAt: number;
  notes?: string;
  enrichmentStatus: EnrichmentStatus;
  retryCount: number;
  boardId?: string; // undefined = Inbox (unassigned)
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

export interface Activity {
  time: string;
  location: Location;
  name: string;
  duration: string;
  tips: string[];
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
}

// NDJSON messages streamed from /api/plan
export type PlanStreamMessage =
  | { t: 'step'; step: AgentStep }
  | { t: 'plan'; plan: Partial<TripPlan> };
