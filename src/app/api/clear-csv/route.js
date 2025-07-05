import { 
  STORAGE_BUCKETS, 
  updateFileInStorage, 
  fileExistsInStorage 
} from '../../../utils/supabase.js';
import { checkAuthHeader } from '../../../utils/auth';

export async function POST(request) {
  try {
    // Remove authentication check for now
    // if (!checkAuthHeader(request)) {
    //   return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const csvFile = 'training_data.csv';
    
    // Clear the file by uploading empty content
    const clearResult = await updateFileInStorage(STORAGE_BUCKETS.CSV_DATA, csvFile, '');
    
    if (!clearResult.success) {
      throw new Error(`Failed to clear CSV file in Supabase: ${clearResult.error}`);
    }
    
    return Response.json({ 
      success: true, 
      message: 'CSV file cleared successfully in Supabase storage',
      storage: 'supabase'
    });
  } catch (error) {
    console.error('Error clearing CSV file from Supabase:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to clear CSV file from Supabase storage',
      storage: 'supabase'
    }, { status: 500 });
  }
} 