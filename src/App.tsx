import { useMantineColorScheme } from '@mantine/core';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { NameData, NameSelection } from './types';
import NameSearch from './components/NameSearch';
import NameChart from './components/NameChart';
import NameStats from './components/NameStats';
import YoYChart from './components/YoYChart';
import DecadeSummary from './components/DecadeSummary';
import interestingNames from './interestingNames';

interface ChunkInfo {
  filename: string;
}

interface Manifest {
  chunks: ChunkInfo[];
}

function App() {
  const [data, setData] = useState<NameData | null>(null);
  const [selectedNames, setSelectedNames] = useState<NameSelection[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [yearRange, setYearRange] = useState<[number, number]>([1880, 2025]);
  const [yearStart, setYearStart] = useState('1880');
  const [yearEnd, setYearEnd] = useState('2025');
  const [normalize, setNormalize] = useState(false);
  const [showYoY, setShowYoY] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDecades, setShowDecades] = useState(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const nameChartRef = useRef<any>(null);

  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#1a1b1e' : '#ffffff';
  const fg = isDark ? '#e8e8e8' : '#1a1a1a';
  const subtleFg = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.32)';

  const textBtn: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: subtleFg,
    padding: 0,
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
  };

  const activeTextBtn: CSSProperties = {
    ...textBtn,
    color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
    fontWeight: 600,
  };

  const toggleChip = (active: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
    border: active
      ? `1px solid ${isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)'}`
      : `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
    background: active
      ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
      : 'transparent',
    color: active
      ? (isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)')
      : subtleFg,
    fontWeight: active ? 600 : 400,
  });

  const yearInput: CSSProperties = {
    width: 52,
    border: 'none',
    borderBottom: `1px solid ${subtleFg}`,
    background: 'transparent',
    color: fg,
    fontFamily: 'inherit',
    fontSize: 12,
    textAlign: 'center',
    padding: '1px 2px',
    outline: 'none',
  };

  // Load state from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    try {
      const state = JSON.parse(decodeURIComponent(hash));
      if (state.names && Array.isArray(state.names)) {
        setSelectedNames(state.names);
      }
      window.history.replaceState(null, '', window.location.pathname);
    } catch (e) {
      console.error('Failed to parse state from URL:', e);
    }
  }, []);

  // Load data chunks
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const baseUrl = import.meta.env.BASE_URL || '/baby-name-charts/';
        const manifestResponse = await fetch(`${baseUrl}chunks/manifest.json`, { cache: 'no-cache' });
        if (!manifestResponse.ok) throw new Error(`Failed to load manifest: ${manifestResponse.status}`);
        const manifest: Manifest = await manifestResponse.json();

        const chunkPromises = manifest.chunks.map(async (chunk) => {
          const response = await fetch(`${baseUrl}chunks/${chunk.filename}`);
          if (!response.ok) {
            console.warn(`Skipping chunk ${chunk.filename}: ${response.status}`);
            return {};
          }
          return response.json();
        });

        const chunks = await Promise.all(chunkPromises);

        const mergedData: NameData = {};
        chunks.forEach((chunk) => {
          Object.entries(chunk).forEach(([name, genderData]) => {
            const gd = genderData as { M: Record<string, number>; F: Record<string, number> };
            if (!mergedData[name]) mergedData[name] = { M: {}, F: {} };
            (['M', 'F'] as const).forEach((gender) => {
              if (gd[gender]) mergedData[name][gender] = { ...mergedData[name][gender], ...gd[gender] };
            });
          });
        });

        setData(mergedData);
      } catch (error) {
        console.error('Error loading data chunks:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Total births per year across the entire dataset (for per-capita normalization)
  const birthTotals = useMemo(() => {
    if (!data) return {};
    const totals: Record<string, number> = {};
    Object.values(data).forEach(({ M, F }) => {
      Object.entries(M || {}).forEach(([year, count]) => {
        totals[year] = (totals[year] || 0) + count;
      });
      Object.entries(F || {}).forEach(([year, count]) => {
        totals[year] = (totals[year] || 0) + count;
      });
    });
    return totals;
  }, [data]);

  const handleCopyLink = async () => {
    const hash = encodeURIComponent(JSON.stringify({ names: selectedNames }));
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleClear = () => {
    setSelectedNames([]);
  };

  const handleRemoveName = (index: number) => {
    setSelectedNames(selectedNames.filter((_, i) => i !== index));
  };

  const handleYearStart = (val: string) => {
    setYearStart(val);
    const n = parseInt(val);
    if (!isNaN(n) && n >= 1880 && n <= 2025 && n <= yearRange[1]) {
      setYearRange([n, yearRange[1]]);
      nameChartRef.current?.resetZoom();
    }
  };

  const handleYearEnd = (val: string) => {
    setYearEnd(val);
    const n = parseInt(val);
    if (!isNaN(n) && n >= 1880 && n <= 2025 && n >= yearRange[0]) {
      setYearRange([yearRange[0], n]);
      nameChartRef.current?.resetZoom();
    }
  };

  // Shuffle interestingNames once at page load
  const shuffledInteresting = useMemo(() => {
    const arr = [...interestingNames];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);
  const [interestingIndex, setInterestingIndex] = useState(0);
  const handleLoadInteresting = () => {
    setSelectedNames(shuffledInteresting[interestingIndex].names);
    setInterestingIndex((interestingIndex + 1) % shuffledInteresting.length);
  };

  if (loading) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
        fontSize: 13,
        letterSpacing: '0.03em',
      }}>
        Loading 102,482 names…
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: bg, color: fg }}>
        Error loading data
      </div>
    );
  }

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: bg,
      color: fg,
      overflow: 'hidden',
    }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '20px 24px 16px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            Baby Name Trends
          </div>
          <div style={{ fontSize: 12, color: subtleFg, marginTop: 5, letterSpacing: '0.01em' }}>
            US births by name, 1880–2025 · Social Security Administration
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 3 }}>
          <button onClick={toggleColorScheme} style={textBtn} title="Toggle dark/light mode">
            {isDark ? 'light' : 'dark'}
          </button>
          {selectedNames.length > 0 && (
            <>
              <button onClick={handleCopyLink} style={textBtn}>
                {copySuccess ? 'copied!' : 'copy link'}
              </button>
              <button onClick={handleClear} style={textBtn}>
                clear
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Search + controls ───────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '16px 24px 12px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <NameSearch
          data={data}
          selectedNames={selectedNames}
          onSelectionChange={setSelectedNames}
          onRemoveName={handleRemoveName}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: subtleFg, marginRight: 4 }}>
            Years:{' '}
            <input
              type="number"
              value={yearStart}
              min={1880}
              max={2025}
              onChange={e => handleYearStart(e.target.value)}
              style={yearInput}
            />
            {' '}–{' '}
            <input
              type="number"
              value={yearEnd}
              min={1880}
              max={2025}
              onChange={e => handleYearEnd(e.target.value)}
              style={yearInput}
            />
          </span>

          {/* Chart-level modifiers */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
            paddingLeft: 8,
            borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}>
            <button
              style={toggleChip(normalize)}
              onClick={() => setNormalize(v => !v)}
              title="Normalize the y-axis to births per 100,000 people — removes population-size bias so you can compare across eras"
            >
              {normalize && <span aria-hidden>✓</span>}
              per 100K births
            </button>
          </div>

          {/* Additional views (show/hide secondary charts below) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
            paddingLeft: 8,
            borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          }}>
            <span style={{ fontSize: 11, color: subtleFg, marginRight: 3, letterSpacing: '0.03em' }}>
              show below:
            </span>
            <button
              style={toggleChip(showYoY)}
              onClick={() => setShowYoY(v => !v)}
              title="Add a year-over-year % change chart below the main chart — shows how quickly a name's popularity is rising or falling each year"
            >
              {showYoY && <span aria-hidden>✓</span>}
              YoY % change
            </button>
            <button
              style={toggleChip(showStats)}
              onClick={() => setShowStats(v => !v)}
              title="Add a statistics table below — shows peak year, peak count, total births, and recent trend for each name"
            >
              {showStats && <span aria-hidden>✓</span>}
              name stats
            </button>
            <button
              style={toggleChip(showDecades)}
              onClick={() => setShowDecades(v => !v)}
              title="Add a bar chart below that groups total births by decade — useful for seeing long-run rise and fall patterns"
            >
              {showDecades && <span aria-hidden>✓</span>}
              by decade
            </button>
          </div>

          <button
            onClick={handleLoadInteresting}
            style={{ ...textBtn, color: isDark ? 'rgba(120,160,255,0.8)' : '#2563eb', marginLeft: 'auto' }}
          >
            try an interesting name →
          </button>
        </div>
      </div>

      {/* ── Chart + Analytics ───────────────────────────────────── */}
      {(() => {
        const hasAnalytics = (showYoY || showStats || showDecades) && selectedNames.length > 0;
        return (
          <div style={{
            flex: '1 1 0',
            minHeight: 0,
            overflow: hasAnalytics ? 'auto' : 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: hasAnalytics ? 16 : 0,
          }}>
            <div style={{
              flex: hasAnalytics ? '0 0 auto' : '1 1 0',
              height: hasAnalytics ? '50vh' : undefined,
              minHeight: 180,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                padding: '4px 24px 0',
                boxSizing: 'border-box',
              }}>
                <NameChart
                  ref={nameChartRef}
                  data={data}
                  selectedNames={selectedNames}
                  yearRange={yearRange}
                  normalize={normalize}
                  birthTotals={birthTotals}
                />
              </div>
            </div>
            {showYoY && selectedNames.length > 0 && (
              <YoYChart
                data={data}
                selectedNames={selectedNames}
                yearRange={yearRange}
                normalize={normalize}
                birthTotals={birthTotals}
              />
            )}
            {showStats && selectedNames.length > 0 && (
              <NameStats
                data={data}
                selectedNames={selectedNames}
                yearRange={yearRange}
                normalize={normalize}
                birthTotals={birthTotals}
              />
            )}
            {showDecades && selectedNames.length > 0 && (
              <DecadeSummary
                data={data}
                selectedNames={selectedNames}
                yearRange={yearRange}
                normalize={normalize}
                birthTotals={birthTotals}
              />
            )}
          </div>
        );
      })()}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{
        flexShrink: 0,
        padding: '10px 24px 14px',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        fontSize: 11,
        color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)',
      }}>
        <span>by Yahel Carmon</span>
        <a
          href="https://www.ssa.gov/oact/babynames/limits.html"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          Social Security Administration data
        </a>
      </footer>
    </div>
  );
}

export default App;
