import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TradR Pit — $5 daily trading contest';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(145deg, #0a0a0a 0%, #14120a 45%, #0a0a0a 100%)',
          color: '#fafafa',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.28em',
              color: '#a3a3a3',
              textTransform: 'uppercase',
            }}
          >
            TradR Pit
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
            One pit. Every day.
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: '#eab308', marginTop: 8 }}>
            $5 in · top half cash
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#d4d4d4' }}>
            SPY · QQQ · NVDA · BTC · ETH
          </div>
          <div style={{ fontSize: 24, color: '#737373' }}>
            9:30 AM – 4:00 PM ET · ring in early to lock your spot
          </div>
          <div
            style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              padding: '14px 28px',
              borderRadius: 16,
              background: 'linear-gradient(180deg, #f5d020 0%, #eab308 100%)',
              color: '#0a0a0a',
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            Watch the tape · Ring in · Trade live
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}