import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// No sample sentences - only use content from saved_texts.txt

export async function GET() {
  try {
    // First try to read from saved_texts.txt (admin submissions)
    const sentencesFile = join(process.cwd(), 'public', 'saved-texts', 'saved_texts.txt');
    let sentences = [];
    let originalEntries = [];
    let sentenceTracking = [];
    let isFromFile = false;
    
    if (existsSync(sentencesFile)) {
      const content = readFileSync(sentencesFile, 'utf8');
      
      // Parse the admin file format which has timestamps and separators
      // Format: [timestamp]\ntext\n\n---\n\n[timestamp]\ntext...
      const rawEntries = content.split('\n\n---\n\n');
      originalEntries = rawEntries
        .map(entry => {
          const lines = entry.split('\n');
          const timestamp = lines[0]; // Keep original timestamp
          const text = lines.slice(1).join('\n').trim();
          return { timestamp, text };
        })
        .filter(entry => entry.text !== ''); // Remove empty entries
      
      // Split each paragraph into individual sentences based on periods
      originalEntries.forEach((entry, entryIndex) => {
        // Split by period and clean up sentences
        const splitSentences = entry.text
          .split('.')
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 0)
          .map(sentence => sentence + '.'); // Add period back
        
        // Add source tracking to each sentence
        splitSentences.forEach(sentence => {
          sentenceTracking.push({
            sentence: sentence,
            sourceEntryIndex: entryIndex,
            originalTimestamp: entry.timestamp
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
      const sourceEntry = originalEntries[selectedSentenceInfo.sourceEntryIndex];
      if (sourceEntry) {
        // Split the paragraph into sentences
        let paragraphSentences = sourceEntry.text
          .split('.')
          .map(sentence => sentence.trim())
          .filter(sentence => sentence.length > 0)
          .map(sentence => sentence + '.');
        
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
      
      // Check if the source entry became empty and count how many entries before it are empty
      let removedEntriesBeforeSource = 0;
      const originalEntriesBeforeFilter = [...originalEntries];
      
      // Remove empty entries and count removed entries
      originalEntries = originalEntries.filter((entry, index) => {
        const isEmpty = entry.text.trim() === '';
        if (isEmpty && index <= selectedSentenceInfo.sourceEntryIndex) {
          removedEntriesBeforeSource++;
        }
        return !isEmpty;
      });
      
      // Update sentence tracking - remove the selected sentence
      sentenceTracking.splice(randomIndex, 1);
      
      // Update all sourceEntryIndex values to account for removed entries
      sentenceTracking.forEach(item => {
        let newIndex = item.sourceEntryIndex;
        // Count how many entries before this one were removed
        let removedBefore = 0;
        for (let i = 0; i < item.sourceEntryIndex; i++) {
          if (originalEntriesBeforeFilter[i]?.text.trim() === '') {
            removedBefore++;
          }
        }
        item.sourceEntryIndex = newIndex - removedBefore;
      });
    }
    
    sentences.splice(randomIndex, 1);
    
    // Write the remaining sentences back to the file (only if originally from file)
    if (isFromFile) {
      try {
        if (originalEntries.length > 0) {
          // Rebuild the file in the proper admin format with original timestamps
          const rebuiltContent = originalEntries
            .map((entry, index) => {
              return index === 0 ? `${entry.timestamp}\n${entry.text}` : `\n\n---\n\n${entry.timestamp}\n${entry.text}`;
            })
            .join('');
          
          writeFileSync(sentencesFile, rebuiltContent, 'utf8');
          console.log(`Removed sentence from saved_texts.txt. ${originalEntries.length} paragraphs remaining, ${sentences.length} individual sentences remaining.`);
        } else {
          writeFileSync(sentencesFile, '', 'utf8');
          console.log('All individual sentences from saved_texts.txt have been used. File is now empty.');
        }
      } catch (writeError) {
        console.error('Error updating saved_texts.txt:', writeError);
        // Continue execution - don't fail the request if file update fails
      }
    }
    
    console.log(`Selected sentence: "${selectedSentence}"`);
    if (selectedSentenceInfo) {
      console.log(`Removed sentence from paragraph ${selectedSentenceInfo.sourceEntryIndex}`);
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