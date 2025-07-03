import { 
  STORAGE_BUCKETS, 
  downloadFromStorage, 
  uploadToStorage, 
  fileExistsInStorage 
} from '../../../utils/supabase.js';

export async function POST(request) {
  try {
    console.log('=== CSV SAVE REQUEST STARTED ===');
    const { text, label } = await request.json();
    
    console.log('Received data:', { text: text?.substring(0, 50) + '...', label });
    
    if (!text || text.trim() === '') {
      console.error('ERROR: Text is empty or missing');
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }
    
    if (!label || label.trim() === '') {
      console.error('ERROR: Label is empty or missing');
      return Response.json({ error: 'Label is required' }, { status: 400 });
    }

    // Use a single CSV filename
    const filename = 'training_data.csv';
    
    console.log('Saving to Supabase storage bucket:', STORAGE_BUCKETS.CSV_DATA);
    
    // Clean the text (remove tabs and newlines for CSV format)
    const cleanText = text.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
    const cleanLabel = label.trim();
    
    // Create CSV row (tab-separated)
    const csvRow = `${cleanText}\t${cleanLabel}\n`;
    console.log('CSV row to append:', JSON.stringify(csvRow));
    
    try {
      // Check if file exists in Supabase storage
      const fileExists = await fileExistsInStorage(STORAGE_BUCKETS.CSV_DATA, filename);
      let existingContent = '';
      
      if (fileExists) {
        // Download existing content
        const downloadResult = await downloadFromStorage(STORAGE_BUCKETS.CSV_DATA, filename);
        if (downloadResult.success) {
          existingContent = downloadResult.data;
          console.log('Downloaded existing CSV content');
        } else {
          console.warn('Failed to download existing CSV content:', downloadResult.error);
        }
      }
      
      // Append new row to existing content
      const newContent = existingContent + csvRow;
      
      // Upload updated content to Supabase storage
      const uploadResult = await uploadToStorage(STORAGE_BUCKETS.CSV_DATA, filename, newContent);
      
      if (!uploadResult.success) {
        throw new Error(`Failed to upload to Supabase storage: ${uploadResult.error}`);
      }
      
      console.log('✅ Successfully saved to Supabase storage');
    } catch (storageError) {
      console.error('Storage error:', storageError);
      throw new Error(`Failed to save to storage: ${storageError.message}`);
    }
    
    // Verify the upload was successful
    const verifyExists = await fileExistsInStorage(STORAGE_BUCKETS.CSV_DATA, filename);
    
    console.log(`✅ Data confirmed saved to CSV in Supabase: ${filename}`);
    console.log(`✅ Text: "${cleanText}" | Label: "${cleanLabel}"`);
    console.log('=== CSV SAVE REQUEST COMPLETED ===');
    
    return Response.json({
      success: true,
      text: cleanText,
      label: cleanLabel,
      timestamp: new Date().toISOString(),
      fileExists: verifyExists,
      storage: 'supabase'
    });
    
  } catch (error) {
    console.error('Error saving to CSV:', error);
    return Response.json(
      { error: 'Failed to save to CSV file' }, 
      { status: 500 }
    );
  }
} 