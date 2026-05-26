import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions, Plugin } from 'chart.js';
import { useMantineColorScheme } from '@mantine/core';
import type { NameData, NameSelection } from '../types';
import { buildTimeSeries } from '../utils/chartData';

interface YoYChartProps {
  data: NameData;
  selectedNames: NameSelection[];
  yearRange: [number, number];
  normalize: boolean;
  birthTotals: Record<string, number>;
}

export default function YoYChart({ data, selectedNames, yearRange, normalize, birthTotals }: YoYChartProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const tickColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const zeroLineColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';

  const chartData = useMemo(() => {
    const series = buildTimeSeries(data, selectedNames, yearRange, normalize, birthTotals);

    const datasets = series.map(({ label, color, points }) => {
      const yoyPoints: { x: number; y: number | null }[] = [];
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        if (prev.y === null || curr.y === null || prev.y === 0) {
          yoyPoints.push({ x: curr.x, y: null });
        } else {
          yoyPoints.push({ x: curr.x, y: ((curr.y - prev.y) / prev.y) * 100 });
        }
      }
      return {
        label,
        data: yoyPoints as unknown as import('chart.js').Point[],
        borderColor: color,
        backgroundColor: 'transparent',
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
        fill: false,
        borderWidth: 1.5,
      };
    });

    return { datasets };
  }, [data, selectedNames, yearRange, normalize, birthTotals]);

  const zeroLinePlugin = useMemo((): Plugin<'line'> => ({
    id: 'yoyZeroLine',
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.y) return;
      const y0 = scales.y.getPixelForValue(0);
      if (y0 < chartArea.top || y0 > chartArea.bottom) return;
      ctx.save();
      ctx.strokeStyle = zeroLineColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y0);
      ctx.lineTo(chartArea.right, y0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  }), [zeroLineColor]);

  const [rangeStart, rangeEnd] = [Math.min(yearRange[0], yearRange[1]), Math.max(yearRange[0], yearRange[1])];

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 4 } },
    interaction: { mode: 'x', intersect: false },
    scales: {
      x: {
        type: 'linear',
        min: rangeStart,
        max: rangeEnd,
        border: { display: false },
        grid: { color: gridColor },
        ticks: {
          callback: (v) => Number.isInteger(v as number) ? (v as number).toString() : '',
          stepSize: 1,
          autoSkip: true,
          maxRotation: 0,
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
      },
      y: {
        border: { display: false },
        grid: { color: gridColor },
        title: {
          display: true,
          text: 'YoY % change',
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
        ticks: {
          callback: (v) => `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(0)}%`,
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (ctx) => `Year: ${ctx[0].parsed.x}`,
          label: (ctx) => {
            const v = ctx.parsed.y;
            if (v === null || isNaN(v)) return '';
            return `${ctx.dataset.label}: ${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
          },
        },
      },
    },
  };

  return (
    <div style={{ padding: '0 24px', flexShrink: 0 }}>
      <div style={{ fontSize: 11, color: tickColor, marginBottom: 4 }}>Year-over-year % change</div>
      <div style={{ height: 170 }}>
        <Line data={chartData} options={options} plugins={[zeroLinePlugin]} />
      </div>
    </div>
  );
}
