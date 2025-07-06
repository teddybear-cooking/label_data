import { supabaseAdmin, createTrainingDataTable } from '../../../utils/supabase.js';

export async function GET() {
  try {
    console.log('Checking training data table...');
    
    try {
      // Get basic info about the table
      const { data, error, count } = await supabaseAdmin
        .from('training_data')
        .select('text, label, created_at', { count: 'exact' })
        .limit(5);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return Response.json({
          exists: true,
          totalEntries: 0,
          fileSize: 0,
          lastEntries: [],
          firstEntries: [],
          message: 'Training data table exists but is empty',
          storage: 'database',
          table: 'training_data'
        });
      }
      
      // Get the last 5 entries
      const { data: lastEntries, error: lastError } = await supabaseAdmin
        .from('training_data')
        .select('text, label, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (lastError) {
        console.warn('Could not fetch last entries:', lastError);
      }
      
      // Calculate approximate file size
      let totalSize = 0;
      data.forEach(entry => {
        totalSize += entry.text.length + entry.label.length + 2; // +2 for tab and newline
      });
      
      // Format entries for display
      const formattedFirst = data.slice(0, 3).map(entry => 
        `${entry.text}\t${entry.label}`
      );
      
      const formattedLast = (lastEntries || []).slice(0, 5).map(entry => 
        `${entry.text}\t${entry.label}`
      );
      
      console.log(`Table check: ${count} total entries`);
      
      return Response.json({
        exists: true,
        totalEntries: count,
        fileSize: totalSize * (count / data.length), // Estimate total size
        lastEntries: formattedLast,
        firstEntries: formattedFirst,
        storage: 'database',
        table: 'training_data'
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If table doesn't exist, create it
      if (dbError.message.includes('relation "training_data" does not exist') || 
          dbError.message.includes('table "training_data" does not exist')) {
        console.log('Training data table does not exist, creating it...');
        
        const createResult = await createTrainingDataTable();
        
        if (!createResult.success) {
          console.error('Failed to create table:', createResult.error);
          throw new Error(`Failed to create table: ${createResult.error}`);
        }
        
        return Response.json({
          exists: true,
          totalEntries: 0,
          fileSize: 0,
          lastEntries: [],
          firstEntries: [],
          message: 'Training data table created successfully (empty)',
          storage: 'database',
          table: 'training_data'
        });
      } else {
        throw dbError;
      }
    }
    
  } catch (error) {
    console.error('Error checking training data table:', error);
    return Response.json(
      { error: 'Failed to check training data table' }, 
      { status: 500 }
    );
  }
} 