export interface Location {
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

export type Platform = 'wechat' | 'xiaohongshu' | 'douyin' | 'bilibili' | 'other';

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

export interface ImportResult {
  platform: Platform;
  title: string;
  description: string;
  thumbnail?: string;
  locations: Location[];
  activities: string[];
  tags: string[];
}
