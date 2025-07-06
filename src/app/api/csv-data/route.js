import { supabaseAdmin, createTrainingDataTable } from '../../../utils/supabase.js';

export async function GET(request) {
  try {

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log(`Fetching training data from database (page ${page}, limit ${limit})`);
    
    try {
      // Get total count first
      const { count, error: countError } = await supabaseAdmin
        .from('training_data')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }
      
      const totalEntries = count || 0;
      
      if (totalEntries === 0) {
        return Response.json({
          exists: false,
          totalEntries: 0,
          entries: [],
          page: page,
          limit: limit,
          totalPages: 0,
          message: 'No training data found in database'
        });
      }
      
      // Get paginated data
      const { data, error } = await supabaseAdmin
        .from('training_data')
        .select('id, text, label, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        throw error;
      }
      
      // Format entries for compatibility with existing frontend
      const formattedEntries = data.map(entry => ({
        id: entry.id,
        text: entry.text,
        label: entry.label,
        textPreview: entry.text.length > 100 ? entry.text.substring(0, 100) + '...' : entry.text,
        created_at: entry.created_at
      }));
      
      const totalPages = Math.ceil(totalEntries / limit);
      
      console.log(`Database Data: Returning ${formattedEntries.length} entries (page ${page}/${totalPages})`);
      
      return Response.json({
        exists: true,
        totalEntries: totalEntries,
        entries: formattedEntries,
        page: page,
        limit: limit,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
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
          throw new Error(`Failed to create table: ${createResult.error}`);
        }
        
        return Response.json({
          exists: true,
          totalEntries: 0,
          entries: [],
          page: page,
          limit: limit,
          totalPages: 0,
          message: 'Training data table created successfully (empty)'
        });
      } else {
        throw dbError;
      }
    }

  } catch (error) {
    console.error('Error fetching training data from database:', error);
    return Response.json(
      { 
        error: 'Failed to fetch training data from database',
        exists: false,
        totalEntries: 0,
        entries: [],
        page: 1,
        limit: 50,
        totalPages: 0
      }, 
      { status: 500 }
    );
  }
} 