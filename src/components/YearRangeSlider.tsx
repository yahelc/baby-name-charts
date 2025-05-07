import { Group, NumberInput, Text } from '@mantine/core';

interface YearRangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export default function YearRangeSlider({ value, onChange }: YearRangeSliderProps) {
  const handleStartYearChange = (newStart: string | number) => {
    if (typeof newStart === 'number') {
      onChange([newStart, value[1]]);
    }
  };

  const handleEndYearChange = (newEnd: string | number) => {
    if (typeof newEnd === 'number') {
      onChange([value[0], newEnd]);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <Group gap="xs" align="flex-end" style={{ flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
          <Text size="xs" fw={500} style={{ marginBottom: '0.25rem' }}>
            Start Year
          </Text>
          <NumberInput
            value={value[0]}
            onChange={handleStartYearChange}
            min={1880}
            max={value[1]}
            step={1}
            size="sm"
            hideControls
            styles={{
              input: {
                width: '100%',
              },
            }}
          />
        </div>
        <Text size="sm" style={{ marginBottom: '0.25rem' }}>to</Text>
        <div style={{ flex: '1 1 120px', minWidth: '120px' }}>
          <Text size="xs" fw={500} style={{ marginBottom: '0.25rem' }}>
            End Year
          </Text>
          <NumberInput
            value={value[1]}
            onChange={handleEndYearChange}
            min={value[0]}
            max={2022}
            step={1}
            size="sm"
            hideControls
            styles={{
              input: {
                width: '100%',
              },
            }}
          />
        </div>
      </Group>
    </div>
  );
} 