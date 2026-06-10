'use client';

// App Store screenshot composition page.
// Visit /screenshots to see all 5 frames side-by-side.
// Print with Cmd+P (or right-click → Print) to save as PDF for App Store upload.

const FRAMES = [
  {
    gradient: 'from-indigo-600 to-violet-700',
    caption: 'Clip from anywhere.\nSee everything.',
    subCaption: 'Share posts from any social app',
    mockBg: 'bg-gray-900',
    mockContent: (
      <div className="w-full h-full flex flex-col">
        {/* Map mock */}
        <div className="flex-1 bg-gradient-to-br from-emerald-100 to-sky-200 relative overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2393c5fd\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '40px 40px' }} />
          {/* Pins */}
          {[
            { top: '25%', left: '30%', emoji: '🍜' },
            { top: '40%', left: '55%', emoji: '🏛' },
            { top: '60%', left: '38%', emoji: '🌿' },
            { top: '35%', left: '72%', emoji: '📸' },
          ].map((pin, i) => (
            <div key={i} style={{ position: 'absolute', top: pin.top, left: pin.left }} className="text-lg drop-shadow-lg">{pin.emoji}</div>
          ))}
          {/* Top bar */}
          <div className="absolute top-3 left-3 right-3 bg-white/90 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-indigo-600 text-xs">🌐</span>
            <span className="text-xs font-bold text-gray-800">TravelPanel</span>
            <span className="ml-auto text-xs text-gray-400">8 places</span>
          </div>
          {/* Nearby tray */}
          <div className="absolute bottom-0 left-2 right-2 bg-white/95 rounded-2xl p-2 shadow-xl">
            <div className="text-xs font-bold text-blue-600 mb-1.5">📍 3 spots nearby</div>
            {['Tsukiji Outer Market', 'Senso-ji Temple', 'Yanaka Ginza'].map((name, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex-shrink-0" />
                <span className="text-xs text-gray-700 font-medium">{name}</span>
                <span className="ml-auto text-xs text-blue-500 font-medium">{['200m', '450m', '890m'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    gradient: 'from-amber-500 to-orange-600',
    caption: 'Not just pins —\nthe wisdom behind them.',
    subCaption: 'Extract tips, warnings & hidden gems',
    mockContent: (
      <div className="w-full h-full flex flex-col bg-gray-50">
        <div className="bg-white px-3 pt-10 pb-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">📥</span>
            <span className="font-bold text-gray-800 text-sm">Inspiration</span>
            <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">5 unsorted</span>
          </div>
        </div>
        <div className="flex-1 p-2 space-y-2 overflow-hidden">
          {[
            { title: 'Hidden Kyoto: 10 temples locals love', tags: ['culture', 'nature'], tips: ['Go before 9am — zero crowds', '⚠️ No photos inside Ryoan-ji'] },
            { title: 'Best Tokyo ramen guide 2024', tags: ['food'], tips: ['💡 Order at machine, get ticket first', '⭐ Sit at counter for best experience'] },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
              <div className="flex gap-2">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-1">{card.title}</p>
                  <div className="flex gap-1 mt-1">
                    {card.tags.map(t => <span key={t} className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">{t}</span>)}
                  </div>
                </div>
              </div>
              {i === 0 && (
                <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
                  {card.tips.map((tip, j) => (
                    <div key={j} className="flex gap-1.5">
                      <span className="text-[10px]">{j === 0 ? '💡' : '⚠️'}</span>
                      <p className="text-[10px] text-gray-600">{tip.replace('💡 ', '').replace('⚠️ ', '')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    gradient: 'from-green-500 to-teal-600',
    caption: 'AI plans trips from\nYOUR saved clips.',
    subCaption: 'Sourced itineraries with clip attribution',
    mockContent: (
      <div className="w-full h-full flex flex-col bg-gray-50">
        <div className="bg-white px-3 pt-10 pb-2 shadow-sm">
          <span className="font-bold text-gray-800 text-sm">🗺️ Kyoto 4-Day Plan</span>
        </div>
        <div className="flex-1 p-2 space-y-2 overflow-hidden">
          {[
            { day: 'Day 1', title: 'Arashiyama Bamboo Grove', time: '9:00 AM', tip: 'Go before 9am for empty paths', source: 'from: Hidden Kyoto guide' },
            { day: 'Day 1', title: 'Tenryu-ji Temple', time: '10:30 AM', tip: 'Bring cash — card not accepted', source: 'from: Budget Japan tips' },
            { day: 'Day 2', title: 'Fushimi Inari Shrine', time: '7:00 AM', tip: 'Hike to the top for best views', source: 'from: Your clip' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">{item.day}</span>
                <span className="text-[9px] text-gray-400">{item.time}</span>
              </div>
              <p className="text-xs font-semibold text-gray-800 mb-1">{item.title}</p>
              <div className="flex items-start gap-1">
                <span className="text-[10px]">💡</span>
                <p className="text-[10px] text-gray-600">{item.tip}</p>
              </div>
              <p className="text-[9px] text-indigo-400 italic mt-0.5">{item.source}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    gradient: 'from-pink-500 to-rose-600',
    caption: 'Organise inspiration\ninto trip boards.',
    subCaption: 'Grid & timeline views, share with friends',
    mockContent: (
      <div className="w-full h-full flex flex-col bg-gray-50">
        <div className="bg-white px-3 pt-10 pb-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗂</span>
            <span className="font-bold text-gray-800 text-sm">My Boards</span>
          </div>
        </div>
        <div className="flex-1 p-2">
          <div className="grid grid-cols-2 gap-2">
            {[
              { emoji: '🗾', name: 'Japan 2024', count: 12, color: 'bg-indigo-100' },
              { emoji: '🏝️', name: 'Bali Escape', count: 8, color: 'bg-amber-100' },
              { emoji: '🇫🇷', name: 'Paris Dream', count: 15, color: 'bg-rose-100' },
              { emoji: '🌿', name: 'Bali Nature', count: 6, color: 'bg-green-100' },
            ].map((board, i) => (
              <div key={i} className={`${board.color} rounded-xl p-3 aspect-square flex flex-col justify-between`}>
                <span className="text-2xl">{board.emoji}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{board.name}</p>
                  <p className="text-[10px] text-gray-500">{board.count} places</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    gradient: 'from-violet-600 to-purple-700',
    caption: 'Share boards\nwith friends.',
    subCaption: 'One link, no account needed',
    mockContent: (
      <div className="w-full h-full flex flex-col bg-gray-50">
        <div className="bg-white px-3 pt-10 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗾</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">Japan 2024</p>
              <p className="text-[10px] text-gray-400">12 places · shared via TravelPanel</p>
            </div>
            <div className="ml-auto bg-indigo-600 text-white text-[9px] font-bold px-2 py-1 rounded-full">+ Add to my boards</div>
          </div>
        </div>
        <div className="flex-1 p-2 space-y-2 overflow-hidden">
          {['Tsukiji Market', 'Senso-ji Temple', 'TeamLab Planets'].map((name, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-2.5 flex gap-2.5">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-200 to-purple-200 flex-shrink-0 flex items-center justify-center text-lg">
                {['🐟', '⛩️', '🌊'][i]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{name}</p>
                <p className="text-[10px] text-indigo-600 mt-0.5">📍 {['Chuo, Tokyo', 'Asakusa', 'Toyosu'][i]}</p>
                <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full mt-1 inline-block">YouTube</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// iPhone 15 Pro frame — simplified SVG bezel
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 280,
        height: 590,
        background: '#1a1a1a',
        borderRadius: 44,
        padding: 8,
        boxShadow: '0 0 0 2px #333, 0 30px 80px rgba(0,0,0,0.5), inset 0 0 0 1px #444',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Dynamic Island */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        width: 90, height: 28, background: '#000', borderRadius: 14, zIndex: 10,
      }} />
      {/* Screen */}
      <div style={{
        width: '100%', height: '100%', borderRadius: 36, overflow: 'hidden',
        background: 'white', position: 'relative',
      }}>
        {children}
      </div>
    </div>
  );
}

export default function ScreenshotsPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">App Store Screenshots</h1>
        <p className="text-sm text-gray-500 mb-8">
          Print this page (Cmd+P) to export as PDF, or screenshot each frame individually.
        </p>

        <div className="flex flex-wrap gap-8 justify-center">
          {FRAMES.map((frame, i) => (
            <div key={i} className="flex flex-col items-center gap-4">
              {/* Background + phone frame */}
              <div
                style={{ padding: 32, borderRadius: 24 }}
                className={`bg-gradient-to-br ${frame.gradient} flex flex-col items-center gap-6`}
              >
                <PhoneFrame>
                  {frame.mockContent}
                </PhoneFrame>

                {/* Caption below phone but inside gradient bg */}
                <div className="text-center max-w-[280px]">
                  <p className="text-white font-bold text-lg leading-snug whitespace-pre-line drop-shadow">
                    {frame.caption}
                  </p>
                  <p className="text-white/70 text-xs mt-1">{frame.subCaption}</p>
                </div>
              </div>

              <p className="text-xs text-gray-400 font-medium">Screenshot {i + 1} of 5</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-xs text-gray-400">
          <p>Target sizes: 1290 × 2796 px (iPhone 15 Pro Max) and 1242 × 2688 px (iPhone XS Max)</p>
          <p className="mt-1">Use a screenshot tool like CleanShot X or Rottenwood to render at full resolution.</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
