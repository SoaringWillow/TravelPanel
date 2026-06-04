export type Platform = 'wechat' | 'xiaohongshu' | 'douyin' | 'bilibili' | 'other';

export interface Location {
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

export interface SubstanceItem {
  type: 'tip' | 'warning' | 'opinion' | 'wisdom' | 'context' | 'recommendation';
  content: string;
  applies_to?: string;
  source_quote?: string;
}

export interface SavedClip {
  id: string;
  url: string;
  platform: Platform;
  title: string;
  description: string;
  thumbnail?: string;
  locations: Location[];
  activities: string[];
  tags: string[];
  substance: SubstanceItem[];
  savedAt: number;
  enrichmentStatus: 'pending' | 'done' | 'failed';
  retryCount: number;
  boardId?: string;
}

export interface Board {
  id: string;
  name: string;
  emoji: string;
  clipIds: string[];
  createdAt: number;
}

export interface ExtensionSettings {
  apiBaseUrl: string;
}
