import { supabaseAdmin, createTrainingDataTable } from '../../../utils/supabase.js';

export async function POST(request) {
  try {
    console.log('=== STORAGE SETUP STARTED ===');
    
    // Check if training_data table exists
    const tableCheck = await createTrainingDataTable();
    
    if (!tableCheck.success) {
      console.log('❌ Database table setup needed');
      return Response.json({
        success: false,
        error: tableCheck.error,
        instructions: 'Please create the training_data table in your Supabase SQL editor',
        sql: tableCheck.sql,
        message: 'Database table needs to be created manually'
      }, { status: 400 });
    }
    
    console.log('✅ Database table is ready');
    
    // Test database connection
    const { data, error } = await supabaseAdmin
      .from('training_data')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Database connection test failed: ${error.message}`);
    }
    
    console.log('✅ Database connection successful');
    console.log('=== STORAGE SETUP COMPLETED ===');
    
    return Response.json({
      success: true,
      message: 'Database setup completed successfully',
      storage: 'database',
      table: 'training_data'
    });
    
  } catch (error) {
    console.error('Error setting up storage:', error);
    return Response.json({
      success: false,
      error: error.message,
      message: 'Storage setup failed'
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Check current setup status
    const tableCheck = await createTrainingDataTable();
    
    if (!tableCheck.success) {
      return Response.json({
        setupComplete: false,
        message: 'Database table needs to be created',
        instructions: 'Please create the training_data table in your Supabase SQL editor',
        sql: tableCheck.sql
      });
    }
    
    // Get table info
    const { count, error } = await supabaseAdmin
      .from('training_data')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    return Response.json({
      setupComplete: true,
      message: 'Database setup is complete',
      storage: 'database',
      table: 'training_data',
      totalRecords: count || 0
    });
    
  } catch (error) {
    console.error('Error checking setup status:', error);
    return Response.json({
      setupComplete: false,
      error: error.message,
      message: 'Failed to check setup status'
    }, { status: 500 });
  }
} 