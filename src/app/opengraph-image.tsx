import { ImageResponse } from 'next/og';
export const runtime = 'nodejs';
export const alt = 'FDEOpen — Open Source · AI Agents · Real-world Deployment';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#f5f9ff',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '72px',
        color: '#19324e',
      }}
    >
      <div style={{ display: 'flex', fontSize: 34, color: '#2468eb' }}>
        FDEOpen / THE OPEN COMMUNITY FOR FDE
      </div>
      <div
        style={{ display: 'flex', fontSize: 86, fontWeight: 700, marginTop: 70, lineHeight: 1.2 }}
      >
        Build in the open.
      </div>
      <div
        style={{ display: 'flex', fontSize: 70, fontWeight: 700, color: '#2468eb', marginTop: 10 }}
      >
        Deploy in the real world.
      </div>
      <div style={{ display: 'flex', fontSize: 24, marginTop: 70, color: '#7189a5' }}>
        Open Source · AI Agents · Real-world Deployment
      </div>
    </div>,
    size,
  );
}
