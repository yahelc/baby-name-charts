import { useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { CSSProperties } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type Plugin,
} from 'chart.js';
import type { ChartOptions, Chart as ChartType } from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import type { NameData, NameSelection } from '../types';
import { useMantineColorScheme } from '@mantine/core';
import { buildTimeSeries, type TimeSeriesPoint } from '../utils/chartData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

type DataPoint = TimeSeriesPoint;

const EVENTS = [
  { year: 1918, label: 'WWI ends' },
  { year: 1929, label: 'Depression' },
  { year: 1941, label: 'WWII' },
  { year: 1945, label: 'WWII ends' },
  { year: 1946, label: 'Baby Boom' },
  { year: 1964, label: 'Boom ends' },
  { year: 2001, label: '9/11' },
  { year: 2020, label: 'COVID-19' },
];

// Draws series labels at the rightmost visible point of each line.
// Skips entirely when layout.padding.right < 40 (e.g. on narrow screens).
// Resolves vertical collisions by nudging labels down.
const directLabelPlugin: Plugin<'line'> = {
  id: 'directLabel',
  afterDraw(chart) {
    const { ctx, chartArea, data } = chart;
    if (!chartArea) return;

    const padRight = (chart.options.layout?.padding as Record<string, number> | undefined)?.right ?? 0;
    if (padRight < 40) return;

    type LabelInfo = { targetY: number; y: number; label: string; color: string };
    const collected: LabelInfo[] = [];

    data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;

      for (let i = meta.data.length - 1; i >= 0; i--) {
        const raw = dataset.data[i] as DataPoint;
        if (raw?.y == null) continue;

        const pt = meta.data[i] as unknown as { x: number; y: number };
        if (pt.x < chartArea.left - 1 || pt.x > chartArea.right + 1) continue;
        if (pt.y < chartArea.top - 1 || pt.y > chartArea.bottom + 1) continue;

        const text = dataset.label || '';
        collected.push({
          targetY: pt.y,
          y: pt.y,
          label: text.length > 28 ? text.slice(0, 26) + '…' : text,
          color: dataset.borderColor as string,
        });
        break;
      }
    });

    if (collected.length === 0) return;

    collected.sort((a, b) => a.y - b.y);

    const LINE_HEIGHT = 14;
    for (let i = 1; i < collected.length; i++) {
      if (collected[i].y < collected[i - 1].y + LINE_HEIGHT) {
        collected[i].y = collected[i - 1].y + LINE_HEIGHT;
      }
    }
    for (let i = collected.length - 1; i >= 0; i--) {
      if (collected[i].y > chartArea.bottom) collected[i].y = chartArea.bottom;
    }

    const lx = chartArea.right + 8;

    ctx.save();
    ctx.font = '11px Inter, system-ui, Avenir, Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';

    collected.forEach(({ y, targetY, label, color }) => {
      if (Math.abs(y - targetY) > 4) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 0.75;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(chartArea.right + 2, targetY);
        ctx.lineTo(lx - 2, y + 3);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = color;
      ctx.fillText(label, lx, y + 4);
    });

    ctx.restore();
  },
};

interface NameChartProps {
  data: NameData;
  selectedNames: NameSelection[];
  yearRange: [number, number];
  normalize?: boolean;
  birthTotals?: Record<string, number>;
  showAnnotations?: boolean;
}

