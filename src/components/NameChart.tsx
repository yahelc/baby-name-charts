import { useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';
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
import { Group, Button, Text, useMantineColorScheme } from '@mantine/core';

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

type DataPoint = { x: number; y: number | null; label: string };

const PALETTE = [
  'hsl(211, 60%, 48%)',
  'hsl(27, 65%, 48%)',
  'hsl(150, 50%, 38%)',
  'hsl(340, 55%, 48%)',
  'hsl(262, 45%, 52%)',
  'hsl(185, 55%, 38%)',
  'hsl(0, 55%, 48%)',
  'hsl(45, 65%, 42%)',
];

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

// Draws series labels at the rightmost visible data point for each line,
// replacing the legend box. Resolves vertical collisions by nudging labels down.
const directLabelPlugin: Plugin<'line'> = {
  id: 'directLabel',
  afterDraw(chart) {
    const { ctx, chartArea, data } = chart;
    if (!chartArea) return;

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
    ctx.font = '11px Inter, system-ui, sans-serif';
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
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [persistentTooltip, setPersistentTooltip] = useState<
    | null
    | {
        datasetIndex: number;
        index: number;
        dataX: number;
        dataY: number;
        label: string;
        value: string;
      }
  >(null);

  useImperativeHandle(ref, () => ({
    clearTooltip: () => setPersistentTooltip(null),
    resetZoom: () => { if (chartRef.current) chartRef.current.resetZoom(); },
  }), []);

  const chartData = useMemo(() => {
    const datasets = selectedNames.map(({ name, gender, isRegex, matches }, index) => {
      const allYears = new Set<string>();

      if (isRegex && matches) {
        matches.forEach(matchName => {
          Object.keys(data[matchName]?.M || {}).forEach(y => allYears.add(y));
          Object.keys(data[matchName]?.F || {}).forEach(y => allYears.add(y));
        });
      } else {
        if (gender === 'All' || gender === 'M') {
          Object.keys(data[name]?.M || {}).forEach(y => allYears.add(y));
        }
        if (gender === 'All' || gender === 'F') {
          Object.keys(data[name]?.F || {}).forEach(y => allYears.add(y));
        }
      }

      const firstYear = allYears.size > 0
        ? Math.min(...Array.from(allYears).map(Number))
        : Math.min(yearRange[0], yearRange[1]);

      const [rangeStart, rangeEnd] = [Math.min(yearRange[0], yearRange[1]), Math.max(yearRange[0], yearRange[1])];
      const allYearsInRange = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i);

      const points: DataPoint[] = allYearsInRange.map(year => {
        const yearStr = year.toString();
        let count = 0;

        if (isRegex && matches) {
          matches.forEach(matchName => {
            count += (data[matchName]?.M?.[yearStr] || 0) + (data[matchName]?.F?.[yearStr] || 0);
          });
        } else if (gender === 'All') {
          count = (data[name]?.M?.[yearStr] || 0) + (data[name]?.F?.[yearStr] || 0);
        } else {
          count = data[name]?.[gender]?.[yearStr] || 0;
        }

        // Years after first appearance with no SSA data: render as a gap, not a false zero
        if (year >= firstYear && count === 0) {
          return { x: year, y: null, label: '< 5' };
        }

        if (normalize && count > 0) {
          const total = birthTotals[yearStr] || 1;
          const per100k = (count / total) * 100_000;
          return { x: year, y: per100k, label: per100k.toFixed(1) };
        }

        return { x: year, y: count, label: count.toLocaleString() };
      }).filter(point => point.y !== null ? point.y > 0 : true);

      const color = PALETTE[index % PALETTE.length];
      return {
        label: isRegex ? `${name} (${matches?.join(', ')})` : `${name} (${gender})`,
        data: points as unknown as import('chart.js').Point[],
        borderColor: color,
        backgroundColor: 'transparent',
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
        fill: false,
      };
    });

    return { datasets };
  }, [data, selectedNames, yearRange, normalize, birthTotals]);

  const handleResetZoom = () => {
    if (chartRef.current) chartRef.current.resetZoom();
  };

  const drawTooltipOnCanvas = (chart: ChartJS<'line'>, tooltip: typeof persistentTooltip) => {
    if (!chart || !tooltip) return;
    const ctx = chart.ctx;
    ctx.save();
    const boxWidth = 120;
    const boxHeight = 36;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const x = xScale.getPixelForValue(tooltip.dataX) + 12;
    const y = yScale.getPixelForValue(tooltip.dataY) - boxHeight / 2;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#212529';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + boxWidth, y);
    ctx.lineTo(x + boxWidth, y + boxHeight);
    ctx.lineTo(x, y + boxHeight);
    ctx.closePath();
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
    ctx.strokeStyle = '#222';
    ctx.stroke();
    const pt = chartData.datasets[tooltip.datasetIndex].data[tooltip.index] as unknown as DataPoint;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Year: ${pt.x}`, x + 10, y + 14);
    ctx.beginPath();
    ctx.arc(x + 12, y + 26, 4, 0, 2 * Math.PI);
    ctx.fillStyle = chartData.datasets[tooltip.datasetIndex].borderColor as string;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${chartData.datasets[tooltip.datasetIndex].label}: ${pt.label}`,
      x + 22,
      y + 29
    );
    ctx.restore();
  };

  const clearTooltipOnCanvas = (chart: ChartJS<'line'>, tooltip: typeof persistentTooltip) => {
    if (!chart || !tooltip) return;
    const ctx = chart.ctx;
    ctx.save();
    const boxWidth = 120;
    const boxHeight = 36;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const x = xScale.getPixelForValue(tooltip.dataX) + 12;
    const y = yScale.getPixelForValue(tooltip.dataY) - boxHeight / 2;
    ctx.clearRect(x - 2, y - 2, boxWidth + 4, boxHeight + 4);
    ctx.restore();
    chart.update();
  };

  const handleDownloadChart = () => {
    if (chartRef.current) {
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
    }
  };

  const handleCopyChart = async () => {
    if (chartRef.current) {
      if (persistentTooltip) drawTooltipOnCanvas(chartRef.current, persistentTooltip);
      try {
        const blob = await fetch(chartRef.current.toBase64Image()).then(r => r.blob());
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } catch (err) {
        console.error('Failed to copy chart:', err);
      }
      if (persistentTooltip) clearTooltipOnCanvas(chartRef.current, persistentTooltip);
    }
  };

  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const tickColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';

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

        const lineColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
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
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
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

        const lineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
        const textColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

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

    return [directLabelPlugin, rangeFramePlugin, peakLabelPlugin, histAnnotationsPlugin];
  }, [isDark, showAnnotations]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { right: 120 },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'linear',
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
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: gridColor },
        title: {
          display: true,
          text: normalize ? 'Births per 100K' : 'Births',
          font: { size: 13, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
        ticks: {
          callback: (v) => normalize ? Number(v).toFixed(1) : Number(v).toLocaleString(),
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          color: tickColor,
        },
        suggestedMax: 10,
      },
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (context) => `Year: ${context[0].parsed.x}`,
          label: (context) => {
            const label = context.dataset.label || '';
            const point = context.dataset.data[context.dataIndex] as unknown as DataPoint;
            if (point.y === null) return `${label}: < 5`;
            return `${label}: ${point.label || context.parsed.y.toLocaleString()}`;
          },
        },
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'shift',
        },
        zoom: {
          wheel: { enabled: true, modifierKey: 'ctrl' },
          pinch: { enabled: true },
          mode: 'x',
          drag: {
            enabled: true,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
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
      const meta = chartInstance.getDatasetMeta(datasetIndex);
      const point = meta.data[index];
      let dataX: number, dataY: number;
      const pointAny = point as any;
      if (pointAny.$context && pointAny.$context.parsed) {
        dataX = pointAny.$context.parsed.x;
        dataY = pointAny.$context.parsed.y;
      } else {
        const d = chartData.datasets[datasetIndex].data[index] as unknown as DataPoint;
        dataX = d.x;
        dataY = d.y ?? 0;
      }
      const label = chartData.datasets[datasetIndex].label || '';
      const pt = chartData.datasets[datasetIndex].data[index] as unknown as DataPoint;
      const value = pt.label || '';
      if (
        persistentTooltip &&
        persistentTooltip.datasetIndex === datasetIndex &&
        persistentTooltip.index === index
      ) {
        setPersistentTooltip(null);
      } else {
        setPersistentTooltip({ datasetIndex, index, dataX, dataY, label, value });
      }
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Group justify="space-between" style={{ marginBottom: '8px' }}>
        <Text size="sm" c="dimmed">
          Hold Ctrl + scroll to zoom · Shift + drag to pan · Drag to select
        </Text>
        <Button variant="light" size="xs" onClick={handleResetZoom} style={{ minWidth: '80px' }}>
          Reset Zoom
        </Button>
      </Group>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          plugins={chartPlugins}
          onClick={handleChartClick}
        />
        {persistentTooltip && chartRef.current && (() => {
          const chart = chartRef.current;
          const xScale = chart.scales.x;
          const yScale = chart.scales.y;
          const px = xScale.getPixelForValue(persistentTooltip.dataX);
          const py = yScale.getPixelForValue(persistentTooltip.dataY);
          const pt = chartData.datasets[persistentTooltip.datasetIndex].data[persistentTooltip.index] as unknown as DataPoint;
          return (
            <div
              style={{
                position: 'absolute',
                left: px + 12,
                top: py - 18,
                pointerEvents: 'none',
                zIndex: 10,
                background: 'rgba(33, 37, 41, 0.95)',
                color: '#fff',
                borderRadius: 4,
                fontSize: 12,
                fontFamily: 'inherit',
                padding: '4px 8px',
                minWidth: 100,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                border: '1px solid #222',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <svg width="16" height="16" style={{ position: 'absolute', left: -16, top: 13, pointerEvents: 'none' }}>
                <polygon points="16,4 0,8 16,12" fill="#212529" stroke="#222" strokeWidth="1" />
              </svg>
              <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 1 }}>
                Year: <b>{pt.x}</b>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: chartData.datasets[persistentTooltip.datasetIndex].borderColor as string,
                    border: '1.2px solid #fff',
                    marginRight: 3,
                  }}
                />
                <span style={{ fontWeight: 600, fontSize: 12 }}>
                  {persistentTooltip.label}: {persistentTooltip.value}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={handleDownloadChart} style={{ minWidth: '80px' }}>
            Download
          </Button>
          <Button variant="light" size="xs" onClick={handleCopyChart} style={{ minWidth: '80px' }}>
            Copy
          </Button>
        </Group>
      </div>
    </div>
  );
});

export default NameChart;
