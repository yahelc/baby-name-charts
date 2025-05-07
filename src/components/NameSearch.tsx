import { useState, useMemo } from 'react';
import { Combobox, InputBase, useCombobox, Group, Chip } from '@mantine/core';
import type { NameData, NameSelection } from '../types';

interface NameSearchProps {
  data: NameData;
  selectedNames: NameSelection[];
  onSelectionChange: (names: NameSelection[]) => void;
}

export default function NameSearch({ data, selectedNames, onSelectionChange }: NameSearchProps) {
  const [searchValue, setSearchValue] = useState('');
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

  const suggestions = useMemo(() => {
    if (!searchValue) return [];
    
    const searchLower = searchValue.toLowerCase();
    const matches = Object.entries(nameCache)
      .filter(([name]) => name.toLowerCase().startsWith(searchLower))
      .flatMap(([name, { hasM, hasF }]) => {
        const options: string[] = [];
        if (hasM) options.push(`${name} (M)`);
        if (hasF) options.push(`${name} (F)`);
        if (hasM || hasF) options.push(`${name} (All)`);
        return options;
      });
    
    return matches;
  }, [nameCache, searchValue]);

  const handleSelect = (value: string) => {
    const [name, gender] = value.split(' (');
    const cleanGender = gender.replace(')', '') as 'M' | 'F' | 'All';
    
    if (!selectedNames.some(n => n.name === name && n.gender === cleanGender)) {
      onSelectionChange([...selectedNames, { name, gender: cleanGender }]);
    }
    setSearchValue('');
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
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            {suggestions.length === 0 ? (
              <Combobox.Empty>No results found</Combobox.Empty>
            ) : (
              suggestions.map((item) => (
                <Combobox.Option value={item} key={item}>
                  {item}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      <Group>
        {selectedNames.map(({ name, gender }) => (
          <Chip
            key={`${name}-${gender}`}
            variant="filled"
            onClick={() => handleRemove(name, gender)}
            styles={{
              root: {
                backgroundColor: 'transparent',
                border: '1px solid #ccc',
                '&:hover': {
                  backgroundColor: '#f0f0f0',
                },
              },
              label: {
                padding: '4px 8px',
              },
            }}
          >
            {name} ({gender})
          </Chip>
        ))}
      </Group>
    </div>
  );
} 