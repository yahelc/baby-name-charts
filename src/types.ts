export interface NameData {
  [name: string]: {
    M: { [year: string]: number };
    F: { [year: string]: number };
  };
}

export interface NameSelection {
  name: string;
  gender: 'M' | 'F' | 'All';
  isRegex?: boolean;
  matches?: string[];
}

export interface ChartData {
  x: string[];
  y: number[];
  name: string;
  type: 'scatter';
  mode: 'lines+markers';
} 