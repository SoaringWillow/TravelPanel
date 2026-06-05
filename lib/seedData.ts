import { SavedItem, Board, SubstanceItem } from './types';

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
    name: 'Tokyo Weekend',
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
          { type: 'tip', content: 'Arrive before 9am — the best stalls sell out and crowds get brutal by 10.', applies_to: 'Tsukiji Outer Market', source_quote: 'got there at 8:30 and beat the worst of it' },
          { type: 'warning', content: 'Many stalls are cash-only; the nearest ATM for foreign cards is a 7-Eleven two blocks away.', applies_to: 'Tsukiji Outer Market' },
          { type: 'recommendation', content: 'Skip the famous tamagoyaki line; the stall one row over is just as good with no wait.' },
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
        description: 'Bohemian district packed with vintage shops, tiny cafes, and live music venues.',
        url: 'https://example.com/shimokita',
        platform: 'other',
        locations: [{ name: 'Shimokitazawa', lat: 35.6613, lng: 139.6679, address: 'Setagaya City, Tokyo' }],
        activities: ['Vintage shopping', 'Cafe hopping', 'Live music'],
        tags: ['shopping', 'culture', 'city'],
        substance: [
          { type: 'wisdom', content: 'Only two stops from Shibuya but feels like a different city — half the tourists, twice the character.' },
          { type: 'recommendation', content: 'Second-hand shops are best on weekday afternoons when new stock arrives.' },
          { type: 'tip', content: 'Tiny venues show indie bands from ¥1,500 — check the schedule boards near the station.' },
        ],
      },
      {
        title: 'Shinjuku Gyoen — midday escape',
        description: 'Tokyo\'s best park, mixing Japanese, French, and English garden styles.',
        url: 'https://example.com/shinjuku-gyoen',
        platform: 'other',
        locations: [{ name: 'Shinjuku Gyoen National Garden', lat: 35.6851, lng: 139.7103, address: 'Shinjuku City, Tokyo' }],
        activities: ['Garden walk', 'Picnic'],
        tags: ['nature', 'city'],
        substance: [
          { type: 'tip', content: '¥500 entry — one of the cheapest hours of peace you can buy in central Tokyo.' },
          { type: 'warning', content: 'No alcohol allowed inside (unlike most Tokyo parks). Staff do check bags.' },
          { type: 'opinion', content: 'The greenhouse is overlooked and has insane tropical plants — most tourists walk past it.' },
        ],
      },
      {
        title: 'Omoide Yokocho (Memory Lane) after dark',
        description: 'Narrow alley of yakitori stalls just west of Shinjuku station.',
        url: 'https://example.com/omoide',
        platform: 'other',
        locations: [{ name: 'Omoide Yokocho', lat: 35.6941, lng: 139.6996, address: 'Shinjuku City, Tokyo' }],
        activities: ['Yakitori dinner', 'Bar hopping'],
        tags: ['food', 'city', 'nightlife'],
        substance: [
          { type: 'tip', content: 'The stalls that look empty at 6pm fill up by 7:30 — arrive early or wait for a seat.' },
          { type: 'recommendation', content: 'Sit at the counter so you can watch the grill master work. Much more fun than a table.' },
          { type: 'warning', content: 'Very smoky inside — not great if you\'re sensitive. The alley is tight and cash-only everywhere.' },
        ],
      },
    ],
  },
  {
    name: 'Chengdu Food',
    emoji: '🌶️',
    description: 'Demo board — Sichuan cuisine temples, hidden teahouses, and spice survival tips.',
    clips: [
      {
        title: 'Chengdu Hotpot — the real rules',
        description: 'Spicy communal boiling pot — the city\'s defining meal.',
        url: 'https://example.com/chengdu-hotpot',
        platform: 'xiaohongshu',
        locations: [{ name: 'Chengdu city centre', lat: 30.5728, lng: 104.0668, address: 'Chengdu, Sichuan' }],
        activities: ['Hotpot dinner', 'Local dining'],
        tags: ['food', 'spicy', 'city'],
        substance: [
          { type: 'tip', content: 'Order 50% of what you think you want — portions are huge and you can reorder instantly.', applies_to: 'Chengdu Hotpot' },
          { type: 'warning', content: 'If you have a low spice tolerance, order the divided pot (鸳鸯锅) with one mild side.', applies_to: 'Chengdu Hotpot' },
          { type: 'wisdom', content: 'Sesame oil + garlic dipping sauce cuts the heat and makes everything better. Locals never skip this.' },
          { type: 'recommendation', content: 'Haidilao is the tourist choice; locals go to Shu Jiuxiang or any neighbourhood joint with a queue.' },
        ],
      },
      {
        title: 'Wenshu Monastery Teahouse',
        description: 'Ancient Buddhist complex with a garden teahouse beloved by locals.',
        url: 'https://example.com/wenshu',
        platform: 'other',
        locations: [{ name: 'Wenshu Monastery', lat: 30.6784, lng: 104.0671, address: 'Qingyang District, Chengdu' }],
        activities: ['Tea ceremony', 'Temple visit'],
        tags: ['culture', 'tea', 'city'],
        substance: [
          { type: 'tip', content: 'The teahouse inside the monastery garden opens at 8am — arrive early and watch morning temple-goers.' },
          { type: 'recommendation', content: 'Order gaiwan tea (盖碗茶) — the proper Chengdu way to drink. Refills are free all day.' },
          { type: 'wisdom', content: 'This is where retired locals play mahjong and chess all day. Pull up a chair near them and you\'ll see real Chengdu life.' },
        ],
      },
      {
        title: 'Jinli Ancient Street — skip the obvious stalls',
        description: 'Restored Qing Dynasty street near the Wuhou Shrine.',
        url: 'https://example.com/jinli',
        platform: 'xiaohongshu',
        locations: [{ name: 'Jinli Ancient Street', lat: 30.6423, lng: 104.0428, address: 'Wuhou District, Chengdu' }],
        activities: ['Street food', 'Souvenir shopping', 'Sichuan opera masks'],
        tags: ['culture', 'shopping', 'food'],
        substance: [
          { type: 'warning', content: 'The front third of the street is tourist trap prices — walk to the back half for actual local food.' },
          { type: 'recommendation', content: 'The handmade Sichuan opera face-changing masks make the best souvenirs and are unique to this region.' },
          { type: 'opinion', content: 'Overrated but unavoidable — do it on the way to Wuhou Shrine rather than as the main event.' },
        ],
      },
      {
        title: 'Giant Panda Base — the early-morning trick',
        description: 'Breeding research centre on the city\'s northern edge.',
        url: 'https://example.com/panda-base',
        platform: 'other',
        locations: [{ name: 'Chengdu Research Base of Giant Panda Breeding', lat: 30.7371, lng: 104.1404, address: 'Chenghua District, Chengdu' }],
        activities: ['Wildlife watching', 'Photography'],
        tags: ['nature', 'wildlife'],
        substance: [
          { type: 'tip', content: 'Pandas are most active 8–10am for feeding. After 10am they nap for most of the day.' },
          { type: 'tip', content: 'Buy tickets online or you will queue 45+ minutes at the gate. Max 3,000 visitors at any time.' },
          { type: 'warning', content: 'The paid "panda keeper for a day" experience is for zoo-approved volunteers only — tours that offer this are scams.' },
        ],
      },
    ],
  },
  {
    name: 'Bali Retreat',
    emoji: '🌴',
    description: 'Demo board — rice terraces, surf breaks, and the scams to dodge.',
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
          { type: 'warning', content: 'Locals along the path ask for "donations" to pass through — keep 10–20k IDR notes handy or you will overpay.', applies_to: 'Tegallalang Rice Terraces' },
          { type: 'opinion', content: 'The famous swings are wildly overpriced and the queues are long — the terraces themselves are the real draw.' },
          { type: 'tip', content: 'Go in late afternoon for golden light on the rice. Morning is often hazy.' },
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
          { type: 'recommendation', content: 'Stay one night here instead of all nights in Ubud — rice-field views are better and a fraction of the price.' },
          { type: 'wisdom', content: 'Scooter is the only practical way around; roads are steep and taxis are scarce.' },
        ],
      },
      {
        title: 'Canggu for beginners — surf lesson guide',
        description: 'The beach town that replaced Kuta for the Instagram-era traveller.',
        url: 'https://example.com/canggu-surf',
        platform: 'other',
        locations: [
          { name: 'Batu Bolong Beach', lat: -8.6556, lng: 115.1338, address: 'Canggu, Bali' },
          { name: 'Echo Beach', lat: -8.6466, lng: 115.1180, address: 'Canggu, Bali' },
        ],
        activities: ['Beginner surfing', 'Sunset drinks'],
        tags: ['surf', 'beach', 'nightlife'],
        substance: [
          { type: 'tip', content: 'Batu Bolong is the better beginner beach — gentler waves than Echo Beach and surf schools are right there.' },
          { type: 'warning', content: 'Rip currents appear between 11am–2pm. Stick to the flagged swimming zones and watch the lifeguards.' },
          { type: 'recommendation', content: 'A 2-hour lesson with board included runs ~$15–20 USD. Don\'t pay more than $25.' },
        ],
      },
      {
        title: 'Uluwatu Temple at sunset + Kecak fire dance',
        description: 'Cliffside Hindu temple on Bali\'s southern tip.',
        url: 'https://example.com/uluwatu',
        platform: 'other',
        locations: [{ name: 'Pura Luhur Uluwatu', lat: -8.8291, lng: 115.0849, address: 'Uluwatu, Badung, Bali' }],
        activities: ['Temple visit', 'Kecak dance performance', 'Cliff sunset'],
        tags: ['culture', 'photography', 'nature'],
        substance: [
          { type: 'warning', content: 'Monkeys steal sunglasses and hats — put them away before entering the complex.', applies_to: 'Pura Luhur Uluwatu' },
          { type: 'tip', content: 'The Kecak fire dance at sunset (6pm) is mesmerising. Arrive 30 min early for good seats.' },
          { type: 'tip', content: 'Sarong is required — provided at the entrance for free but bring your own for a better fit.' },
          { type: 'opinion', content: 'The most spectacular sunset in Bali, full stop. Worth the 1-hour drive from Kuta.' },
        ],
      },
      {
        title: 'Seminyak vs Kuta — honest take',
        description: 'Which beach strip actually delivers what you want?',
        url: 'https://example.com/seminyak-vs-kuta',
        platform: 'other',
        locations: [
          { name: 'Seminyak Beach', lat: -8.6892, lng: 115.1578, address: 'Seminyak, Bali' },
          { name: 'Kuta Beach', lat: -8.7183, lng: 115.1685, address: 'Kuta, Bali' },
        ],
        activities: ['Beach clubs', 'Shopping', 'Sunset watching'],
        tags: ['beach', 'nightlife', 'food'],
        substance: [
          { type: 'wisdom', content: 'Kuta is budget dorms and party hotels; Seminyak is boutique restaurants and villa pools. Both have the same beach — pick based on your budget, not hype.' },
          { type: 'recommendation', content: 'Potato Head Beach Club in Seminyak is worth the entrance (gets refunded in drinks); La Plancha is the sunset vibe spot for less.' },
          { type: 'tip', content: 'Seminyak restaurants are 40% cheaper if you eat before 7pm — the tourist rush inflates prices after sunset.' },
        ],
      },
    ],
  },
];