const NameChart = forwardRef(function NameChart(
  { data, selectedNames, yearRange, normalize = false, birthTotals = {}, showAnnotations = false }: NameChartProps,
  ref
) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  // Only store identity (which dataset + which year). Values are resolved from
  // current chartData at render time so they stay correct when normalize/range changes.
  const [persistentTooltip, setPersistentTooltip] = useState<
    | null
    | { datasetIndex: number; dataX: number }
  >(null);

  // Track container width to decide label padding and visibility
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 800
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const labelPadRight = containerWidth < 480 ? 0 : containerWidth < 700 ? 72 : 120;

  useImperativeHandle(ref, () => ({
    clearTooltip: () => setPersistentTooltip(null),
    resetZoom: () => { chartRef.current?.resetZoom(); },
  }), []);

  const chartData = useMemo(() => {
    const series = buildTimeSeries(data, selectedNames, yearRange, normalize, birthTotals);
    const datasets = series.map(({ label, color, points }) => ({
      label,
      data: points as unknown as import('chart.js').Point[],
      borderColor: color,
      backgroundColor: 'transparent',
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 10,
      fill: false,
    }));
    return { datasets };
  }, [data, selectedNames, yearRange, normalize, birthTotals]);

  const hasData = selectedNames.length > 0;

  const handleResetZoom = () => { chartRef.current?.resetZoom(); };

  const resolveTooltipPoint = (tooltip: NonNullable<typeof persistentTooltip>) => {
    const ds = chartData.datasets[tooltip.datasetIndex];
    if (!ds) return null;
    const pt = (ds.data as unknown as DataPoint[]).find(p => p.x === tooltip.dataX);
    if (!pt || pt.y == null) return null;
    return { pt, ds };
  };

  const drawTooltipOnCanvas = (chart: ChartJS<'line'>, tooltip: typeof persistentTooltip) => {
    if (!chart || !tooltip) return;
    const resolved = resolveTooltipPoint(tooltip);
    if (!resolved) return;
    const { pt, ds } = resolved;
    const ctx = chart.ctx;
    ctx.save();
    const boxWidth = 120, boxHeight = 36;
    const x = chart.scales.x.getPixelForValue(tooltip.dataX) + 12;
    const y = chart.scales.y.getPixelForValue(pt.y) - boxHeight / 2;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#212529';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(x, y, boxWidth, boxHeight);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + boxHeight / 2 - 4);
    ctx.lineTo(x - 12, y + boxHeight / 2);
    ctx.lineTo(x - 4, y + boxHeight / 2 + 4);
    ctx.closePath();
    ctx.fillStyle = '#212529';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Year: ${pt.x}`, x + 10, y + 14);
    ctx.beginPath();
    ctx.arc(x + 12, y + 26, 4, 0, 2 * Math.PI);
    ctx.fillStyle = ds.borderColor as string;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${ds.label}: ${pt.label}`, x + 22, y + 29);
    ctx.restore();
  };

  const clearTooltipOnCanvas = (chart: ChartJS<'line'>, tooltip: typeof persistentTooltip) => {
    if (!chart || !tooltip) return;
    const resolved = resolveTooltipPoint(tooltip);
    if (!resolved) return;
    const ctx = chart.ctx;
    ctx.save();
    const boxWidth = 120, boxHeight = 36;
    const x = chart.scales.x.getPixelForValue(tooltip.dataX) + 12;
    const y = chart.scales.y.getPixelForValue(resolved.pt.y!) - boxHeight / 2;
    ctx.clearRect(x - 2, y - 2, boxWidth + 4, boxHeight + 4);
    ctx.restore();
    chart.update();
  };

  const handleDownloadChart = () => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, chartRef.current.width, chartRef.current.height);
    ctx.restore();
    if (persistentTooltip) drawTooltipOnCanvas(chartRef.current, persistentTooltip);
    const link = document.createElement('a');
    link.download = 'baby-name-trends.png';
    link.href = chartRef.current.toBase64Image();
    link.click();
    if (persistentTooltip) clearTooltipOnCanvas(chartRef.current, persistentTooltip);
  };

  const handleCopyChart = async () => {
    if (!chartRef.current) return;
    if (persistentTooltip) drawTooltipOnCanvas(chartRef.current, persistentTooltip);
    try {
      const blob = await fetch(chartRef.current.toBase64Image()).then(r => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (err) {
      console.error('Failed to copy chart:', err);
    }
    if (persistentTooltip) clearTooltipOnCanvas(chartRef.current, persistentTooltip);
  };

  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const tickColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const allDataX = chartData.datasets.flatMap(d =>
    (d.data as unknown as DataPoint[]).filter(p => p.y !== null).map(p => p.x)
  );
  const xMin = allDataX.reduce((min, x) => Math.min(min, x), yearRange[0]);
  const xMax = allDataX.reduce((max, x) => Math.max(max, x), yearRange[1]);

  // Per-instance plugins created via useMemo so closures capture current isDark/showAnnotations
  const chartPlugins = useMemo((): Plugin<'line'>[] => {
    const rangeFramePlugin: Plugin<'line'> = {
      id: 'rangeFrame',
      afterDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;

        const allX: number[] = [];
        const allY: number[] = [];
        chart.data.datasets.forEach((_, i) => {
          const meta = chart.getDatasetMeta(i);
          if (meta.hidden) return;
          meta.data.forEach(pt => {
            const parsed = (pt as any).$context?.parsed;
            if (parsed && parsed.y !== null && parsed.y > 0) {
              allX.push(parsed.x);
              allY.push(parsed.y);
            }
          });
        });

        if (allX.length === 0) return;

        const xDataMin = Math.min(...allX);
        const xDataMax = Math.max(...allX);
        const yDataMax = Math.max(0, ...allY);

        const xPixelMin = Math.max(scales.x.getPixelForValue(xDataMin), chartArea.left);
        const xPixelMax = Math.min(scales.x.getPixelForValue(xDataMax), chartArea.right);
        const yPixelMin = Math.max(scales.y.getPixelForValue(yDataMax), chartArea.top);

        const lineColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
        ctx.save();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xPixelMin, chartArea.bottom);
        ctx.lineTo(xPixelMax, chartArea.bottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(chartArea.left, yPixelMin);
        ctx.lineTo(chartArea.left, chartArea.bottom);
        ctx.stroke();
        ctx.restore();
      },
    };

    const peakLabelPlugin: Plugin<'line'> = {
      id: 'peakLabel',
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;

        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          if (meta.hidden) return;

          let peakIdx = -1;
          let peakVal = -Infinity;
          (dataset.data as unknown as DataPoint[]).forEach((pt, idx) => {
            if (pt.y !== null && pt.y > peakVal) {
              peakVal = pt.y;
              peakIdx = idx;
            }
          });

          if (peakIdx < 0) return;

          const metaPt = meta.data[peakIdx] as unknown as { x: number; y: number };
          if (metaPt.x < chartArea.left || metaPt.x > chartArea.right) return;
          if (metaPt.y < chartArea.top || metaPt.y > chartArea.bottom) return;

          const ptData = dataset.data[peakIdx] as unknown as DataPoint;
          const color = dataset.borderColor as string;

          ctx.save();
          ctx.beginPath();
          ctx.arc(metaPt.x, metaPt.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
          ctx.textAlign = 'center';
          ctx.fillText(`${ptData.x}: ${ptData.label}`, metaPt.x, metaPt.y - 8);
          ctx.restore();
        });
      },
    };

    const histAnnotationsPlugin: Plugin<'line'> = {
      id: 'histAnnotations',
      beforeDraw(chart) {
        if (!showAnnotations) return;
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;

        const lineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
        const textColor = isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)';

        ctx.save();
        EVENTS.forEach(({ year, label }) => {
          if (year < scales.x.min || year > scales.x.max) return;
          const px = scales.x.getPixelForValue(year);
          if (px < chartArea.left || px > chartArea.right) return;

          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(px, chartArea.top);
          ctx.lineTo(px, chartArea.bottom);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.save();
          ctx.translate(px - 4, chartArea.top + 4);
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = textColor;
          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(label, 0, 0);
          ctx.restore();
        });
        ctx.restore();
      },
    };

    const cursorPlugin: Plugin<'line'> = {
      id: 'cursor',
      afterDraw(chart) {
        const active = chart.getActiveElements();
        if (active.length === 0) return;

        const { ctx, chartArea } = chart;
        if (!chartArea) return;

        const dataIndex = active[0].index;

        // Get x pixel from first visible dataset element
        let xPixel: number | null = null;
        for (let i = 0; i < chart.data.datasets.length; i++) {
          const meta = chart.getDatasetMeta(i);
          if (!meta.hidden && meta.data[dataIndex]) {
            xPixel = (meta.data[dataIndex] as unknown as { x: number; y: number }).x;
            break;
          }
        }
        if (xPixel === null || xPixel < chartArea.left - 1 || xPixel > chartArea.right + 1) return;

        ctx.save();

        // Vertical cursor rule
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xPixel, chartArea.top);
        ctx.lineTo(xPixel, chartArea.bottom);
        ctx.stroke();

        // Collect one label per visible series with real data at this index
        type CItem = { yPixel: number; origY: number; color: string; text: string };
        const items: CItem[] = [];

        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          if (meta.hidden) return;
          const pt = dataset.data[dataIndex] as unknown as DataPoint;
          if (!pt || pt.y === null || pt.label === '' || pt.label === '< 5') return;
          const el = meta.data[dataIndex] as unknown as { x: number; y: number } | undefined;
          if (!el) return;
          const yPixel = el.y;
          if (yPixel < chartArea.top - 1 || yPixel > chartArea.bottom + 1) return;
          const nameLabel = (dataset.label || '').length > 22 ? (dataset.label || '').slice(0, 20) + '…' : (dataset.label || '');
          items.push({ yPixel, origY: yPixel, color: dataset.borderColor as string, text: `${nameLabel}: ${pt.label}` });
        });

        if (items.length > 0) {
          // Resolve vertical collisions by nudging down
          items.sort((a, b) => a.yPixel - b.yPixel);
          const MIN_GAP = 15;
          for (let i = 1; i < items.length; i++) {
            if (items[i].yPixel < items[i - 1].yPixel + MIN_GAP) {
              items[i].yPixel = items[i - 1].yPixel + MIN_GAP;
            }
          }
          for (let i = items.length - 1; i >= 0; i--) {
            if (items[i].yPixel > chartArea.bottom - 2) items[i].yPixel = chartArea.bottom - 2;
          }

          const nearRight = xPixel > chartArea.right - 160;
          const lx = nearRight ? xPixel - 7 : xPixel + 7;
          ctx.font = '11px Inter, system-ui, sans-serif';

          items.forEach(({ yPixel, origY, color, text }) => {
            // Dot at actual data y-position on the cursor line
            ctx.beginPath();
            ctx.arc(xPixel!, origY, 3, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            // Value label in series color, at collision-resolved y
            ctx.textAlign = nearRight ? 'right' : 'left';
            ctx.fillStyle = color;
            ctx.fillText(text, lx, yPixel + 4);
          });
        }

        // Year chip in the x-axis area
        let xVal: number | null = null;
        for (const ds of chart.data.datasets) {
          const pt = ds.data[dataIndex] as unknown as DataPoint;
          if (pt?.x != null) { xVal = pt.x; break; }
        }
        if (xVal != null) {
          const yearStr = String(xVal);
          ctx.font = '11px Inter, system-ui, sans-serif';
          const tw = ctx.measureText(yearStr).width;
          const bgX = xPixel - tw / 2 - 3;
          const bgY = chartArea.bottom + 3;
          ctx.fillStyle = isDark ? 'rgba(26,27,30,0.92)' : 'rgba(255,255,255,0.92)';
          ctx.fillRect(bgX, bgY, tw + 6, 14);
          ctx.textAlign = 'center';
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
          ctx.fillText(yearStr, xPixel, bgY + 11);
        }

        ctx.restore();
      },
    };

    return [directLabelPlugin, rangeFramePlugin, peakLabelPlugin, histAnnotationsPlugin, cursorPlugin];
  }, [isDark, showAnnotations]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { right: labelPadRight, top: 4 },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        type: 'linear',
        display: hasData,
        border: { display: false },
        grid: { color: gridColor },
        title: { display: false },
        min: xMin,
        max: xMax,
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
        display: hasData,
        beginAtZero: true,
        border: { display: false },
        grid: { color: gridColor },
        title: {
          display: hasData,
          text: normalize ? 'Births per 100K' : 'Births',
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
        ticks: {
          callback: (v) => {
            const n = Number(v);
            if (normalize) return n % 1 === 0 ? n.toLocaleString() : n.toFixed(1);
            return n.toLocaleString();
          },
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
        suggestedMax: 10,
      },
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { enabled: false },
      zoom: {
        pan: { enabled: true, mode: 'x', modifierKey: 'shift' },
        zoom: {
          wheel: { enabled: true, modifierKey: 'ctrl' },
          pinch: { enabled: true },
          mode: 'x',
          drag: {
            enabled: true,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
            borderWidth: 1,
          },
        },
        limits: { x: { min: 1880, max: 2022 } },
      },
    },
  };

  const handleChartClick = (event: any, chart?: ChartType<'line'>) => {
    const chartInstance = chart || chartRef.current;
    if (!chartInstance) return;
    const points = chartInstance.getElementsAtEventForMode(event.nativeEvent, 'nearest', { intersect: true }, true);
    if (points.length > 0) {
      const { datasetIndex, index } = points[0];
      const pt = chartData.datasets[datasetIndex]?.data[index] as unknown as DataPoint;
      if (!pt) return;
      const dataX = pt.x;
      if (persistentTooltip?.datasetIndex === datasetIndex && persistentTooltip?.dataX === dataX) {
        setPersistentTooltip(null);
      } else {
        setPersistentTooltip({ datasetIndex, dataX });
      }
    }
  };

  const ctrlBtn: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)',
    padding: 0,
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Chart canvas ────────────────────────────────────── */}
      <div ref={containerRef} style={{ flex: '1 1 0', minHeight: 0, position: 'relative' }}>
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          plugins={chartPlugins}
          onClick={handleChartClick}
        />

        {/* Empty state prompt */}
        {!hasData && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: 13,
              letterSpacing: '0.02em',
              color: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)',
            }}>
              Search for a name above to see trends
            </span>
          </div>
        )}

        {/* Persistent click tooltip */}
        {persistentTooltip && chartRef.current && (() => {
          const resolved = resolveTooltipPoint(persistentTooltip);
          if (!resolved) return null;
          const { pt, ds } = resolved;
          const chart = chartRef.current;
          const px = chart.scales.x.getPixelForValue(persistentTooltip.dataX);
          const py = chart.scales.y.getPixelForValue(pt.y!);
          return (
            <div style={{
              position: 'absolute',
              left: px + 12,
              top: py - 18,
              pointerEvents: 'none',
              zIndex: 10,
              background: 'rgba(33,37,41,0.95)',
              color: '#fff',
              borderRadius: 3,
              fontSize: 12,
              fontFamily: 'inherit',
              padding: '4px 8px',
              minWidth: 100,
              boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
              border: '1px solid rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              <svg width="16" height="16" style={{ position: 'absolute', left: -16, top: 13, pointerEvents: 'none' }}>
                <polygon points="16,4 0,8 16,12" fill="rgba(33,37,41,0.95)" />
              </svg>
              <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 1 }}>
                {pt.x}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: ds.borderColor as string,
                  flexShrink: 0,
                }} />
                <span style={{ fontWeight: 600, fontSize: 12 }}>
                  {ds.label}: {pt.label}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Controls ────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 16,
        padding: '4px 0 6px',
      }}>
        {hasData && (
          <button onClick={handleResetZoom} style={ctrlBtn}>reset zoom</button>
        )}
        <button onClick={handleDownloadChart} style={ctrlBtn}>download</button>
        <button onClick={handleCopyChart} style={ctrlBtn}>copy image</button>
      </div>
    </div>
  );
});

export default NameChart;
