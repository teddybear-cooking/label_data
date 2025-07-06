import { supabaseAdmin } from '../../../utils/supabase.js';

export async function POST(request) {
  try {
    const { text } = await request.json();
    
    console.log('Received paragraph text length:', text?.length || 0);
    console.log('Received paragraph preview:', text?.substring(0, 100) + (text?.length > 100 ? '...' : ''));
    
    if (!text || text.trim() === '') {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    // Clean and normalize the text
    const cleanText = text.trim();
    
    console.log('Saving paragraph to database...');
    
    try {
      // Insert paragraph into paragraphs table
      const { data, error } = await supabaseAdmin
        .from('paragraphs')
        .insert([
          {
            content: cleanText,
            created_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      console.log('✅ Successfully inserted paragraph into database');
      console.log('✅ Inserted data:', data);
      
      // Extract sentences from the paragraph and store them
      const sentences = extractSentencesFromText(cleanText);
      console.log(`Extracted ${sentences.length} sentences from paragraph`);
      
      if (sentences.length > 0) {
        const paragraphId = data[0].id;
        
        // Insert sentences into sentences table
        const sentenceInserts = sentences.map((sentence, index) => ({
          paragraph_id: paragraphId,
          content: sentence,
          sentence_order: index + 1,
          is_used: false,
          created_at: new Date().toISOString()
        }));
        
        const { data: sentenceData, error: sentenceError } = await supabaseAdmin
          .from('sentences')
          .insert(sentenceInserts)
          .select();
        
        if (sentenceError) {
          console.error('Sentence insert error:', sentenceError);
          // Don't fail the whole operation if sentence extraction fails
        } else {
          console.log(`✅ Successfully inserted ${sentenceData.length} sentences`);
        }
      }
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If tables don't exist, create them
      if (dbError.message.includes('relation "paragraphs" does not exist') || 
          dbError.message.includes('table "paragraphs" does not exist')) {
        console.log('Paragraphs table does not exist, needs to be created...');
        
        return Response.json({
          success: false,
          error: 'Database tables not found',
          message: 'Please create the required tables in your Supabase SQL editor',
          sql: `
            -- Create paragraphs table
            CREATE TABLE paragraphs (
              id SERIAL PRIMARY KEY,
              content TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Create sentences table
            CREATE TABLE sentences (
              id SERIAL PRIMARY KEY,
              paragraph_id INTEGER REFERENCES paragraphs(id) ON DELETE CASCADE,
              content TEXT NOT NULL,
              sentence_order INTEGER NOT NULL,
              is_used BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Create indexes
            CREATE INDEX idx_paragraphs_created_at ON paragraphs(created_at);
            CREATE INDEX idx_sentences_paragraph_id ON sentences(paragraph_id);
            CREATE INDEX idx_sentences_is_used ON sentences(is_used);
            CREATE INDEX idx_sentences_order ON sentences(sentence_order);
          `
        }, { status: 400 });
      } else {
        throw dbError;
      }
    }
    
    console.log(`✅ Paragraph saved to database`);
    console.log(`✅ Text: "${cleanText.substring(0, 100)}..."`);
    
    return Response.json({
      success: true,
      filename: 'database',
      storage: 'database',
      table: 'paragraphs',
      wordCount: cleanText.split(/\s+/).filter(word => word.length > 0).length,
      charCount: cleanText.length
    });
    
  } catch (error) {
    console.error('Error saving paragraph:', error);
    return Response.json(
      { error: 'Failed to save paragraph to database' }, 
      { status: 500 }
    );
  }
}

// Helper function to extract sentences from text
function extractSentencesFromText(text) {
  // Split by sentence endings (., !, ?) and clean up sentences
  const sentences = text
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
    })
    .filter(sentence => sentence.length > 12); // Final filter for quality
    
  return sentences;
} 