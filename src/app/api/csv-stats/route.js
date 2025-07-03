import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { checkAuthHeader } from '../../../utils/auth';

export async function GET(request) {
  try {
    // Check authentication
    if (!checkAuthHeader(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const csvFile = join(process.cwd(), 'public', 'saved-texts', 'training_data.csv');
    
    if (!existsSync(csvFile)) {
      return Response.json({
        exists: false,
        totalEntries: 0,
        labelCounts: {},
        fileSize: 0,
        sampleEntries: [],
        message: 'CSV file does not exist yet'
      });
    }

    // Get file stats
    const stats = statSync(csvFile);
    const fileSize = stats.size;

    // Read and parse CSV content
    const content = readFileSync(csvFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    // Parse entries and count labels
    const entries = [];
    const labelCounts = {};
    
    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const text = parts[0].trim();
        const label = parts[1].trim();
        
        if (text && label) {
          entries.push({ text, label });
          labelCounts[label] = (labelCounts[label] || 0) + 1;
        }
      }
    });

    // Get sample entries (first 5)
    const sampleEntries = entries.slice(0, 5);

    console.log(`CSV Stats: ${entries.length} total entries, ${Object.keys(labelCounts).length} unique labels`);

    return Response.json({
      exists: true,
      totalEntries: entries.length,
      labelCounts: labelCounts,
      fileSize: fileSize,
      sampleEntries: sampleEntries,
      uniqueLabels: Object.keys(labelCounts).length,
      lastModified: stats.mtime.toISOString()
    });

  } catch (error) {
    console.error('Error analyzing CSV file:', error);
    return Response.json(
      { 
        error: 'Failed to analyze CSV file',
        exists: false,
        totalEntries: 0,
        labelCounts: {},
        fileSize: 0,
        sampleEntries: []
      }, 
      { status: 500 }
    );
  }
} 