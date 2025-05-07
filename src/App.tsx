import { MantineProvider, Button, Group, Text } from '@mantine/core';
import { useState, useEffect } from 'react';
import type { NameData, NameSelection } from './types';
import NameSearch from './components/NameSearch';
import NameChart from './components/NameChart';
import YearRangeSlider from './components/YearRangeSlider';

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
  const [yearRange, setYearRange] = useState<[number, number]>([1880, 2022]);
  const [availableYearRange, setAvailableYearRange] = useState<[number, number]>([1880, 2022]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load state from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the # symbol
    if (!hash) return;

    try {
      const state = JSON.parse(decodeURIComponent(hash));
      if (state.names && Array.isArray(state.names)) {
        setSelectedNames(state.names);
      }
      if (state.yearRange && Array.isArray(state.yearRange) && state.yearRange.length === 2) {
        setYearRange(state.yearRange);
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
            if (!mergedData[name]) {
              mergedData[name] = { M: {}, F: {} };
            }
            ['M', 'F'].forEach((gender) => {
              if (genderData[gender]) {
                mergedData[name][gender] = {
                  ...mergedData[name][gender],
                  ...genderData[gender]
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
      names: selectedNames,
      yearRange: yearRange
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

  // Update available year range when names are selected
  useEffect(() => {
    if (!data || selectedNames.length === 0) {
      setAvailableYearRange([1880, 2022]);
      return;
    }

    let minYear = 2022;
    let maxYear = 1880;

    selectedNames.forEach(({ name, gender }) => {
      if (gender === 'All' || gender === 'M') {
        const years = Object.keys(data[name]?.M || {});
        if (years.length > 0) {
          minYear = Math.min(minYear, ...years.map(Number));
          maxYear = Math.max(maxYear, ...years.map(Number));
        }
      }
      if (gender === 'All' || gender === 'F') {
        const years = Object.keys(data[name]?.F || {});
        if (years.length > 0) {
          minYear = Math.min(minYear, ...years.map(Number));
          maxYear = Math.max(maxYear, ...years.map(Number));
        }
      }
    });

    setAvailableYearRange([minYear, maxYear]);
    
    // If current year range is outside available range, adjust it
    if (yearRange[0] < minYear || yearRange[1] > maxYear) {
      setYearRange([minYear, maxYear]);
    }
  }, [selectedNames, data]);

  const handleClear = () => {
    setSelectedNames([]);
    setYearRange([1880, 2022]);
  };

  const handleYearRangeChange = (newRange: [number, number]) => {
    setYearRange(newRange);
  };

  if (loading) {
    return <div>Loading data chunks...</div>;
  }

  if (!data) {
    return <div>Error loading data</div>;
  }

  return (
    <MantineProvider
      theme={{
        defaultRadius: 'sm',
        primaryColor: 'blue',
        components: {
          Button: {
            defaultProps: {
              variant: 'light',
            },
          },
        },
      }}
    >
      <div style={{ 
        padding: '10px',
        width: '100vw',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
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
          <div>
            <NameSearch 
              data={data} 
              selectedNames={selectedNames}
              onSelectionChange={setSelectedNames}
            />
          </div>
          <div>
            <YearRangeSlider
              value={yearRange}
              onChange={handleYearRangeChange}
            />
            {selectedNames.length > 0 && (
              <Text size="xs" c="dimmed" style={{ marginTop: '0.25rem' }}>
                Available data range: {availableYearRange[0]} - {availableYearRange[1]}
              </Text>
            )}
          </div>
          <div style={{ 
            width: '100%',
            height: '50vh',
            minHeight: '300px',
            maxHeight: '600px'
          }}>
            <NameChart
              data={data}
              selectedNames={selectedNames}
              yearRange={yearRange}
            />
          </div>
        </div>
      </div>
    </MantineProvider>
  );
}

export default App;
