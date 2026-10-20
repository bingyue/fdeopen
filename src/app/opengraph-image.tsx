import { ImageResponse } from 'next/og';
export const runtime = 'nodejs';
export const alt = 'FDE前线 · Enterprise AI & Agent Industry';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#f2f5f8',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '72px',
        color: '#14243b',
      }}
    >
      <div style={{ display: 'flex', fontSize: 34, color: '#2765c5' }}>
        THE FRONTLINE OF ENTERPRISE AI
      </div>
      <div
        style={{ display: 'flex', fontSize: 86, fontWeight: 700, marginTop: 70, lineHeight: 1.2 }}
      >
        Beyond the technology.
      </div>
      <div
        style={{ display: 'flex', fontSize: 70, fontWeight: 700, color: '#2765c5', marginTop: 10 }}
      >
        Inside the transformation.
      </div>
      <div style={{ display: 'flex', fontSize: 24, marginTop: 70, color: '#7189a5' }}>
        Enterprise AI · Agents · Research · Real-world Practice
      </div>
    </div>,
    size,
  );
}
