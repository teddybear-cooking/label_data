import { 
  STORAGE_BUCKETS, 
  supabaseAdmin,
  updateFileInStorage, 
  fileExistsInStorage,
  downloadFromStorage 
} from '../../../utils/supabase.js';
import { checkAuthHeader } from '../../../utils/auth';

export async function POST(request) {
  try {
    // Remove authentication check for now
    // if (!checkAuthHeader(request)) {
    //   return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const csvFile = 'training_data.csv';
    
    console.log('=== STARTING CSV CLEAR OPERATION ===');
    console.log('Target file:', csvFile);
    console.log('Target bucket:', STORAGE_BUCKETS.CSV_DATA);
    
    // First, check if file exists
    const fileExists = await fileExistsInStorage(STORAGE_BUCKETS.CSV_DATA, csvFile);
    console.log('File exists before clearing:', fileExists);
    
    if (!fileExists) {
      console.log('File does not exist, nothing to clear');
      return Response.json({ 
        success: true, 
        message: 'CSV file does not exist - nothing to clear',
        storage: 'supabase'
      });
    }
    
    // Try to remove the file completely first
    try {
      console.log('Attempting to remove file completely...');
      const { data: removeData, error: removeError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.CSV_DATA)
        .remove([csvFile]);
        
      if (removeError) {
        console.error('Error removing file:', removeError);
        throw removeError;
      }
      
      console.log('File removed successfully:', removeData);
    } catch (removeError) {
      console.error('Failed to remove file:', removeError);
      // Continue to try alternative method
    }
    
    // Create an empty file to ensure it exists but is empty
    console.log('Creating empty file...');
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.CSV_DATA)
      .upload(csvFile, '', {
        contentType: 'text/plain',
        upsert: true // This will overwrite if file exists
      });
      
    if (uploadError) {
      console.error('Error creating empty file:', uploadError);
      throw uploadError;
    }
    
    console.log('Empty file created successfully:', uploadData);
    
    // Verify the file is actually empty
    const verifyResult = await downloadFromStorage(STORAGE_BUCKETS.CSV_DATA, csvFile);
    if (verifyResult.success) {
      console.log('Verification - file content length:', verifyResult.data.length);
      console.log('Verification - file content:', JSON.stringify(verifyResult.data));
    }
    
    console.log('=== CSV CLEAR OPERATION COMPLETED ===');
    
    return Response.json({ 
      success: true, 
      message: 'CSV file cleared successfully in Supabase storage',
      storage: 'supabase',
      fileExists: await fileExistsInStorage(STORAGE_BUCKETS.CSV_DATA, csvFile),
      isEmpty: verifyResult.success && verifyResult.data.length === 0
    });
  } catch (error) {
    console.error('Error clearing CSV file from Supabase:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to clear CSV file from Supabase storage',
      storage: 'supabase',
      details: error.message
    }, { status: 500 });
  }
} 