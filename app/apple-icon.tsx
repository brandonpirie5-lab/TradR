import { ImageResponse } from 'next/og';
import { BRAND_BG, BRAND_GOLD, BRAND_GOLD_LIGHT } from '@/lib/brand-visual';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_BG,
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(145deg, ${BRAND_GOLD_LIGHT} 0%, ${BRAND_GOLD} 100%)`,
            fontSize: 72,
            fontWeight: 900,
            color: BRAND_BG,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          T
        </div>
      </div>
    ),
    { ...size }
  );
}