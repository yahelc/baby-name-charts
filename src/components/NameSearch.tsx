import { useState, useMemo, useCallback } from 'react';
import { Combobox, InputBase, useCombobox, Group, Button, Text } from '@mantine/core';
import type { NameData, NameSelection } from '../types';

interface NameSearchProps {
  data: NameData;
  selectedNames: NameSelection[];
  onSelectionChange: (names: NameSelection[]) => void;
}

const MAX_RESULTS = 50; // Limit the number of results to prevent performance issues

export default function NameSearch({ data, selectedNames, onSelectionChange }: NameSearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const combobox = useCombobox();

  // Create a cache of just the names and their gender availability
  const nameCache = useMemo(() => {
    const cache: { [key: string]: { hasM: boolean; hasF: boolean } } = {};
    Object.entries(data).forEach(([name, genders]) => {
      cache[name] = {
        hasM: !!genders.M,
        hasF: !!genders.F
      };
    });
    return cache;
  }, [data]);

  // Debounce the search value
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300); // Wait 300ms after the last keystroke

    return () => clearTimeout(timer);
  }, [searchValue]);

  const suggestions = useMemo(() => {
    if (!debouncedSearchValue) return [];
    
    setIsSearching(true);
    const searchLower = debouncedSearchValue.toLowerCase();
    
    // Use a more efficient search algorithm
    const matches: string[] = [];
    let count = 0;
    
    // First try exact matches
    for (const [name, { hasM, hasF }] of Object.entries(nameCache)) {
      if (count >= MAX_RESULTS) break;
      
      if (name.toLowerCase().startsWith(searchLower)) {
        if (hasM) {
          matches.push(`${name} (M)`);
          count++;
        }
        if (hasF) {
          matches.push(`${name} (F)`);
          count++;
        }
        if ((hasM || hasF) && count < MAX_RESULTS) {
          matches.push(`${name} (All)`);
          count++;
        }
      }
    }
    
    setIsSearching(false);
    return matches;
  }, [nameCache, debouncedSearchValue]);

  const handleSelect = (value: string) => {
    const [name, gender] = value.split(' (');
    const cleanGender = gender.replace(')', '') as 'M' | 'F' | 'All';
    
    if (!selectedNames.some(n => n.name === name && n.gender === cleanGender)) {
      onSelectionChange([...selectedNames, { name, gender: cleanGender }]);
    }
    setSearchValue('');
    setDebouncedSearchValue('');
    combobox.closeDropdown();
  };

  const handleRemove = (name: string, gender: 'M' | 'F' | 'All') => {
    onSelectionChange(selectedNames.filter(n => !(n.name === name && n.gender === gender)));
  };

  return (
    <div>
      <Combobox
        store={combobox}
        onOptionSubmit={handleSelect}
        withinPortal={false}
        styles={{
          dropdown: {
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e9ecef',
            backgroundColor: 'white',
            maxHeight: '300px',
            overflowY: 'auto'
          },
          option: {
            padding: '8px 12px',
            cursor: 'pointer'
          }
        }}
        classNames={{
          option: 'combobox-option'
        }}
      >
        <Combobox.Target>
          <InputBase
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.currentTarget.value);
              combobox.openDropdown();
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
            placeholder="Search for a name..."
            style={{ marginBottom: '1rem' }}
            styles={{
              input: {
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                padding: '8px 12px',
                fontSize: '14px'
              }
            }}
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            {isSearching ? (
              <Combobox.Empty style={{ padding: '12px', color: '#868e96', textAlign: 'center' }}>
                Searching...
              </Combobox.Empty>
            ) : suggestions.length === 0 ? (
              <Combobox.Empty style={{ padding: '12px', color: '#868e96', textAlign: 'center' }}>
                {searchValue ? 'No results found' : 'Start typing to search...'}
              </Combobox.Empty>
            ) : (
              <>
                {suggestions.map((item) => (
                  <Combobox.Option value={item} key={item}>
                    {item}
                  </Combobox.Option>
                ))}
                {suggestions.length >= MAX_RESULTS && (
                  <Text size="xs" c="dimmed" style={{ padding: '8px 12px', textAlign: 'center' }}>
                    Showing first {MAX_RESULTS} results...
                  </Text>
                )}
              </>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      <Group gap="xs" style={{ flexWrap: 'wrap' }}>
        {selectedNames.map(({ name, gender }) => (
          <div
            key={`${name}-${gender}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '6px',
              padding: '4px 8px',
              gap: '4px'
            }}
          >
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => handleRemove(name, gender)}
              style={{
                padding: '0 4px',
                minWidth: 'unset',
                height: 'unset',
                fontSize: '12px',
                color: '#868e96'
              }}
            >
              ✖
            </Button>
            <span style={{ fontSize: '14px', color: '#495057' }}>{name} ({gender})</span>
          </div>
        ))}
      </Group>
    </div>
  );
} 