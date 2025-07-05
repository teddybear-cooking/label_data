import { 
  STORAGE_BUCKETS, 
  downloadFromStorage, 
  fileExistsInStorage 
} from '../../../utils/supabase.js';
import { checkAuthHeader } from '../../../utils/auth';

export async function GET(request) {
  try {
    // Remove authentication check for now
    // if (!checkAuthHeader(request)) {
    //   return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const csvFile = 'training_data.csv';
    
    const fileExists = await fileExistsInStorage(STORAGE_BUCKETS.CSV_DATA, csvFile);
    
    if (!fileExists) {
      return Response.json({
        exists: false,
        totalEntries: 0,
        entries: [],
        page: page,
        limit: limit,
        totalPages: 0,
        message: 'CSV file does not exist yet in Supabase storage'
      });
    }

    // Download and parse CSV content
    const downloadResult = await downloadFromStorage(STORAGE_BUCKETS.CSV_DATA, csvFile);
    
    if (!downloadResult.success) {
      throw new Error(`Failed to download CSV file: ${downloadResult.error}`);
    }
    
    const content = downloadResult.data;
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    // Parse all entries
    const allEntries = [];
    
    lines.forEach((line, index) => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const text = parts[0].trim();
        const label = parts[1].trim();
        
        if (text && label) {
          allEntries.push({ 
            id: index + 1,
            text, 
            label,
            textPreview: text.length > 100 ? text.substring(0, 100) + '...' : text
          });
        }
      }
    });

    // Apply pagination
    const paginatedEntries = allEntries.slice(offset, offset + limit);
    const totalPages = Math.ceil(allEntries.length / limit);

    console.log(`CSV Data: Returning ${paginatedEntries.length} entries (page ${page}/${totalPages})`);

    return Response.json({
      exists: true,
      totalEntries: allEntries.length,
      entries: paginatedEntries,
      page: page,
      limit: limit,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });

  } catch (error) {
    console.error('Error fetching CSV data from Supabase:', error);
    return Response.json(
      { 
        error: 'Failed to fetch CSV data from Supabase storage',
        exists: false,
        totalEntries: 0,
        entries: [],
        page: 1,
        limit: 50,
        totalPages: 0
      }, 
      { status: 500 }
    );
  }
} 