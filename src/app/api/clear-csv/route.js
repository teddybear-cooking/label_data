import { writeFile } from 'fs/promises';
import { join } from 'path';
import { checkAuthHeader } from '../../../utils/auth';

export async function POST(request) {
  try {
    // Check authentication
    if (!checkAuthHeader(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const csvPath = join(process.cwd(), 'public', 'saved-texts', 'training_data.csv');
    
    // Write just the header row to clear the file
    await writeFile(csvPath, 'text\tlabel\n', 'utf8');
    
    return Response.json({ 
      success: true, 
      message: 'CSV file cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing CSV file:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to clear CSV file' 
    }, { status: 500 });
  }
} 