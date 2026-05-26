import { useMantineColorScheme } from '@mantine/core';
import type { NameData, NameSelection } from '../types';
import { buildTimeSeries } from '../utils/chartData';

interface NameStatsProps {
  data: NameData;
  selectedNames: NameSelection[];
  yearRange: [number, number];
  normalize: boolean;
  birthTotals: Record<string, number>;
}

export default function NameStats({ data, selectedNames, yearRange, normalize, birthTotals }: NameStatsProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const series = buildTimeSeries(data, selectedNames, yearRange, normalize, birthTotals);

  const stats = series.map(({ label, color, points }) => {
    const valid = points.filter(p => p.y !== null) as { x: number; y: number; label: string }[];
    if (valid.length === 0) return { label, color, peakYear: '—', peakCount: '—', total: '—', trend: '—' };

    const peak = valid.reduce((best, p) => (p.y > best.y ? p : best), valid[0]);
    const total = valid.reduce((sum, p) => sum + p.y, 0);

    let trend = '→';
    if (valid.length >= 4) {
      const n = Math.min(10, Math.floor(valid.length / 2));
      const firstMean = valid.slice(0, n).reduce((s, p) => s + p.y, 0) / n;
      const lastMean = valid.slice(-n).reduce((s, p) => s + p.y, 0) / n;
      const ratio = lastMean / (firstMean || 1);
      if (ratio > 1.2) trend = '↑';
      else if (ratio < 0.8) trend = '↓';
    }

    return {
      label,
      color,
      peakYear: peak.x.toString(),
      peakCount: normalize ? Number(peak.y.toFixed(1)).toLocaleString() : Math.round(peak.y).toLocaleString(),
      total: normalize ? Number(total.toFixed(1)).toLocaleString() : Math.round(total).toLocaleString(),
      trend,
    };
  });

  const subtleColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const cell: React.CSSProperties = { padding: '7px 12px', fontSize: 12, borderBottom: `1px solid ${borderColor}` };
  const header: React.CSSProperties = { ...cell, fontSize: 11, color: subtleColor, fontWeight: 500 };

  return (
    <div style={{ padding: '0 24px 4px', flexShrink: 0, overflowX: 'auto' }}>
      <div style={{ fontSize: 11, color: subtleColor, marginBottom: 6 }}>Stats</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...header, textAlign: 'left' }}>Name</th>
            <th style={{ ...header, textAlign: 'right' }}>Peak year</th>
            <th style={{ ...header, textAlign: 'right' }}>Peak{normalize ? ' (per 100K)' : ''}</th>
            <th style={{ ...header, textAlign: 'right' }}>Total{normalize ? ' (per 100K)' : ''}</th>
            <th style={{ ...header, textAlign: 'center' }}>Trend</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i}>
              <td style={{ ...cell, textAlign: 'left' }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: s.color, marginRight: 8, flexShrink: 0,
                }} />
                {s.label}
              </td>
              <td style={{ ...cell, textAlign: 'right' }}>{s.peakYear}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{s.peakCount}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{s.total}</td>
              <td style={{ ...cell, textAlign: 'center', fontSize: 14 }}>{s.trend}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
