import { useMantineColorScheme } from '@mantine/core';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { NameData, NameSelection } from './types';
import NameSearch from './components/NameSearch';
import NameChart from './components/NameChart';
import interestingNames from './interestingNames';

interface ChunkInfo {
  filename: string;
  startYear: number;
  endYear: number;
}

interface Manifest {
  chunks: ChunkInfo[];
}

function App() {
  const [data, setData] = useState<NameData | null>(null);
  const [selectedNames, setSelectedNames] = useState<NameSelection[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const { colorScheme } = useMantineColorScheme();
  const nameChartRef = useRef<any>(null);

  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#1a1b1e' : '#ffffff';
  const fg = isDark ? '#e8e8e8' : '#1a1a1a';

  const textBtn: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.32)',
    padding: 0,
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
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
        const manifestResponse = await fetch(`${baseUrl}chunks/manifest.json`);
        if (!manifestResponse.ok) throw new Error(`Failed to load manifest: ${manifestResponse.status}`);
        const manifest: Manifest = await manifestResponse.json();

        const chunkPromises = manifest.chunks.map(async (chunk) => {
          const response = await fetch(`${baseUrl}chunks/${chunk.filename}`);
          if (!response.ok) throw new Error(`Failed to load chunk ${chunk.filename}: ${response.status}`);
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
    nameChartRef.current?.clearTooltip();
    setSelectedNames([]);
  };

  const handleRemoveName = (index: number) => {
    nameChartRef.current?.clearTooltip();
    setSelectedNames(selectedNames.filter((_, i) => i !== index));
  };

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
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '14px 20px 8px',
        gap: 14,
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          opacity: 0.5,
        }}>
          Baby Name Trends
        </span>
        <span style={{ flex: 1 }} />
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

      {/* ── Search ──────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '0 20px 6px' }}>
        <NameSearch
          data={data}
          selectedNames={selectedNames}
          onSelectionChange={setSelectedNames}
          onRemoveName={handleRemoveName}
        />
        {selectedNames.length === 0 && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={handleLoadInteresting}
              style={{ ...textBtn, color: '#228be6', fontSize: 12 }}
            >
              Try an interesting name →
            </button>
          </div>
        )}
      </div>

      {/* ── Chart ───────────────────────────────────────────────── */}
      <div style={{ flex: '1 1 0', minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: '4px 20px 0',
          boxSizing: 'border-box',
        }}>
          <NameChart
            ref={nameChartRef}
            data={data}
            selectedNames={selectedNames}
            yearRange={[1880, 2022]}
          />
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{
        flexShrink: 0,
        padding: '6px 20px 10px',
        fontSize: 11,
        color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)',
      }}>
        by Yahel Carmon · data:{' '}
        <a
          href="https://www.ssa.gov/oact/babynames/limits.html"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          SSA
        </a>
      </footer>
    </div>
  );
}

export default App;
