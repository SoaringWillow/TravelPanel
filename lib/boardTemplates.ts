export interface BoardTemplate {
  name: string;
  emoji: string;
  tags: string[];
  description: string;
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    name: 'Beach Holiday',
    emoji: '🏝',
    tags: ['beach', 'resort', 'snorkeling', 'sunset', 'seafood'],
    description: 'Sun, sand, and sea',
  },
  {
    name: 'City Break',
    emoji: '🏙',
    tags: ['urban', 'museums', 'cafes', 'street-food', 'architecture'],
    description: 'Urban exploration',
  },
  {
    name: 'Road Trip',
    emoji: '🚗',
    tags: ['scenic', 'pit-stops', 'camping', 'drives', 'national-parks'],
    description: 'Miles of adventure',
  },
  {
    name: 'Food Tour',
    emoji: '🍜',
    tags: ['restaurant', 'street-food', 'market', 'local-cuisine', 'michelin'],
    description: 'Eat your way through',
  },
  {
    name: 'Cultural Immersion',
    emoji: '🏛',
    tags: ['temples', 'museums', 'history', 'art', 'festivals'],
    description: 'Deep cultural dive',
  },
];
