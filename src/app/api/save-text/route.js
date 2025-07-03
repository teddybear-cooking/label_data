import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { checkAuthHeader } from '../../../utils/auth';

export async function POST(request) {
  try {
    // Check authentication
    if (!checkAuthHeader(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, timestamp } = await request.json();
    
    // Debug: Log received text
    console.log('Received text length:', text?.length || 0);
    console.log('Received text preview:', text?.substring(0, 100) + (text?.length > 100 ? '...' : ''));
    
    if (!text || text.trim() === '') {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    // Use a single filename
    const filename = 'saved_texts.txt';
    
    // Create saved-texts directory if it doesn't exist
    const saveDir = join(process.cwd(), 'public', 'saved-texts');
    if (!existsSync(saveDir)) {
      mkdirSync(saveDir, { recursive: true });
    }
    
    // Full file path
    const filePath = join(saveDir, filename);
    
    // Create timestamp for the entry
    const date = new Date(timestamp || new Date());
    const dateStr = date.toLocaleString();
    
    // Prepare text with separator and timestamp
    const separator = existsSync(filePath) ? '\n\n---\n\n' : '';
    const textToAppend = `${separator}[${dateStr}]\n${text}`;
    
    // Append to the existing file
    appendFileSync(filePath, textToAppend, 'utf8');
    
    console.log(`Text appended to: ${filename}`);
    console.log('Appended text length:', textToAppend.length);
    
    return Response.json({
      success: true,
      filename: filename,
      path: `/saved-texts/${filename}`,
      timestamp: date.toISOString(),
      wordCount: text.trim().split(/\s+/).filter(word => word.length > 0).length,
      charCount: text.length
    });
    
  } catch (error) {
    console.error('Error saving text:', error);
    return Response.json(
      { error: 'Failed to save text file' }, 
      { status: 500 }
    );
  }
} 