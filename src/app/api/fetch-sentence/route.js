import { 
  STORAGE_BUCKETS, 
  downloadFromStorage, 
  updateFileInStorage, 
  fileExistsInStorage 
} from '../../../utils/supabase.js';

// Read sentences from txt file top to bottom, first in last out

export async function GET() {
  try {
    // Read from saved_texts.txt in Supabase storage
    const sentencesFile = 'saved_texts.txt';
    let sentences = [];
    let isFromFile = false;
    
    const fileExists = await fileExistsInStorage(STORAGE_BUCKETS.TEXT_FILES, sentencesFile);
    if (fileExists) {
      const downloadResult = await downloadFromStorage(STORAGE_BUCKETS.TEXT_FILES, sentencesFile);
      
      if (!downloadResult.success) {
        console.error('Failed to download sentences file from Supabase:', downloadResult.error);
        throw new Error(`Failed to download file: ${downloadResult.error}`);
      }
      
      const content = downloadResult.data;
      
      // Split content into lines and filter out empty lines
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      // Each line is treated as a sentence
      sentences = lines.map(line => line.trim());
      isFromFile = sentences.length > 0;
      
      console.log(`Loaded ${sentences.length} sentences from ${sentencesFile}`);
    }
    
    // If no sentences in file, return empty response
    if (sentences.length === 0) {
      console.log('No sentences available in saved_texts.txt');
      return Response.json({
        success: false,
        message: 'No sentences available.',
        sentence: '',
        totalAvailable: 0,
        isFromFile: false,
        remainingInFile: 0
      });
    }
    
    // Take the FIRST sentence (top of file) - FILO approach
    const selectedSentence = sentences[0];
    
    // Remove the first sentence from the array
    sentences.shift();
    
    // Write the remaining sentences back to the file
    if (isFromFile) {
      try {
        if (sentences.length > 0) {
          // Join remaining sentences with newlines
          const remainingContent = sentences.join('\n');
          
          const updateResult = await updateFileInStorage(STORAGE_BUCKETS.TEXT_FILES, sentencesFile, remainingContent);
          
          if (updateResult.success) {
            console.log(`Removed first sentence from saved_texts.txt. ${sentences.length} sentences remaining.`);
          } else {
            throw new Error(updateResult.error);
          }
        } else {
          // No sentences left, empty the file
          const updateResult = await updateFileInStorage(STORAGE_BUCKETS.TEXT_FILES, sentencesFile, '');
          
          if (updateResult.success) {
            console.log('All sentences from saved_texts.txt have been used. File is now empty.');
          } else {
            throw new Error(updateResult.error);
          }
        }
      } catch (writeError) {
        console.error('Error updating saved_texts.txt in Supabase:', writeError);
        // Continue execution - don't fail the request if file update fails
      }
    }
    
    console.log(`Selected sentence (first from file): "${selectedSentence}"`);
    console.log(`Remaining sentences: ${sentences.length}`);
    
    return Response.json({
      success: true,
      sentence: selectedSentence,
      totalAvailable: sentences.length,
      isFromFile: isFromFile,
      remainingInFile: sentences.length
    });
    
  } catch (error) {
    console.error('Error fetching sentence:', error);
    
    return Response.json({
      success: false,
      message: 'Error occurred while fetching sentence from file.',
      sentence: '',
      totalAvailable: 0,
      isFromFile: false,
      error: error.message
    });
  }
} 