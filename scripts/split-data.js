import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Create chunks directory if it doesn't exist
const chunksDir = join(__dirname, '../public/chunks');
mkdirSync(chunksDir, { recursive: true });

// Read all chunk files
const chunkFiles = [
  'chunk-1880-1900.json',
  'chunk-1901-1920.json',
  'chunk-1921-1940.json',
  'chunk-1941-1960.json',
  'chunk-1961-1980.json',
  'chunk-1981-2000.json',
  'chunk-2001-2022.json'
];

// Combine all chunks
const combinedData = {};
chunkFiles.forEach(chunkFile => {
  const chunkData = JSON.parse(readFileSync(join(chunksDir, chunkFile), 'utf8'));
  Object.assign(combinedData, chunkData);
});

// Write manifest
const manifest = {
  chunks: chunkFiles.map(file => ({
    file,
    years: file.match(/\d{4}-\d{4}/)[0].split('-').map(Number)
  }))
};

writeFileSync(join(chunksDir, 'manifest.json'), JSON.stringify(manifest, null, 2)); 