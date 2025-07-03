import { 
  STORAGE_BUCKETS, 
  downloadFromStorage, 
  fileExistsInStorage 
} from '../../../utils/supabase.js';
import { checkAuthHeader } from '../../../utils/auth.js';

export async function GET(request) {
  try {
    // Check authentication
    if (!checkAuthHeader(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const csvFile = 'training_data.csv';
    
    // Check if file exists in Supabase storage
    const fileExists = await fileExistsInStorage(STORAGE_BUCKETS.CSV_DATA, csvFile);
    
    if (!fileExists) {
      return Response.json(
        { error: 'CSV file not found in storage' }, 
        { status: 404 }
      );
    }

    // Download file content from Supabase
    const downloadResult = await downloadFromStorage(STORAGE_BUCKETS.CSV_DATA, csvFile);
    
    if (!downloadResult.success) {
      console.error('Failed to download CSV from Supabase:', downloadResult.error);
      return Response.json(
        { error: 'Failed to download CSV file from storage' }, 
        { status: 500 }
      );
    }

    const csvContent = downloadResult.data;
    
    // Return the CSV content with appropriate headers
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="training_data.csv"',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Error downloading CSV file:', error);
    return Response.json(
      { error: 'Failed to download CSV file' }, 
      { status: 500 }
    );
  }
} 