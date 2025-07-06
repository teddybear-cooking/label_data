import { supabaseAdmin } from '../../../utils/supabase.js';

export async function POST(request) {
  try {
    const { sentenceId } = await request.json();
    
    console.log('Marking sentence as used:', sentenceId);
    
    if (!sentenceId) {
      return Response.json({ error: 'Sentence ID is required' }, { status: 400 });
    }
    
    // Mark this sentence as used
    const { error: updateError } = await supabaseAdmin
      .from('sentences')
      .update({ is_used: true })
      .eq('id', sentenceId);
    
    if (updateError) {
      console.error('Error marking sentence as used:', updateError);
      return Response.json({ error: 'Failed to mark sentence as used' }, { status: 500 });
    }
    
    console.log(`✅ Marked sentence ${sentenceId} as used`);
    
    return Response.json({
      success: true,
      sentenceId: sentenceId,
      message: 'Sentence marked as used'
    });
    
  } catch (error) {
    console.error('Error marking sentence as used:', error);
    return Response.json(
      { error: 'Failed to mark sentence as used' }, 
      { status: 500 }
    );
  }
} 