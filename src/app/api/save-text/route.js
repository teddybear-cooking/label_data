import { 
  STORAGE_BUCKETS, 
  downloadFromStorage, 
  uploadToStorage, 
  fileExistsInStorage 
} from '../../../utils/supabase.js';

export async function POST(request) {
  try {

    const { text } = await request.json();
    
    // Debug: Log received text
    console.log('Received text length:', text?.length || 0);
    console.log('Received text preview:', text?.substring(0, 100) + (text?.length > 100 ? '...' : ''));
    
    if (!text || text.trim() === '') {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    // Use a single filename
    const filename = 'saved_texts.txt';
    
    console.log('Saving to Supabase storage bucket:', STORAGE_BUCKETS.TEXT_FILES);
    
    // Check if file exists in Supabase storage and get existing content
    const fileExists = await fileExistsInStorage(STORAGE_BUCKETS.TEXT_FILES, filename);
    let existingContent = '';
    
    if (fileExists) {
      const downloadResult = await downloadFromStorage(STORAGE_BUCKETS.TEXT_FILES, filename);
      if (downloadResult.success) {
        existingContent = downloadResult.data;
      } else {
        console.warn('Failed to download existing text file:', downloadResult.error);
      }
    }
    
    // Save raw paragraphs with simple newline separation
    const separator = existingContent ? '\n\n' : '';
    const textToAppend = `${separator}${text.trim()}`;
    const newContent = existingContent + textToAppend;
    
    // Upload updated content to Supabase storage
    const uploadResult = await uploadToStorage(STORAGE_BUCKETS.TEXT_FILES, filename, newContent);
    
    if (!uploadResult.success) {
      throw new Error(`Failed to upload to Supabase storage: ${uploadResult.error}`);
    }
    
    console.log(`Text appended to Supabase storage: ${filename}`);
    console.log('Appended text length:', textToAppend.length);
    
    return Response.json({
      success: true,
      filename: filename,
      storage: 'supabase',
      bucket: STORAGE_BUCKETS.TEXT_FILES,
      wordCount: text.trim().split(/\s+/).filter(word => word.length > 0).length,
      charCount: text.length
    });
    
  } catch (error) {
    console.error('Error saving text:', error);
    return Response.json(
      { error: 'Failed to save text file' }, 
      { status: 500 }
    );
  }
} 