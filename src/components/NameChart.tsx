import { useMemo, useRef } from 'react';
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
import type { ChartOptions } from 'chart.js';
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

export default function NameChart({ data, selectedNames, yearRange }: NameChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

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
      const sortedYears = Array.from(allYears)
        .map(Number)
        .filter(year => year >= rangeStart && year <= rangeEnd)
        .sort((a, b) => a - b);

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
            return tickValue.toString();
          },
          stepSize: 20,
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
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
} 