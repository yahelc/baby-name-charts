import { Button, Group, useMantineColorScheme, Text, Stack } from '@mantine/core';
import { useState, useEffect, useRef, useMemo } from 'react';
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

  // Load state from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the # symbol
    if (!hash) return;

    try {
      const state = JSON.parse(decodeURIComponent(hash));
      if (state.names && Array.isArray(state.names)) {
        setSelectedNames(state.names);
      }
      // Clear the hash after loading
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
        // First load the manifest
        const manifestResponse = await fetch(`${baseUrl}chunks/manifest.json`);
        if (!manifestResponse.ok) {
          throw new Error(`Failed to load manifest: ${manifestResponse.status}`);
        }
        const manifest: Manifest = await manifestResponse.json();
        
        // Load all chunks in parallel
        const chunkPromises = manifest.chunks.map(async (chunk) => {
          const response = await fetch(`${baseUrl}chunks/${chunk.filename}`);
          if (!response.ok) {
            throw new Error(`Failed to load chunk ${chunk.filename}: ${response.status}`);
          }
          return response.json();
        });
        
        const chunks = await Promise.all(chunkPromises);
        
        // Merge all chunks into one dataset
        const mergedData: NameData = {};
        chunks.forEach((chunk) => {
          Object.entries(chunk).forEach(([name, genderData]) => {
            const genderDataTyped = genderData as { M: Record<string, number>; F: Record<string, number> };
            if (!mergedData[name]) {
              mergedData[name] = { M: {}, F: {} };
            }
            (['M', 'F'] as const).forEach((gender) => {
              if (genderDataTyped[gender]) {
                mergedData[name][gender] = {
                  ...mergedData[name][gender],
                  ...genderDataTyped[gender]
                };
              }
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
    const state = {
      names: selectedNames
    };
    const hash = encodeURIComponent(JSON.stringify(state));
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleClear = () => {
    if (nameChartRef.current) {
      nameChartRef.current.clearTooltip();
    }
    setSelectedNames([]);
  };

  const handleRemoveName = (index: number) => {
    if (nameChartRef.current) {
      nameChartRef.current.clearTooltip();
    }
    setSelectedNames(selectedNames.filter((_, i) => i !== index));
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
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colorScheme === 'dark' ? '#1a1b1e' : '#fff',
        color: colorScheme === 'dark' ? '#fff' : '#1a1b1e',
      }}>
        <Stack align="center" gap="xl">
          <Text
            size="xl"
            fw={700}
            style={{
              animation: 'bounce 1s infinite',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            Loading
            <Text
              component="span"
              size="xl"
              fw={700}
              style={{
                animation: 'pulse 2s infinite',
              }}
            >
              102,482
            </Text>
            baby names...
          </Text>
          <Text
            size="lg"
            c="dimmed"
            fs="italic"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            Counting all the{' '}
            <span style={{ animation: 'bounce1 1.2s infinite' }}>👶</span>
            <span style={{ animation: 'bounce2 1.4s infinite' }}>👶🏻</span>
            <span style={{ animation: 'bounce3 1.6s infinite' }}>👶🏼</span>
            <span style={{ animation: 'bounce4 1.8s infinite' }}>👶🏽</span>
            <span style={{ animation: 'bounce5 2.0s infinite' }}>👶🏾</span>
            <span style={{ animation: 'bounce6 2.2s infinite' }}>👶🏿</span>
            ...
          </Text>
        </Stack>
        <style>
          {`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.2); }
            }
            @keyframes bounce1 {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            @keyframes bounce2 {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes bounce3 {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-12px); }
            }
            @keyframes bounce4 {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes bounce5 {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            @keyframes bounce6 {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-12px); }
            }
          `}
        </style>
      </div>
    );
  }

  if (!data) {
    return <div>Error loading data</div>;
  }

  return (
    <div
      style={{
        padding: '10px',
        width: '100vw',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: colorScheme === 'dark' ? '#1a1b1e' : '#fff',
        color: colorScheme === 'dark' ? '#fff' : '#1a1b1e',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ 
        width: '100%',
        maxWidth: '1200px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <Group justify="space-between" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>Baby Name Trends</h1>
          <Group gap="xs" style={{ flexWrap: 'wrap' }}>
            <Button 
              variant="outline" 
              color={copySuccess ? "green" : "gray"}
              onClick={handleCopyLink}
              disabled={selectedNames.length === 0}
              size="sm"
            >
              {copySuccess ? "Copied!" : "Copy Link"}
            </Button>
            <Button 
              variant="outline" 
              color="gray" 
              onClick={handleClear}
              disabled={selectedNames.length === 0}
              size="sm"
            >
              Clear Selection
            </Button>
          </Group>
        </Group>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <NameSearch 
              data={data} 
              selectedNames={selectedNames}
              onSelectionChange={setSelectedNames}
              onRemoveName={handleRemoveName}
            />
          </div>
        </div>
        <div style={{ 
          width: '100%',
          height: '50vh',
          minHeight: '300px',
          maxHeight: '600px'
        }}>
          <NameChart
            ref={nameChartRef}
            data={data}
            selectedNames={selectedNames}
            yearRange={[1880, 2022]}
          />
        </div>
        {/* Footer */}
        <footer style={{
          width: '100%',
          marginTop: 300,
          padding: '24px 0 8px 0',
          textAlign: 'center',
          borderTop: '1px solid #eee',
          color: '#888',
          fontSize: 15,
        }}>
          <div style={{ marginBottom: 8 }}>
            <a
              href="#"
              style={{ color: '#228be6', textDecoration: 'underline', cursor: 'pointer', fontSize: 16 }}
              onClick={e => { e.preventDefault(); handleLoadInteresting(); }}
            >
              Load an interesting name
            </a>
          </div>
          <div style={{ fontSize: 14, color: '#aaa' }}>
            by Yahel Carmon | Data courtesy of the <a href="https://www.ssa.gov/oact/babynames/limits.html" target="blank"></a>Social Security Administration</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
