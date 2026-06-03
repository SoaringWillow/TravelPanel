import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt     = 'TravelPanel clip card';
export const size    = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ItemId is passed as a dynamic segment but we render a generic branded card
// since OG routes can't access IndexedDB. The real content is in the page below.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display:         'flex',
          flexDirection:   'column',
          width:           '100%',
          height:          '100%',
          background:      'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          alignItems:      'center',
          justifyContent:  'center',
          fontFamily:      'system-ui, sans-serif',
          color:           '#fff',
          padding:         '60px',
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 24 }}>✈️</div>
        <div style={{ fontSize: 48, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>
          TravelPanel
        </div>
        <div style={{ fontSize: 24, opacity: 0.85, textAlign: 'center' }}>
          Travel inspiration, AI-extracted
        </div>
      </div>
    ),
    { ...size },
  );
}
