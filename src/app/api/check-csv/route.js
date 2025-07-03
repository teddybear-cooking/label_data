import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const filename = 'training_data.csv';
    const saveDir = join(process.cwd(), 'public', 'saved-texts');
    const filePath = join(saveDir, filename);
    
    if (!existsSync(filePath)) {
      return Response.json({
        exists: false,
        message: 'CSV file does not exist yet',
        path: filePath
      });
    }
    
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    return Response.json({
      exists: true,
      filename: filename,
      path: `/saved-texts/${filename}`,
      totalEntries: lines.length,
      fileSize: content.length,
      lastEntries: lines.slice(-5), // Show last 5 entries
      firstEntries: lines.slice(0, 3) // Show first 3 entries
    });
    
  } catch (error) {
    console.error('Error checking CSV:', error);
    return Response.json(
      { error: 'Failed to check CSV file' }, 
      { status: 500 }
    );
  }
} 