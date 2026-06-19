import type { NameData, NameSelection } from '../types';

export const PALETTE = [
  'hsl(211, 60%, 48%)',
  'hsl(27, 65%, 48%)',
  'hsl(150, 50%, 38%)',
  'hsl(340, 55%, 48%)',
  'hsl(262, 45%, 52%)',
  'hsl(185, 55%, 38%)',
  'hsl(0, 55%, 48%)',
  'hsl(45, 65%, 42%)',
];

export function withAlpha(color: string, alpha: number): string {
  return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
}

export type TimeSeriesPoint = { x: number; y: number | null; label: string };

interface TimeSeries {
  label: string;
  color: string;
  points: TimeSeriesPoint[];
}

export function buildTimeSeries(
  data: NameData,
  selectedNames: NameSelection[],
  yearRange: [number, number],
  normalize = false,
  birthTotals: Record<string, number> = {},
): TimeSeries[] {
  return selectedNames.map(({ name, gender, isRegex, matches }, index) => {
    const allYears = new Set<string>();

    if (isRegex && matches) {
      matches.forEach(matchName => {
        Object.keys(data[matchName]?.M || {}).forEach(y => allYears.add(y));
        Object.keys(data[matchName]?.F || {}).forEach(y => allYears.add(y));
      });
    } else {
      if (gender === 'All' || gender === 'M') Object.keys(data[name]?.M || {}).forEach(y => allYears.add(y));
      if (gender === 'All' || gender === 'F') Object.keys(data[name]?.F || {}).forEach(y => allYears.add(y));
    }

    const firstYear = allYears.size > 0
      ? Math.min(...Array.from(allYears).map(Number))
      : Math.min(yearRange[0], yearRange[1]);

    const [rangeStart, rangeEnd] = [Math.min(yearRange[0], yearRange[1]), Math.max(yearRange[0], yearRange[1])];
    const allYearsInRange = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i);

    const points: TimeSeriesPoint[] = allYearsInRange.map(year => {
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

      // Before the name first appeared: silent null (hidden from tooltip)
      if (year < firstYear) return { x: year, y: null, label: '' };

      // After first appearance with no SSA data: labeled gap
      if (count === 0) return { x: year, y: null, label: '< 5' };

      if (normalize) {
        const total = birthTotals[yearStr] || 1;
        const per100k = (count / total) * 100_000;
        return { x: year, y: per100k, label: per100k.toFixed(1) };
      }

      return { x: year, y: count, label: count.toLocaleString() };
    });
    // All years kept (some as null) so every dataset is the same length —
    // required for mode:'index' to align datasets by year correctly.

    const color = PALETTE[index % PALETTE.length];
    const label = isRegex ? `${name} (${matches?.join(', ')})` : `${name} (${gender})`;

    return { label, color, points };
  });
}
