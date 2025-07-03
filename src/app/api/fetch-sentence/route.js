import { 
  STORAGE_BUCKETS, 
  downloadFromStorage, 
  updateFileInStorage, 
  fileExistsInStorage 
} from '../../../utils/supabase.js';

// No sample sentences - only use content from saved_texts.txt

export async function GET() {
  try {
    // First try to read from saved_texts.txt (admin submissions) in Supabase storage
    const sentencesFile = 'saved_texts.txt';
    let sentences = [];
    let originalEntries = [];
    let sentenceTracking = [];
    let isFromFile = false;
    
    const fileExists = await fileExistsInStorage(STORAGE_BUCKETS.TEXT_FILES, sentencesFile);
    if (fileExists) {
      const downloadResult = await downloadFromStorage(STORAGE_BUCKETS.TEXT_FILES, sentencesFile);
      
      if (!downloadResult.success) {
        console.error('Failed to download sentences file from Supabase:', downloadResult.error);
        throw new Error(`Failed to download file: ${downloadResult.error}`);
      }
      
      const content = downloadResult.data;
      
      // Parse raw paragraphs separated by double newlines
      const rawParagraphs = content.split('\n\n').filter(paragraph => paragraph.trim() !== '');
      
      originalEntries = rawParagraphs.map((paragraph, index) => ({
        text: paragraph.trim(),
        paragraphIndex: index
      }));
      
      // Split each paragraph into individual sentences
      originalEntries.forEach((entry, entryIndex) => {
        // Split by sentence endings (., !, ?) and clean up sentences
        const splitSentences = entry.text
          .split(/[.!?]+/)
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 10) // Only keep sentences with meaningful length
          .map(sentence => {
            // Add appropriate punctuation back if missing
            const lastChar = sentence.slice(-1);
            if (!['.', '!', '?'].includes(lastChar)) {
              return sentence + '.';
            }
            return sentence;
          });
        
        // Add source tracking to each sentence
        splitSentences.forEach(sentence => {
          sentenceTracking.push({
            sentence: sentence,
            sourceParagraphIndex: entryIndex,
            originalText: entry.text
          });
        });
      });
      
      sentences = sentenceTracking.map(item => item.sentence);
      isFromFile = sentences.length > 0;
      console.log(`Loaded ${sentences.length} individual sentences from ${originalEntries.length} paragraphs`);
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
    
    // Pick a random sentence
    const randomIndex = Math.floor(Math.random() * sentences.length);
    const selectedSentence = sentences[randomIndex].trim();
    
    // Find which paragraph this sentence came from and remove it
    let selectedSentenceInfo = null;
    if (isFromFile && sentenceTracking.length > 0) {
      selectedSentenceInfo = sentenceTracking[randomIndex];
      
      // Remove the sentence from its source paragraph
      const sourceEntry = originalEntries[selectedSentenceInfo.sourceParagraphIndex];
      if (sourceEntry) {
        // Split the paragraph into sentences (same logic as above)
        let paragraphSentences = sourceEntry.text
          .split(/[.!?]+/)
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 10)
          .map(sentence => {
            const lastChar = sentence.slice(-1);
            if (!['.', '!', '?'].includes(lastChar)) {
              return sentence + '.';
            }
            return sentence;
          });
        
        // Remove the selected sentence
        paragraphSentences = paragraphSentences.filter(sentence => sentence !== selectedSentenceInfo.sentence);
        
        // Update the paragraph with remaining sentences
        if (paragraphSentences.length > 0) {
          sourceEntry.text = paragraphSentences.join(' ');
        } else {
          // Mark entry for removal if no sentences left
          sourceEntry.text = '';
        }
      }
      
      // Remove empty entries
      originalEntries = originalEntries.filter(entry => entry.text.trim() !== '');
      
      // Update sentence tracking - remove the selected sentence
      sentenceTracking.splice(randomIndex, 1);
      
      // Update paragraph indices in remaining sentence tracking
      sentenceTracking.forEach(item => {
        // Find the new index of the paragraph in the filtered array
        const newIndex = originalEntries.findIndex(entry => entry.text === item.originalText);
        if (newIndex !== -1) {
          item.sourceParagraphIndex = newIndex;
        }
      });
    }
    
    sentences.splice(randomIndex, 1);
    
    // Write the remaining sentences back to the file (only if originally from file)
    if (isFromFile) {
      try {
        if (originalEntries.length > 0) {
          // Rebuild the file with simple paragraph separation
          const rebuiltContent = originalEntries
            .map(entry => entry.text)
            .join('\n\n');
          
          const updateResult = await updateFileInStorage(STORAGE_BUCKETS.TEXT_FILES, sentencesFile, rebuiltContent);
          
          if (updateResult.success) {
            console.log(`Removed sentence from saved_texts.txt in Supabase. ${originalEntries.length} paragraphs remaining, ${sentences.length} individual sentences remaining.`);
          } else {
            throw new Error(updateResult.error);
          }
        } else {
          const updateResult = await updateFileInStorage(STORAGE_BUCKETS.TEXT_FILES, sentencesFile, '');
          
          if (updateResult.success) {
            console.log('All individual sentences from saved_texts.txt have been used. File is now empty in Supabase.');
          } else {
            throw new Error(updateResult.error);
          }
        }
      } catch (writeError) {
        console.error('Error updating saved_texts.txt in Supabase:', writeError);
        // Continue execution - don't fail the request if file update fails
      }
    }
    
    console.log(`Selected sentence: "${selectedSentence}"`);
    if (selectedSentenceInfo) {
      console.log(`Removed sentence from paragraph ${selectedSentenceInfo.sourceParagraphIndex}`);
      console.log(`Remaining paragraphs: ${originalEntries.length}`);
      console.log(`Remaining individual sentences: ${sentences.length}`);
    }
    
    return Response.json({
      success: true,
      sentence: selectedSentence,
      totalAvailable: sentences.length,
      isFromFile: isFromFile,
      remainingInFile: sentences.length,
      remainingParagraphs: isFromFile ? originalEntries.length : 0
    });
    
  } catch (error) {
    console.error('Error fetching sentence:', error);
    
    // Return error response - no fallback sentences
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