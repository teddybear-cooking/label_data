import { supabaseAdmin, createTrainingDataTable } from '../../../utils/supabase.js';

export async function POST(request) {
  try {
    console.log('=== CSV SAVE REQUEST STARTED ===');
    const { text, label, sentenceId } = await request.json();
    
    console.log('Received data:', { text: text?.substring(0, 50) + '...', label, sentenceId });
    
    if (!text || text.trim() === '') {
      console.error('ERROR: Text is empty or missing');
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }
    
    if (!label || label.trim() === '') {
      console.error('ERROR: Label is empty or missing');
      return Response.json({ error: 'Label is required' }, { status: 400 });
    }

    // Clean the text (remove excessive whitespace)
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const cleanLabel = label.trim();
    
    console.log('Inserting row into database table...');
    
    try {
      // Insert directly into Supabase table - much more efficient than CSV file operations
      const { data, error } = await supabaseAdmin
        .from('training_data')
        .insert([
          {
            text: cleanText,
            label: cleanLabel,
            created_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (error) {
        console.error('Database insert error:', error);
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
      console.log('✅ Successfully inserted row into database');
      console.log('✅ Inserted data:', data);
      
      // If this was a sentence from the sentences table, mark it as used
      if (sentenceId) {
        console.log(`Marking sentence ${sentenceId} as used...`);
        
        const { error: updateError } = await supabaseAdmin
          .from('sentences')
          .update({ is_used: true })
          .eq('id', sentenceId);
        
        if (updateError) {
          console.error('Error marking sentence as used:', updateError);
          // Don't fail the whole operation - the training data was saved successfully
        } else {
          console.log(`✅ Marked sentence ${sentenceId} as used`);
        }
      }
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If table doesn't exist, create it and try again
      if (dbError.message.includes('relation "training_data" does not exist') || 
          dbError.message.includes('table "training_data" does not exist')) {
        console.log('Creating training_data table...');
        
        const createResult = await createTrainingDataTable();
        
        if (!createResult.success) {
          console.error('Failed to create table:', createResult.error);
          return Response.json({
            success: false,
            error: 'Database table not found',
            message: 'Please create the training_data table in your Supabase SQL editor first',
            sql: createResult.sql
          }, { status: 400 });
        }
        
        // Try insert again after creating table
        const { data, error: retryError } = await supabaseAdmin
          .from('training_data')
          .insert([
            {
              text: cleanText,
              label: cleanLabel,
              created_at: new Date().toISOString()
            }
          ])
          .select();
        
        if (retryError) {
          throw new Error(`Retry insert failed: ${retryError.message}`);
        }
        
        console.log('✅ Successfully inserted row into newly created table');
        
        // Mark sentence as used after successful retry
        if (sentenceId) {
          console.log(`Marking sentence ${sentenceId} as used after retry...`);
          
          const { error: updateError } = await supabaseAdmin
            .from('sentences')
            .update({ is_used: true })
            .eq('id', sentenceId);
          
          if (updateError) {
            console.error('Error marking sentence as used after retry:', updateError);
          } else {
            console.log(`✅ Marked sentence ${sentenceId} as used after retry`);
          }
        }
      } else {
        throw dbError;
      }
    }
    
    console.log(`✅ Data saved to database table`);
    console.log(`✅ Text: "${cleanText}" | Label: "${cleanLabel}"`);
    console.log('=== CSV SAVE REQUEST COMPLETED ===');
    
    return Response.json({
      success: true,
      text: cleanText,
      label: cleanLabel,
      timestamp: new Date().toISOString(),
      fileExists: true, // Keep for compatibility
      storage: 'database',
      sentenceMarkedAsUsed: !!sentenceId
    });
    
  } catch (error) {
    console.error('Error saving to database:', error);
    return Response.json(
      { error: 'Failed to save to database' }, 
      { status: 500 }
    );
  }
} 