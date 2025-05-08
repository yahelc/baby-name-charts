import { useState, useCallback, useMemo } from 'react';
import { TextInput, Group, Text, ActionIcon, Paper, Box, useMantineColorScheme } from '@mantine/core';
import type { NameData, NameSelection } from '../types';
import { useDebouncedValue } from '@mantine/hooks';

interface NameSearchProps {
  data: NameData;
  selectedNames: NameSelection[];
  onSelectionChange: (names: NameSelection[]) => void;
  onRemoveName?: (index: number) => void;
}

export default function NameSearch({ data, selectedNames, onSelectionChange, onRemoveName }: NameSearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchValue, 300);

  const { colorScheme } = useMantineColorScheme();

  const handleNameSelect = useCallback((value: string) => {
    if (!value) return;

    // Check if this is a regex pattern
    if (value.startsWith('/')) {
      const pattern = value.endsWith('/') ? value.slice(1, -1) : value.slice(1);
      try {
        const regex = new RegExp(pattern, 'i');
        const matches = Object.keys(data).filter(name => regex.test(name));
        
        if (matches.length > 0) {
          onSelectionChange([
            ...selectedNames,
            {
              name: value,
              gender: 'All',
              isRegex: true,
              matches
            }
          ]);
        }
      } catch (e) {
        console.error('Invalid regex pattern:', e);
      }
    } else {
      // Regular name selection
      const name = value.split(' (')[0];
      let gender: 'M' | 'F' | 'All' = 'M';
      if (value.includes('(All)')) {
        gender = 'All';
      } else if (value.includes('(F)')) {
        gender = 'F';
      } else if (value.includes('(M)')) {
        gender = 'M';
      }
      onSelectionChange([
        ...selectedNames,
        { name, gender }
      ]);
    }
    setSearchValue('');
  }, [data, selectedNames, onSelectionChange]);

  const handleRemoveName = useCallback((index: number) => {
    if (onRemoveName) {
      onRemoveName(index);
    } else {
      onSelectionChange(selectedNames.filter((_, i) => i !== index));
    }
  }, [selectedNames, onSelectionChange, onRemoveName]);

  const searchData = useMemo(() => {
    if (!debouncedSearch) return [];

    const searchLower = debouncedSearch.toLowerCase();
    const results: string[] = [];
    let exactMatches: string[] = [];

    // If the search starts with /, treat it as a regex pattern
    if (debouncedSearch.startsWith('/')) {
      try {
        // If the pattern isn't complete (no closing /), use what we have so far
        const pattern = debouncedSearch.endsWith('/') 
          ? debouncedSearch.slice(1, -1)
          : debouncedSearch.slice(1);
        const regex = new RegExp(pattern, 'i');
        const matches = Object.keys(data)
          .filter(name => regex.test(name))
          .slice(0, 10);
        
        if (matches.length > 0) {
          // Show the regex pattern as a single option
          results.push(debouncedSearch);
          // Show the matches as individual options
          matches.forEach(match => {
            const hasM = Object.keys(data[match].M).length > 0;
            const hasF = Object.keys(data[match].F).length > 0;
            if (hasM) results.push(`${match} (M)`);
            if (hasF) results.push(`${match} (F)`);
            if (hasM && hasF) results.push(`${match} (All)`);
          });
        }
      } catch (e) {
        // If the regex is invalid, just show the pattern
        results.push(debouncedSearch);
      }
      return results;
    }

    // Regular name search
    Object.entries(data).forEach(([name, genderData]) => {
      const hasM = Object.keys(genderData.M).length > 0;
      const hasF = Object.keys(genderData.F).length > 0;
      if (name.toLowerCase() === searchLower) {
        if (hasM) exactMatches.push(`${name} (M)`);
        if (hasF) exactMatches.push(`${name} (F)`);
        if (hasM && hasF) exactMatches.push(`${name} (All)`);
      } else if (name.toLowerCase().startsWith(searchLower)) {
        if (hasM) results.push(`${name} (M)`);
        if (hasF) results.push(`${name} (F)`);
        if (hasM && hasF) results.push(`${name} (All)`);
      }
    });

    // Place all exact matches at the top
    if (exactMatches.length > 0) {
      results.unshift(...exactMatches);
    }

    return results;
  }, [data, debouncedSearch]);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <TextInput
        value={searchValue}
        onChange={(event) => setSearchValue(event.currentTarget.value)}
        placeholder="Search for a name or use /regex/ pattern"
        size="md"
        radius="sm"
        styles={{
          input: {
            width: '100%',
            minWidth: '100%',
          },
          root: {
            width: '100%',
          },
        }}
      />
      {(searchValue || searchData.length > 0) && (
        <Paper
          shadow="sm"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid var(--mantine-color-gray-3)',
            borderRadius: '4px',
            backgroundColor: colorScheme === 'dark' ? '#1a1b1e' : '#fff',
            width: '100%',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          {searchData.length === 0 && searchValue.length > 1 && !(searchValue.length === 1 && searchValue === '/') ? (
            <Box p="xs" c="dimmed" style={{ backgroundColor: colorScheme === 'dark' ? '#1a1b1e' : '#fff' }}>
              No results found
            </Box>
          ) : (
            searchData.map((item) => (
              <Box
                key={item}
                p="xs"
                style={{
                  cursor: 'pointer',
                  color: 'var(--mantine-color-text)',
                  backgroundColor: colorScheme === 'dark' ? '#1a1b1e' : '#fff',
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-default-hover)',
                  },
                }}
                onClick={() => handleNameSelect(item)}
              >
                {item}
              </Box>
            ))
          )}
        </Paper>
      )}
      <Group gap="xs" mt="xs" style={{ flexWrap: 'wrap' }}>
        {selectedNames.map((selection, index) => (
          <div
            key={`${selection.name}-${selection.gender}-${index}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'var(--mantine-color-blue-0)',
              border: '1px solid var(--mantine-color-blue-3)',
              borderRadius: '4px',
              padding: '4px 8px',
              gap: '4px',
              color: 'var(--mantine-color-blue-9)',
            }}
          >
            <ActionIcon
              variant="subtle"
              color="blue"
              size="xs"
              onClick={() => handleRemoveName(index)}
              style={{
                marginRight: '-4px',
                marginLeft: '-4px',
              }}
            >
              ✖
            </ActionIcon>
            <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
              {selection.isRegex ? selection.name : `${selection.name} (${selection.gender})`}
            </Text>
          </div>
        ))}
      </Group>
    </div>
  );
} 