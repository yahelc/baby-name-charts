import { useState, useCallback, useMemo } from 'react';
import { Combobox, InputBase, useCombobox, Group, Text, ActionIcon } from '@mantine/core';
import type { NameData, NameSelection } from '../types';
import { useDebouncedValue } from '@mantine/hooks';

interface NameSearchProps {
  data: NameData;
  selectedNames: NameSelection[];
  onSelectionChange: (names: NameSelection[]) => void;
}

export default function NameSearch({ data, selectedNames, onSelectionChange }: NameSearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchValue, 300);
  const combobox = useCombobox();

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
      const gender = value.includes('(M)') ? 'M' : 'F';
      
      onSelectionChange([
        ...selectedNames,
        { name, gender }
      ]);
    }
    setSearchValue('');
    combobox.closeDropdown();
  }, [data, selectedNames, onSelectionChange]);

  const handleRemoveName = useCallback((index: number) => {
    onSelectionChange(selectedNames.filter((_, i) => i !== index));
  }, [selectedNames, onSelectionChange]);

  const autocompleteData = useMemo(() => {
    if (!debouncedSearch) return [];

    const searchLower = debouncedSearch.toLowerCase();
    const results: string[] = [];

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
            if (Object.keys(data[match].M).length > 0) {
              results.push(`${match} (M)`);
            }
            if (Object.keys(data[match].F).length > 0) {
              results.push(`${match} (F)`);
            }
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
      if (name.toLowerCase().includes(searchLower)) {
        if (Object.keys(genderData.M).length > 0) {
          results.push(`${name} (M)`);
        }
        if (Object.keys(genderData.F).length > 0) {
          results.push(`${name} (F)`);
        }
      }
    });

    return results.slice(0, 10);
  }, [data, debouncedSearch]);

  return (
    <div style={{ width: '100%' }}>
      <Combobox
        store={combobox}
        onOptionSubmit={handleNameSelect}
        withinPortal={false}
        styles={{
          dropdown: {
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--mantine-color-gray-3)',
            backgroundColor: 'white',
            width: '200%',
          },
          option: {
            padding: '8px 12px',
            cursor: 'pointer',
            '&[dataSelected]': {
              backgroundColor: 'var(--mantine-color-blue-1)',
              color: 'var(--mantine-color-blue-9)',
            },
            '&[dataSelected]:hover': {
              backgroundColor: 'var(--mantine-color-blue-2)',
            },
            '&:hover': {
              backgroundColor: 'var(--mantine-color-gray-0)',
            },
          },
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
            placeholder="Search for a name or use /regex/ pattern"
            size="md"
            radius="sm"
            style={{ 
              width: '100%',
              '&:focus': {
                borderColor: 'var(--mantine-color-blue-6)',
              },
            }}
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            {autocompleteData.length === 0 && searchValue.length > 1 && !(searchValue.length === 1 && searchValue === '/') ? (
              <Combobox.Empty style={{ padding: '12px', color: 'var(--mantine-color-gray-6)' }}>
                No results found
              </Combobox.Empty>
            ) : (
              autocompleteData.map((item) => (
                <Combobox.Option value={item} key={item}>
                  {item}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

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