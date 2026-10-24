import { ImageResponse } from 'next/og';
export const runtime = 'nodejs';
export const alt = 'FDE前线 · Enterprise AI & Agent Industry';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#fafbfd',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '72px',
        color: '#14243b',
        borderBottom: '12px solid #14243b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 34 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <path d="M37 10H8v46h44V31" fill="none" stroke="#14243b" strokeWidth="4" />
          <path d="M20 21h19v8H28v7h10v8H28v8h-8Z" fill="#14243b" />
          <path d="M39 25 56 8M44 8h12v12" fill="none" stroke="#16705f" strokeWidth="4" />
        </svg>
        FDE FRONTLINE
      </div>
      <div
        style={{ display: 'flex', fontSize: 86, fontWeight: 700, marginTop: 70, lineHeight: 1.2 }}
      >
        Beyond the technology.
      </div>
      <div
        style={{ display: 'flex', fontSize: 70, fontWeight: 700, color: '#16705f', marginTop: 10 }}
      >
        Inside the transformation.
      </div>
      <div style={{ display: 'flex', fontSize: 24, marginTop: 50, color: '#53667b' }}>
        Enterprise AI · Agents · Research · Real-world Practice
      </div>
    </div>,
    size,
  );
}
