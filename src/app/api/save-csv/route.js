import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function POST(request) {
  try {
    console.log('=== CSV SAVE REQUEST STARTED ===');
    const { text, label } = await request.json();
    
    console.log('Received data:', { text: text?.substring(0, 50) + '...', label });
    
    if (!text || text.trim() === '') {
      console.error('ERROR: Text is empty or missing');
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }
    
    if (!label || label.trim() === '') {
      console.error('ERROR: Label is empty or missing');
      return Response.json({ error: 'Label is required' }, { status: 400 });
    }

    // Use a single CSV filename
    const filename = 'training_data.csv';
    
    // Create saved-texts directory if it doesn't exist
    const saveDir = join(process.cwd(), 'public', 'saved-texts');
    if (!existsSync(saveDir)) {
      console.log('Creating directory:', saveDir);
      mkdirSync(saveDir, { recursive: true });
    }
    
    // Full file path
    const filePath = join(saveDir, filename);
    console.log('File path:', filePath);
    
    // Clean the text (remove tabs and newlines for CSV format)
    const cleanText = text.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
    const cleanLabel = label.trim();
    
    // Create CSV row (tab-separated)
    const csvRow = `${cleanText}\t${cleanLabel}\n`;
    console.log('CSV row to append:', JSON.stringify(csvRow));
    
    try {
      // Append to the existing file with error handling
      appendFileSync(filePath, csvRow, 'utf8');
      console.log('✅ Successfully appended to file');
    } catch (fileError) {
      console.error('File write error:', fileError);
      throw new Error(`Failed to write to file: ${fileError.message}`);
    }
    
    // Verify the write was successful by checking if file exists
    if (!existsSync(filePath)) {
      throw new Error('File was not created successfully');
    }
    
    console.log(`✅ Data confirmed saved to CSV: ${filename}`);
    console.log(`✅ Text: "${cleanText}" | Label: "${cleanLabel}"`);
    console.log('=== CSV SAVE REQUEST COMPLETED ===');
    
    return Response.json({
      success: true,
      text: cleanText,
      label: cleanLabel,
      timestamp: new Date().toISOString(),
      fileExists: existsSync(filePath)
    });
    
  } catch (error) {
    console.error('Error saving to CSV:', error);
    return Response.json(
      { error: 'Failed to save to CSV file' }, 
      { status: 500 }
    );
  }
} 