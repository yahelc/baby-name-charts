import { useMemo } from 'react';
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
import type { NameData, NameSelection } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface NameChartProps {
  data: NameData;
  selectedNames: NameSelection[];
  yearRange: [number, number];
}

export default function NameChart({ data, selectedNames, yearRange }: NameChartProps) {
  const chartData = useMemo(() => {
    const datasets = selectedNames.map(({ name, gender }, index) => {
      // Get all available years for this name
      const allYears = new Set<string>();
      if (gender === 'All' || gender === 'M') {
        Object.keys(data[name]?.M || {}).forEach(year => allYears.add(year));
      }
      if (gender === 'All' || gender === 'F') {
        Object.keys(data[name]?.F || {}).forEach(year => allYears.add(year));
      }

      // Sort years and filter by range
      const sortedYears = Array.from(allYears)
        .map(Number)
        .filter(year => year >= yearRange[0] && year <= yearRange[1])
        .sort((a, b) => a - b);

      // Find the first year this name appears
      const firstYear = Math.min(...sortedYears);

      // Generate all years in range
      const allYearsInRange = Array.from(
        { length: yearRange[1] - yearRange[0] + 1 },
        (_, i) => yearRange[0] + i
      );

      const points = allYearsInRange.map(year => {
        const yearStr = year.toString();
        let count = 0;
        if (gender === 'All') {
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
      });

      return {
        label: `${name} (${gender})`,
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
        min: yearRange[0],
        max: yearRange[1],
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
    },
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      position: 'relative'
    }}>
      <Line data={chartData} options={options} />
    </div>
  );
} 