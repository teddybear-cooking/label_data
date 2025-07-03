import { 
  STORAGE_BUCKETS, 
  downloadFromStorage, 
  fileExistsInStorage 
} from '../../../utils/supabase.js';

export async function GET() {
  try {
    const filename = 'training_data.csv';
    
    const fileExists = await fileExistsInStorage(STORAGE_BUCKETS.CSV_DATA, filename);
    
    if (!fileExists) {
      return Response.json({
        exists: false,
        message: 'CSV file does not exist yet in Supabase storage',
        storage: 'supabase',
        bucket: STORAGE_BUCKETS.CSV_DATA
      });
    }
    
    const downloadResult = await downloadFromStorage(STORAGE_BUCKETS.CSV_DATA, filename);
    
    if (!downloadResult.success) {
      throw new Error(`Failed to download CSV file: ${downloadResult.error}`);
    }
    
    const content = downloadResult.data;
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    return Response.json({
      exists: true,
      filename: filename,
      storage: 'supabase',
      bucket: STORAGE_BUCKETS.CSV_DATA,
      totalEntries: lines.length,
      fileSize: content.length,
      lastEntries: lines.slice(-5), // Show last 5 entries
      firstEntries: lines.slice(0, 3) // Show first 3 entries
    });
    
  } catch (error) {
    console.error('Error checking CSV from Supabase:', error);
    return Response.json(
      { error: 'Failed to check CSV file from Supabase storage' }, 
      { status: 500 }
    );
  }
} 