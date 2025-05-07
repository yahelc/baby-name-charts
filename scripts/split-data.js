import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the original data file
const data = JSON.parse(readFileSync(join(__dirname, '../public/data.json'), 'utf8'));

// Create chunks directory if it doesn't exist
const chunksDir = join(__dirname, '../public/chunks');
if (!existsSync(chunksDir)) {
    mkdirSync(chunksDir, { recursive: true });
}

// Create a manifest file that will contain metadata about our chunks
const manifest = {
    chunks: []
};

// Split data into chunks by year ranges (e.g., 1880-1900, 1901-1920, etc.)
const yearRanges = [
    [1880, 1900],
    [1901, 1920],
    [1921, 1940],
    [1941, 1960],
    [1961, 1980],
    [1981, 2000],
    [2001, 2022]
];

yearRanges.forEach(([startYear, endYear]) => {
    const chunk = {};
    
    // For each name in the data
    Object.entries(data).forEach(([name, genderData]) => {
        chunk[name] = {
            M: {},
            F: {}
        };
        
        // For each gender
        ['M', 'F'].forEach(gender => {
            if (genderData[gender]) {
                // Only include years within this chunk's range
                Object.entries(genderData[gender]).forEach(([year, count]) => {
                    const yearNum = parseInt(year);
                    if (yearNum >= startYear && yearNum <= endYear) {
                        chunk[name][gender][year] = count;
                    }
                });
            }
        });
        
        // Remove name if it has no data in this chunk
        if (Object.keys(chunk[name].M).length === 0 && Object.keys(chunk[name].F).length === 0) {
            delete chunk[name];
        }
    });
    
    // Save this chunk
    const filename = `chunk-${startYear}-${endYear}.json`;
    writeFileSync(
        join(chunksDir, filename),
        JSON.stringify(chunk)
    );
    
    // Add to manifest
    manifest.chunks.push({
        filename,
        startYear,
        endYear
    });
});

// Save manifest
writeFileSync(
    join(chunksDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
); 