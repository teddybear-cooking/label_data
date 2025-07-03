import { 
  STORAGE_BUCKETS, 
  downloadFromStorage, 
  fileExistsInStorage, 
  getFileInfo 
} from '../../../utils/supabase.js';
import { checkAuthHeader } from '../../../utils/auth';

export async function GET(request) {
  try {
    // Check authentication
    if (!checkAuthHeader(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const csvFile = 'training_data.csv';
    
    const fileExists = await fileExistsInStorage(STORAGE_BUCKETS.CSV_DATA, csvFile);
    
    if (!fileExists) {
      return Response.json({
        exists: false,
        totalEntries: 0,
        labelCounts: {},
        fileSize: 0,
        sampleEntries: [],
        message: 'CSV file does not exist yet in Supabase storage',
        storage: 'supabase'
      });
    }

    // Get file info from Supabase
    const fileInfoResult = await getFileInfo(STORAGE_BUCKETS.CSV_DATA, csvFile);
    let fileSize = 0;
    let lastModified = null;
    
    if (fileInfoResult.success) {
      fileSize = fileInfoResult.data.metadata?.size || 0;
      lastModified = fileInfoResult.data.updated_at;
    }

    // Download and parse CSV content
    const downloadResult = await downloadFromStorage(STORAGE_BUCKETS.CSV_DATA, csvFile);
    
    if (!downloadResult.success) {
      throw new Error(`Failed to download CSV file: ${downloadResult.error}`);
    }
    
    const content = downloadResult.data;
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
      lastModified: lastModified || new Date().toISOString(),
      storage: 'supabase'
    });

  } catch (error) {
    console.error('Error analyzing CSV file from Supabase:', error);
    return Response.json(
      { 
        error: 'Failed to analyze CSV file from Supabase storage',
        exists: false,
        totalEntries: 0,
        labelCounts: {},
        fileSize: 0,
        sampleEntries: [],
        storage: 'supabase'
      }, 
      { status: 500 }
    );
  }
} 