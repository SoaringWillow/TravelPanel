import { SavedItem, Board } from './types';
import { saveItem, saveBoard } from './db';

const DEMO_BOARD_ID = 'demo-explore-ideas';

// Creates a demo board with 3 realistic clips so the map is never empty on first launch.
// All items are marked isDemo: true so they can be cleared from Settings.
export async function seedDemoBoard(): Promise<string> {
  const now = Date.now();

  const items: SavedItem[] = [
    {
      id: 'demo-tokyo-ramen',
      url: 'https://www.xiaohongshu.com/explore/demo1',
      platform: 'xiaohongshu',
      title: '🍜 Hidden Ramen Alley — Shinjuku, Tokyo',
      description: 'A local guide to the 9 best ramen shops tucked in Omoide Yokocho. Go after 10pm when the crowds thin out and the smoke from the charcoal grills fills the alley.',
      thumbnail: undefined,
      locations: [
        { name: 'Omoide Yokocho', lat: 35.6938, lng: 139.7006, address: 'Shinjuku 1-chome, Tokyo' },
        { name: 'Shinjuku Station West Exit', lat: 35.6896, lng: 139.7006 },
      ],
      activities: ['ramen', 'street food', 'nightlife', 'izakaya'],
      tags: ['tokyo', 'food', 'nightlife', 'budget'],
      substance: [
        { type: 'tip', content: 'Arrive after 10pm — the best seats open up and the salarymen atmosphere is authentic.', applies_to: 'Omoide Yokocho' },
        { type: 'warning', content: 'Most stalls are cash only. Bring small bills (¥1000 notes).', applies_to: 'Omoide Yokocho' },
        { type: 'wisdom', content: 'Stall #7 (Kushi Katsu) has a 40-year-old recipe. Order the offal skewers — locals only know about this.', source_quote: '"order the internal organ skewers, locals only"' },
        { type: 'recommendation', content: 'Takahashi Ramen is the only shop that does a spicy miso broth with black garlic oil — worth the 15-min wait.', applies_to: 'Omoide Yokocho' },
      ],
      savedAt: now - 3 * 86400000,
      enrichmentStatus: 'done',
      retryCount: 0,
      boardId: DEMO_BOARD_ID,
      isDemo: true,
    },
    {
      id: 'demo-paris-marais',
      url: 'https://www.instagram.com/p/demo2',
      platform: 'other',
      title: '🥐 Le Marais on a Sunday Morning — Paris',
      description: 'The hidden courtyards, the falafel on Rue des Rosiers, and the one gallery where Picasso went to buy supplies. A walking route through the real Marais before the tourists wake up.',
      thumbnail: undefined,
      locations: [
        { name: 'Rue des Rosiers', lat: 48.8575, lng: 2.3538, address: '4th arrondissement, Paris' },
        { name: 'Place des Vosges', lat: 48.8554, lng: 2.3625 },
        { name: 'Musée Picasso', lat: 48.8599, lng: 2.3623 },
      ],
      activities: ['walking', 'falafel', 'art', 'photography', 'café'],
      tags: ['paris', 'art', 'food', 'morning'],
      substance: [
        { type: 'tip', content: 'Go Sunday 8–10am — the market on Rue de Bretagne is set up and the Marais streets are empty.', applies_to: 'Le Marais' },
        { type: 'recommendation', content: 'L\'As du Fallafel at 34 Rue des Rosiers is the real one. The line moves fast. Get the special with aubergine.', applies_to: 'Rue des Rosiers' },
        { type: 'warning', content: 'Place des Vosges galleries are closed Monday. Tuesday–Sunday 10am is the sweet spot.', applies_to: 'Place des Vosges' },
        { type: 'opinion', content: 'Musée Picasso is underrated — most tourists skip it for Louvre. You\'ll have the Cubism room almost to yourself.', applies_to: 'Musée Picasso' },
      ],
      savedAt: now - 2 * 86400000,
      enrichmentStatus: 'done',
      retryCount: 0,
      boardId: DEMO_BOARD_ID,
      isDemo: true,
    },
    {
      id: 'demo-kyoto-bamboo',
      url: 'https://www.youtube.com/watch?v=demo3',
      platform: 'other',
      title: '🎋 Arashiyama Bamboo at Sunrise — Kyoto',
      description: 'Beat the 9am tour bus crowd by arriving at 5:30am. The bamboo grove takes on an entirely different character in the mist — and you\'ll have it to yourself for 90 minutes.',
      thumbnail: undefined,
      locations: [
        { name: 'Arashiyama Bamboo Grove', lat: 35.0174, lng: 135.6720, address: 'Ukyo Ward, Kyoto' },
        { name: 'Tenryu-ji Temple Garden', lat: 35.0167, lng: 135.6715 },
        { name: 'Togetsukyo Bridge', lat: 35.0134, lng: 135.6779 },
      ],
      activities: ['photography', 'hiking', 'zen gardens', 'sunrise', 'nature'],
      tags: ['kyoto', 'nature', 'photography', 'early-morning'],
      substance: [
        { type: 'tip', content: 'Arrive before 6am. The tour buses start at 9am and the crowd makes the grove unpleasant by 10am.', applies_to: 'Arashiyama Bamboo Grove', source_quote: '"arrive before the tour groups, 6am absolute latest"' },
        { type: 'tip', content: 'The northeast section of the grove (past the stone wall) is less photographed and more atmospheric.', applies_to: 'Arashiyama Bamboo Grove' },
        { type: 'wisdom', content: 'Tenryu-ji Temple garden is UNESCO listed and opens at 8:30am — the moss garden after a rain is exceptional.', applies_to: 'Tenryu-ji Temple Garden' },
        { type: 'context', content: 'Cherry blossom season (late March to mid-April) and autumn leaves (mid-Nov) are peak times — expect 10x normal crowds even early morning.', applies_to: 'Arashiyama' },
      ],
      savedAt: now - 86400000,
      enrichmentStatus: 'done',
      retryCount: 0,
      boardId: DEMO_BOARD_ID,
      isDemo: true,
    },
  ];

  const board: Board = {
    id: DEMO_BOARD_ID,
    name: 'Explore Ideas',
    emoji: '🌏',
    description: 'Sample clips to get you started — delete when ready',
    coverThumbnail: undefined,
    itemIds: items.map((i) => i.id),
    createdAt: now,
    updatedAt: now,
    isDemo: true,
  };

  await Promise.all([saveBoard(board), ...items.map(saveItem)]);
  return DEMO_BOARD_ID;
}

export async function clearDemoContent(): Promise<void> {
  const { getAllItems, getAllBoards, deleteItem, deleteBoard } = await import('./db');
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  await Promise.all([
    ...items.filter((i) => i.isDemo).map((i) => deleteItem(i.id)),
    ...boards.filter((b) => b.isDemo).map((b) => deleteBoard(b.id)),
  ]);
}
