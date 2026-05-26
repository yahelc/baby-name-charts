import { useMemo } from 'react';
import {
  Chart as ChartJS,
  BarElement,
  BarController,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useMantineColorScheme } from '@mantine/core';
import type { NameData, NameSelection } from '../types';
import { buildTimeSeries, withAlpha } from '../utils/chartData';

ChartJS.register(BarElement, BarController);

interface DecadeSummaryProps {
  data: NameData;
  selectedNames: NameSelection[];
  yearRange: [number, number];
  normalize: boolean;
  birthTotals: Record<string, number>;
}

export default function DecadeSummary({ data, selectedNames, yearRange, normalize, birthTotals }: DecadeSummaryProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const tickColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const [rangeStart, rangeEnd] = [Math.min(yearRange[0], yearRange[1]), Math.max(yearRange[0], yearRange[1])];

  const { labels, datasets, hasPartial } = useMemo(() => {
    const series = buildTimeSeries(data, selectedNames, yearRange, normalize, birthTotals);

    const decadeStart = Math.floor(rangeStart / 10) * 10;
    const decadeEnd = Math.floor(rangeEnd / 10) * 10;
    const decades: number[] = [];
    for (let d = decadeStart; d <= decadeEnd; d += 10) decades.push(d);

    let partial = false;
    const lbls = decades.map(d => {
      const dStart = Math.max(d, rangeStart);
      const dEnd = Math.min(d + 9, rangeEnd);
      const isPartial = dStart > d || dEnd < d + 9;
      if (isPartial) partial = true;
      return isPartial ? `${d}s*` : `${d}s`;
    });

    const ds = series.map(({ label, color, points }) => {
      const sums = decades.map(d => {
        const dStart = Math.max(d, rangeStart);
        const dEnd = Math.min(d + 9, rangeEnd);
        return points
          .filter(p => p.x >= dStart && p.x <= dEnd && p.y !== null)
          .reduce((sum, p) => sum + (p.y as number), 0);
      });
      return {
        label,
        data: sums,
        backgroundColor: withAlpha(color, 0.7),
        borderColor: color,
        borderWidth: 1,
      };
    });

    return { labels: lbls, datasets: ds, hasPartial: partial };
  }, [data, selectedNames, yearRange, normalize, birthTotals, rangeStart, rangeEnd]);

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 4 } },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: {
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
      },
      y: {
        border: { display: false },
        grid: { color: gridColor },
        title: {
          display: true,
          text: normalize ? 'Per 100K (sum)' : 'Births per decade',
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
        ticks: {
          callback: (v) => Number(v).toLocaleString(),
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
      },
    },
    plugins: {
      legend: {
        display: selectedNames.length > 1,
        labels: {
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
          boxWidth: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.y;
            const formatted = normalize ? v.toFixed(1) : Math.round(v).toLocaleString();
            return `${ctx.dataset.label}: ${formatted}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ padding: '0 24px 16px', flexShrink: 0 }}>
      <div style={{ fontSize: 11, color: tickColor, marginBottom: 4 }}>
        Births by decade{hasPartial ? ' * partial decade' : ''}
      </div>
      <div style={{ height: 200 }}>
        <Bar data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}
