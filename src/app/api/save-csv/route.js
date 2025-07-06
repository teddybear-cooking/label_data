import { supabaseAdmin, createTrainingDataTable } from '../../../utils/supabase.js';

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
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If table doesn't exist, create it and try again
      if (dbError.message.includes('relation "training_data" does not exist') || 
          dbError.message.includes('table "training_data" does not exist')) {
        console.log('Creating training_data table...');
        
        const createResult = await createTrainingDataTable();
        
        if (!createResult.success) {
          console.error('Failed to create table:', createResult.error);
          throw new Error(`Failed to create table: ${createResult.error}`);
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
      storage: 'database'
    });
    
  } catch (error) {
    console.error('Error saving to database:', error);
    return Response.json(
      { error: 'Failed to save to database' }, 
      { status: 500 }
    );
  }
} 