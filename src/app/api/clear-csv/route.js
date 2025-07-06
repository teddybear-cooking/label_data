import { supabaseAdmin, createTrainingDataTable } from '../../../utils/supabase.js';

export async function POST(request) {
  try {
    console.log('=== STARTING DATABASE CLEAR OPERATION ===');
    
    try {
      // Delete all records from the training_data table
      const { data, error } = await supabaseAdmin
        .from('training_data')
        .delete()
        .neq('id', 0); // Delete all records (neq 0 means all records)
      
      if (error) {
        throw error;
      }
      
      console.log('All training data cleared successfully');
      
      // Get count to verify it's empty
      const { count, error: countError } = await supabaseAdmin
        .from('training_data')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.warn('Could not verify clear operation:', countError);
      }
      
      console.log('=== DATABASE CLEAR OPERATION COMPLETED ===');
      
      return Response.json({ 
        success: true, 
        message: 'Training data cleared successfully from database',
        storage: 'database',
        remainingRecords: count || 0
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
          success: true, 
          message: 'Training data table created (already empty)',
          storage: 'database',
          remainingRecords: 0
        });
      } else {
        throw dbError;
      }
    }
    
  } catch (error) {
    console.error('Error clearing training data from database:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to clear training data from database',
      storage: 'database',
      details: error.message
    }, { status: 500 });
  }
} 