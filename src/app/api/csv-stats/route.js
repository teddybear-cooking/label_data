import { supabaseAdmin, createTrainingDataTable } from '../../../utils/supabase.js';

export async function GET(request) {
  try {
    console.log('Fetching training data statistics from database...');
    
    try {
      // Get total count and all data for analysis
      const { data, error, count } = await supabaseAdmin
        .from('training_data')
        .select('text, label, created_at', { count: 'exact' });
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return Response.json({
          exists: false,
          totalEntries: 0,
          fileSize: 0,
          labelCounts: {},
          sampleEntries: [],
          message: 'No training data found in database'
        });
      }
      
      // Calculate statistics
      const labelCounts = {};
      let totalTextLength = 0;
      
      data.forEach(entry => {
        // Count labels
        const label = entry.label;
        labelCounts[label] = (labelCounts[label] || 0) + 1;
        
        // Calculate approximate file size
        totalTextLength += entry.text.length + entry.label.length + 2; // +2 for tab and newline
      });
      
      // Get sample entries (first 5)
      const sampleEntries = data.slice(0, 5).map(entry => ({
        text: entry.text,
        label: entry.label
      }));
      
      console.log(`Database Stats: ${count} entries, ${Object.keys(labelCounts).length} unique labels`);
      
      return Response.json({
        exists: true,
        totalEntries: count,
        fileSize: totalTextLength, // Approximate size
        labelCounts: labelCounts,
        sampleEntries: sampleEntries,
        storage: 'database',
        table: 'training_data'
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If table doesn't exist, create it and return empty result
      if (dbError.message.includes('relation "training_data" does not exist') || 
          dbError.message.includes('table "training_data" does not exist')) {
        console.log('Training data table does not exist, creating it...');
        
        const createResult = await createTrainingDataTable();
        
        if (!createResult.success) {
          console.error('Failed to create table:', createResult.error);
          return Response.json({
            exists: false,
            totalEntries: 0,
            fileSize: 0,
            labelCounts: {},
            sampleEntries: [],
            error: 'Database table not found',
            message: 'Please create the training_data table in your Supabase SQL editor',
            sql: createResult.sql,
            storage: 'database'
          }, { status: 400 });
        }
        
        return Response.json({
          exists: true,
          totalEntries: 0,
          fileSize: 0,
          labelCounts: {},
          sampleEntries: [],
          message: 'Training data table created successfully (empty)',
          storage: 'database',
          table: 'training_data'
        });
      } else {
        throw dbError;
      }
    }
    
  } catch (error) {
    console.error('Error fetching training data statistics:', error);
    return Response.json({
      exists: false,
      totalEntries: 0,
      fileSize: 0,
      labelCounts: {},
      sampleEntries: [],
      error: 'Failed to fetch statistics from database',
      storage: 'database'
    }, { status: 500 });
  }
} 