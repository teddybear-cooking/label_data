import { supabaseAdmin, createTrainingDataTable } from '../../../utils/supabase.js';

export async function GET(request) {
  try {

    console.log('Generating CSV from database table...');
    
    try {
      // Get all data from database table
      const { data, error } = await supabaseAdmin
        .from('training_data')
        .select('text, label, created_at')
        .order('created_at', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return Response.json(
          { error: 'No training data found in database' }, 
          { status: 404 }
        );
      }
      
      // Generate CSV content
      const csvHeader = 'text\tlabel\tcreated_at\n';
      const csvRows = data.map(entry => {
        // Clean text for CSV format (remove tabs and newlines)
        const cleanText = entry.text.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
        const cleanLabel = entry.label.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
        const timestamp = entry.created_at || new Date().toISOString();
        
        return `${cleanText}\t${cleanLabel}\t${timestamp}`;
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      console.log(`✅ Generated CSV with ${data.length} entries`);
      
      // Return the CSV content with appropriate headers
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="training_data.csv"',
          'Cache-Control': 'no-cache'
        }
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If table doesn't exist, create it and return empty CSV
      if (dbError.message.includes('relation "training_data" does not exist') || 
          dbError.message.includes('table "training_data" does not exist')) {
        console.log('Training data table does not exist, creating it...');
        
        const createResult = await createTrainingDataTable();
        
        if (!createResult.success) {
          console.error('Failed to create table:', createResult.error);
          throw new Error(`Failed to create table: ${createResult.error}`);
        }
        
        // Return empty CSV with header
        const emptyCSV = 'text\tlabel\tcreated_at\n';
        return new Response(emptyCSV, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="training_data.csv"',
            'Cache-Control': 'no-cache'
          }
        });
      } else {
        throw dbError;
      }
    }
    
  } catch (error) {
    console.error('Error generating CSV file:', error);
    return Response.json(
      { error: 'Failed to generate CSV file' }, 
      { status: 500 }
    );
  }
} 