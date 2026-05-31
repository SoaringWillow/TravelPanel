import { SavedItem, Board, SubstanceItem } from './types';

// Onboarding seed content. Every clip carries substance so a brand-new user
// immediately sees the Substance-over-Spots moat in action — not an empty globe.

interface SeedClip {
  title: string;
  description: string;
  url: string;
  platform: SavedItem['platform'];
  locations: SavedItem['locations'];
  activities: string[];
  tags: string[];
  substance: SubstanceItem[];
}

interface SeedBoard {
  name: string;
  emoji: string;
  description: string;
  clips: SeedClip[];
}

export const SEED_BOARDS: SeedBoard[] = [
  {
    name: 'Tokyo First-Timer',
    emoji: '🗼',
    description: 'Demo board — tap a pin to see the wisdom behind each clip.',
    clips: [
      {
        title: 'Tsukiji Outer Market — go hungry, go early',
        description: 'The outer market is still buzzing with street food even after the inner market moved to Toyosu.',
        url: 'https://example.com/tsukiji',
        platform: 'other',
        locations: [{ name: 'Tsukiji Outer Market', lat: 35.6655, lng: 139.7707, address: 'Chuo City, Tokyo' }],
        activities: ['Street food crawl', 'Fresh sushi breakfast'],
        tags: ['food', 'city'],
        substance: [
          { type: 'tip', content: 'Arrive before 9am — the best stalls sell out and the crowds get brutal by 10.', applies_to: 'Tsukiji Outer Market', source_quote: 'we got there at 8:30 and beat the worst of it' },
          { type: 'warning', content: 'Many stalls are cash-only and the nearest ATM that takes foreign cards is a 7-Eleven two blocks away.', applies_to: 'Tsukiji Outer Market' },
          { type: 'recommendation', content: 'Skip the famous tamagoyaki line; the stand one row over is just as good with no wait.' },
        ],
      },
      {
        title: 'teamLab Planets — what nobody tells you',
        description: 'Immersive digital art museum where you walk through water and mirrored rooms.',
        url: 'https://example.com/teamlab',
        platform: 'other',
        locations: [{ name: 'teamLab Planets', lat: 35.6486, lng: 139.7903, address: 'Koto City, Tokyo' }],
        activities: ['Digital art immersion'],
        tags: ['art', 'city'],
        substance: [
          { type: 'warning', content: 'You wade through knee-deep water — wear shorts or pants you can roll up. They give lockers but no spare clothes.', applies_to: 'teamLab Planets' },
          { type: 'tip', content: 'Book the timed ticket online days ahead; same-day entry is almost always sold out.' },
          { type: 'opinion', content: 'Go right at opening — by midday it is shoulder-to-shoulder and the magic fades.' },
        ],
      },
      {
        title: 'Shimokitazawa — the neighbourhood guidebooks skip',
        description: 'Bohemian district packed with vintage shops, tiny cafes, and live music.',
        url: 'https://example.com/shimokita',
        platform: 'other',
        locations: [{ name: 'Shimokitazawa', lat: 35.6613, lng: 139.6679, address: 'Setagaya City, Tokyo' }],
        activities: ['Vintage shopping', 'Cafe hopping'],
        tags: ['shopping', 'culture', 'city'],
        substance: [
          { type: 'wisdom', content: 'It is only two stops from Shibuya but feels like a different city — half the tourists, twice the character.' },
          { type: 'recommendation', content: 'The second-hand shops are best on weekday afternoons when new stock lands.' },
        ],
      },
    ],
  },
  {
    name: 'Kyoto Slow Days',
    emoji: '⛩️',
    description: 'Demo board — temples, tea, and the timing tricks that beat the crowds.',
    clips: [
      {
        title: 'Fushimi Inari at dawn',
        description: 'The thousand torii gates winding up the mountain.',
        url: 'https://example.com/fushimi',
        platform: 'other',
        locations: [{ name: 'Fushimi Inari Taisha', lat: 34.9671, lng: 135.7727, address: 'Fushimi Ward, Kyoto' }],
        activities: ['Torii gate hike', 'Sunrise photography'],
        tags: ['culture', 'nature', 'photography'],
        substance: [
          { type: 'tip', content: 'It is open 24h and free — arrive by 6:30am for empty-gate photos. By 9am it is a river of people.', applies_to: 'Fushimi Inari Taisha', source_quote: 'the gates are impossible to photograph after about 8am' },
          { type: 'wisdom', content: 'Most visitors turn back at the viewpoint 20 minutes up — the full summit loop takes ~2 hours and is gloriously quiet.' },
        ],
      },
      {
        title: 'Arashiyama bamboo — the 7am rule',
        description: 'The famous bamboo grove on the western edge of Kyoto.',
        url: 'https://example.com/arashiyama',
        platform: 'other',
        locations: [{ name: 'Arashiyama Bamboo Grove', lat: 35.0094, lng: 135.6669, address: 'Ukyo Ward, Kyoto' }],
        activities: ['Bamboo grove walk'],
        tags: ['nature', 'photography'],
        substance: [
          { type: 'warning', content: 'The grove itself is small — 10 minutes end to end. Do not build a whole day around it; pair it with the monkey park or Tenryu-ji.' },
          { type: 'tip', content: 'Go before 8am or after 5pm. Midday it is wall-to-wall tour groups and the serenity is gone.' },
        ],
      },
    ],
  },
  {
    name: 'Bali on a Budget',
    emoji: '🌴',
    description: 'Demo board — beaches, rice terraces, and the scams to dodge.',
    clips: [
      {
        title: 'Tegallalang Rice Terraces — bring small change',
        description: 'Iconic tiered rice paddies north of Ubud.',
        url: 'https://example.com/tegallalang',
        platform: 'other',
        locations: [{ name: 'Tegallalang Rice Terraces', lat: -8.4312, lng: 115.2779, address: 'Gianyar, Bali' }],
        activities: ['Rice terrace walk', 'Swing photos'],
        tags: ['nature', 'photography'],
        substance: [
          { type: 'warning', content: 'Locals along the path ask for "donations" to pass through their section — keep 10–20k IDR notes handy or you will overpay.', applies_to: 'Tegallalang Rice Terraces' },
          { type: 'opinion', content: 'The famous swings are wildly overpriced and the queues are long — the terraces themselves are the real draw.' },
        ],
      },
      {
        title: 'Sidemen Valley — Ubud without the crowds',
        description: 'A quiet green valley in east Bali with rice fields and Mount Agung views.',
        url: 'https://example.com/sidemen',
        platform: 'other',
        locations: [{ name: 'Sidemen Valley', lat: -8.4585, lng: 115.4453, address: 'Karangasem, Bali' }],
        activities: ['Valley trekking', 'Local weaving workshops'],
        tags: ['nature', 'rural', 'culture'],
        substance: [
          { type: 'recommendation', content: 'Stay one night here instead of all your nights in Ubud — the rice-field views from guesthouses are better and a fraction of the price.' },
          { type: 'wisdom', content: 'Scooter is the only practical way around; roads are steep and taxis are scarce, so factor that into your plans.' },
        ],
      },
    ],
  },
];
