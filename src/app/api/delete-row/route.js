import { supabaseAdmin } from '../../../utils/supabase.js';

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return Response.json({ error: 'Row ID is required' }, { status: 400 });
    }

    console.log(`Deleting training data row with ID: ${id}`);
    
    const { error } = await supabaseAdmin
      .from('training_data')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting row:', error);
      throw error;
    }
    
    return Response.json({
      success: true,
      message: 'Row deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting row:', error);
    return Response.json(
      { error: 'Failed to delete row' }, 
      { status: 500 }
    );
  }
} 