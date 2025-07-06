import { supabaseAdmin } from '../../../utils/supabase.js';

export async function GET() {
  try {
    console.log('Fetching next available sentence from database...');
    
    try {
      // Get the next unused sentence (top to bottom order)
      const { data: sentences, error } = await supabaseAdmin
        .from('sentences')
        .select(`
          id,
          content,
          sentence_order,
          paragraph_id,
          paragraphs!inner(content)
        `)
        .eq('is_used', false)
        .order('paragraph_id', { ascending: true })
        .order('sentence_order', { ascending: true })
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      if (!sentences || sentences.length === 0) {
        console.log('No unused sentences available');
        return Response.json({
          success: false,
          message: 'No sentences available. Please submit more paragraphs in the Admin Panel.',
          sentence: '',
          totalAvailable: 0,
          remainingCount: 0
        });
      }
      
      const selectedSentence = sentences[0];
      console.log(`Selected sentence ID ${selectedSentence.id}: "${selectedSentence.content}"`);
      
      // DON'T mark as used yet - only return for labeling
      console.log(`📋 Sentence ready for labeling (not marked as used yet)`);
      
      // Get count of remaining unused sentences
      const { count: remainingCount, error: countError } = await supabaseAdmin
        .from('sentences')
        .select('*', { count: 'exact', head: true })
        .eq('is_used', false);
      
      if (countError) {
        console.warn('Could not get remaining sentence count:', countError);
      }
      
      console.log(`✅ Returned sentence: "${selectedSentence.content}"`);
      console.log(`📊 Total unused sentences: ${remainingCount || 0}`);
      
      return Response.json({
        success: true,
        sentence: selectedSentence.content,
        totalAvailable: remainingCount || 0,
        remainingCount: remainingCount || 0,
        sentenceId: selectedSentence.id,
        paragraphId: selectedSentence.paragraph_id
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If tables don't exist, provide setup instructions
      if (dbError.message.includes('relation "sentences" does not exist') || 
          dbError.message.includes('table "sentences" does not exist') ||
          dbError.message.includes('relation "paragraphs" does not exist') || 
          dbError.message.includes('table "paragraphs" does not exist')) {
        console.log('Required tables do not exist');
        
        return Response.json({
          success: false,
          message: 'Database tables not found. Please create the required tables first.',
          sentence: '',
          totalAvailable: 0,
          error: 'Database tables not found',
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
        });
      } else {
        throw dbError;
      }
    }
    
  } catch (error) {
    console.error('Error fetching sentence:', error);
    
    return Response.json({
      success: false,
      message: 'Error occurred while fetching sentence from database.',
      sentence: '',
      totalAvailable: 0,
      error: error.message
    });
  }
} 