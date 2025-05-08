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
} from 'chart.js';
import type { ChartOptions, Chart as ChartType } from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import type { NameData, NameSelection } from '../types';
import { Group, Button, Text } from '@mantine/core';

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

interface NameChartProps {
  data: NameData;
  selectedNames: NameSelection[];
  yearRange: [number, number];
}

const NameChart = forwardRef(function NameChart({ data, selectedNames, yearRange }: NameChartProps, ref) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  // Store data coordinates (dataX, dataY) and recalculate pixel position on render
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

  // Expose a clearTooltip method to parent
  useImperativeHandle(ref, () => ({
    clearTooltip: () => setPersistentTooltip(null)
  }), []);

  const chartData = useMemo(() => {
    const datasets = selectedNames.map(({ name, gender, isRegex, matches }, index) => {
      // Get all available years for this name
      const allYears = new Set<string>();
      
      if (isRegex && matches) {
        // For regex matches, combine data from all matching names
        matches.forEach(matchName => {
          const maleYears = Object.keys(data[matchName]?.M || {});
          const femaleYears = Object.keys(data[matchName]?.F || {});
          maleYears.forEach(year => allYears.add(year));
          femaleYears.forEach(year => allYears.add(year));
        });
      } else {
        // Regular name selection
        if (gender === 'All' || gender === 'M') {
          Object.keys(data[name]?.M || {}).forEach(year => allYears.add(year));
        }
        if (gender === 'All' || gender === 'F') {
          Object.keys(data[name]?.F || {}).forEach(year => allYears.add(year));
        }
      }

      // Find the first year this name appears (across all years, not just the range)
      const firstYear = Array.from(allYears).length > 0 
        ? Math.min(...Array.from(allYears).map(Number))
        : Math.min(yearRange[0], yearRange[1]);

      // Sort years and filter by range
      const [rangeStart, rangeEnd] = [Math.min(yearRange[0], yearRange[1]), Math.max(yearRange[0], yearRange[1])];


      // Generate all years in range
      const allYearsInRange = Array.from(
        { length: rangeEnd - rangeStart + 1 },
        (_, i) => rangeStart + i
      );

      const points = allYearsInRange.map(year => {
        const yearStr = year.toString();
        let count = 0;

        if (isRegex && matches) {
          // For regex matches, sum up all matching names
          matches.forEach(matchName => {
            const maleCount = data[matchName]?.M?.[yearStr] || 0;
            const femaleCount = data[matchName]?.F?.[yearStr] || 0;
            count += maleCount + femaleCount;
          });
        } else if (gender === 'All') {
          count = (data[name]?.M?.[yearStr] || 0) + (data[name]?.F?.[yearStr] || 0);
        } else {
          count = data[name]?.[gender]?.[yearStr] || 0;
        }

        // If this year is after the first appearance but has no data, show "< 5"
        if (year >= firstYear && count === 0) {
          return {
            x: year,
            y: 0,
            label: '< 5'
          };
        }

        return {
          x: year,
          y: count,
          label: count.toLocaleString()
        };
      }).filter(point => point.y > 0 || point.label === '< 5');

      return {
        label: isRegex ? `${name} (${matches?.join(', ')})` : `${name} (${gender})`,
        data: points,
        borderColor: `hsl(${(index * 137.5 + 200) % 360}, 70%, 50%)`,
        backgroundColor: `hsla(${(index * 137.5 + 200) % 360}, 70%, 50%, 0.5)`,
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5,
      };
    });

    return {
      datasets,
    };
  }, [data, selectedNames, yearRange]);

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  // Helper to draw the persistent tooltip on the canvas
  const drawTooltipOnCanvas = (chart: ChartJS<'line'>, tooltip: typeof persistentTooltip) => {
    if (!chart || !tooltip) return;
    const ctx = chart.ctx;
    ctx.save();
    // Tooltip box
    const boxWidth = 120;
    const boxHeight = 36;
    // Recalculate pixel position from data coordinates
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const x = xScale.getPixelForValue(tooltip.dataX) + 12;
    const y = yScale.getPixelForValue(tooltip.dataY) - boxHeight / 2;
    // Draw background
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
    // Draw triangle pointer
    ctx.beginPath();
    ctx.moveTo(x - 4, y + boxHeight / 2 - 4);
    ctx.lineTo(x - 12, y + boxHeight / 2);
    ctx.lineTo(x - 4, y + boxHeight / 2 + 4);
    ctx.closePath();
    ctx.fillStyle = '#212529';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.stroke();
    // Year text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Year: ${chartData.datasets[tooltip.datasetIndex].data[tooltip.index].x}`, x + 10, y + 14);
    // Color dot
    ctx.beginPath();
    ctx.arc(x + 12, y + 26, 4, 0, 2 * Math.PI);
    ctx.fillStyle = chartData.datasets[tooltip.datasetIndex].borderColor as string;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Label and value
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${chartData.datasets[tooltip.datasetIndex].label}: ${chartData.datasets[tooltip.datasetIndex].data[tooltip.index].label}`,
      x + 22,
      y + 29
    );
    ctx.restore();
  };

  // Helper to clear the tooltip area after export
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
      // Fill background with white before drawing chart and tooltip
      const ctx = chartRef.current.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, chartRef.current.width, chartRef.current.height);
      ctx.restore();
      if (persistentTooltip) {
        drawTooltipOnCanvas(chartRef.current, persistentTooltip);
      }
      const link = document.createElement('a');
      link.download = 'baby-name-trends.png';
      link.href = chartRef.current.toBase64Image();
      link.click();
      if (persistentTooltip) {
        clearTooltipOnCanvas(chartRef.current, persistentTooltip);
      }
    }
  };

  const handleCopyChart = async () => {
    if (chartRef.current) {
      if (persistentTooltip) {
        drawTooltipOnCanvas(chartRef.current, persistentTooltip);
      }
      try {
        const blob = await fetch(chartRef.current.toBase64Image()).then(r => r.blob());
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
      } catch (err) {
        console.error('Failed to copy chart:', err);
      }
      if (persistentTooltip) {
        clearTooltipOnCanvas(chartRef.current, persistentTooltip);
      }
    }
  };

  // Custom external tooltip handler
  const externalTooltipHandler = () => {
    // We do not render the tooltip here, we use React below
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Year',
          font: {
            size: 14,
          },
        },
        min: Math.min(...chartData.datasets.flatMap(d => d.data.map(p => p.x))),
        max: Math.max(...chartData.datasets.flatMap(d => d.data.map(p => p.x))),
        ticks: {
          callback: function(tickValue) {
            if (Number.isInteger(tickValue)) {
              return tickValue.toString();
            }
            return '';
          },
          stepSize: 1,
          autoSkip: true,
          maxRotation: 0,
          font: {
            size: 12
          }
        },
        display: true,
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Babies',
          font: {
            size: 14,
          },
        },
        ticks: {
          callback: function(tickValue) {
            return tickValue.toLocaleString();
          },
          font: {
            size: 12
          }
        },
        suggestedMax: 10,
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Baby Name Trends Over Time',
        font: {
          size: 16,
        },
      },
      tooltip: {
        enabled: true,
        external: externalTooltipHandler,
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (context) => {
            return `Year: ${context[0].parsed.x}`;
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const point = context.dataset.data[context.dataIndex] as { label?: string };
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
          wheel: {
            enabled: true,
            modifierKey: 'ctrl',
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
          drag: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderColor: 'rgba(0, 0, 0, 0.2)',
            borderWidth: 1,
          },
        },
        limits: {
          x: {
            min: 1880,
            max: 2022,
          }
        }
      }
    },
  };

  // Click handler for persistent tooltip
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
        // fallback: use dataset data
        const d = chartData.datasets[datasetIndex].data[index] as any;
        dataX = d.x;
        dataY = d.y;
      }
      const label = chartData.datasets[datasetIndex].label || '';
      const value = chartData.datasets[datasetIndex].data[index].label || '';
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
    <div style={{ 
      width: '100%', 
      height: '100%',
      position: 'relative'
    }}>
      <Group justify="space-between" style={{ marginBottom: '8px' }}>
        <Text size="sm" c="dimmed">
          Hold Ctrl + scroll to zoom • Hold Shift + drag to pan • Drag to select area
        </Text>
        <Button
          variant="light"
          size="xs"
          onClick={handleResetZoom}
          style={{ minWidth: '80px' }}
        >
          Reset Zoom
        </Button>
      </Group>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Line ref={chartRef} data={chartData} options={options} onClick={handleChartClick} />
        {persistentTooltip && chartRef.current && (() => {
          // Recalculate pixel position from data coordinates
          const chart = chartRef.current;
          const xScale = chart.scales.x;
          const yScale = chart.scales.y;
          const px = xScale.getPixelForValue(persistentTooltip.dataX);
          const py = yScale.getPixelForValue(persistentTooltip.dataY);
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
              {/* Triangle pointer */}
              <svg width="16" height="16" style={{ position: 'absolute', left: -16, top: 13, pointerEvents: 'none' }}>
                <polygon points="16,4 0,8 16,12" fill="#212529" stroke="#222" strokeWidth="1" />
              </svg>
              <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 1 }}>
                Year: <b>{chartData.datasets[persistentTooltip.datasetIndex].data[persistentTooltip.index].x}</b>
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
          <Button
            variant="light"
            size="xs"
            onClick={handleDownloadChart}
            style={{ minWidth: '80px' }}
            leftSection="💾 "
          >
            Download
          </Button>
          <Button
            variant="light"
            size="xs"
            onClick={handleCopyChart}
            style={{ minWidth: '80px' }}
            leftSection="🖼️ "
          >
            Copy
          </Button>
        </Group>
      </div>
    </div>
  );
});

export default NameChart; 