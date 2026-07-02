import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { BRAND_BG, BRAND_GOLD, BRAND_GOLD_LIGHT, BRAND_MUTED } from '@/lib/brand-visual';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const rank = p.get('rank') ?? '—';
  const payout = Number(p.get('payout') ?? 0);
  const title = p.get('title') ?? 'Daily Pit';
  const pnlPct = p.get('pnl') ?? '';
  const voided = p.get('voided') === '1';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: `linear-gradient(145deg, ${BRAND_BG} 0%, #14120a 50%, ${BRAND_BG} 100%)`,
          color: '#fafafa',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.28em', color: BRAND_MUTED }}>
            TRADR PIT
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, marginTop: 12, maxWidth: 900 }}>{title}</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          {voided ? (
            <div style={{ fontSize: 42, fontWeight: 800, color: '#f87171' }}>Pit didn&apos;t fill</div>
          ) : (
            <>
              <div style={{ fontSize: 28, color: BRAND_MUTED, marginBottom: 8 }}>Finished</div>
              <div style={{ fontSize: 120, fontWeight: 900, color: BRAND_GOLD, lineHeight: 1 }}>
                #{rank}
              </div>
              {pnlPct && (
                <div style={{ fontSize: 32, fontWeight: 700, color: '#d4d4d4', marginTop: 12 }}>{pnlPct}</div>
              )}
              {payout > 0 && (
                <div
                  style={{
                    marginTop: 20,
                    fontSize: 40,
                    fontWeight: 900,
                    color: BRAND_GOLD_LIGHT,
                  }}
                >
                  +${payout}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ fontSize: 24, color: BRAND_MUTED }}>One pit · $5 in · top half cash</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}